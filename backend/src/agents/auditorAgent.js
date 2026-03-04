import { db } from '../db/database.js';
import { geminiService } from '../services/geminiService.js';

class AuditorAgent {
    constructor() {
        this.isRunning = false;
    }

    async getThresholds() {
        return {
            global: parseFloat(await db.getSetting('auditor_threshold') || '0.10'),
            scope1: parseFloat(await db.getSetting('auditor_scope1_threshold') || '0.10'),
            scope2: parseFloat(await db.getSetting('auditor_scope2_threshold') || '0.10'),
            scope3: parseFloat(await db.getSetting('auditor_scope3_threshold') || '0.10'),
        };
    }

    async setThreshold(key, value) {
        await db.setSetting(key, String(value));
    }

    async analyze(emissionResult) {
        const newAlerts = [];
        const thresholds = await this.getThresholds();

        const currentSnapshot = {
            timestamp: emissionResult.timestamp || new Date().toISOString(),
            scope1: emissionResult.totals.scope1,
            scope2: emissionResult.totals.scope2,
            scope3: emissionResult.totals.scope3,
            total: emissionResult.totals.total,
            byCategory: { ...emissionResult.byCategory },
        };

        const history = await db.getSnapshots(12);

        if (history.length > 0) {
            const baseline = this._computeBaseline(history);

            const scopeChecks = [
                { key: 'scope1', label: 'SCOPE1', threshold: thresholds.scope1 },
                { key: 'scope2', label: 'SCOPE2', threshold: thresholds.scope2 },
                { key: 'scope3', label: 'SCOPE3', threshold: thresholds.scope3 },
                { key: 'total', label: 'TOTAL', threshold: thresholds.global },
            ];

            for (const { key, label, threshold } of scopeChecks) {
                if (baseline[key] > 0) {
                    const deviation = (currentSnapshot[key] - baseline[key]) / baseline[key];
                    if (Math.abs(deviation) > threshold) {
                        const alert = {
                            id: `ALT-${Date.now()}-${key}`,
                            timestamp: new Date().toISOString(),
                            type: deviation > 0 ? 'SPIKE' : 'DROP',
                            severity: Math.abs(deviation) > 0.25 ? 'critical' : 'warning',
                            scope: key,
                            category: null,
                            message: `${label} emissions ${deviation > 0 ? 'increased' : 'decreased'} by ${(Math.abs(deviation) * 100).toFixed(1)}% compared to baseline (threshold: ${(threshold * 100).toFixed(0)}%)`,
                            current_value: Math.round(currentSnapshot[key]),
                            baseline_value: Math.round(baseline[key]),
                            deviation_percent: Math.round(deviation * 1000) / 10,
                            acknowledged: false,
                        };

                        const analysis = await geminiService.analyzeAnomaly(alert);
                        alert.root_cause_analysis = JSON.stringify(analysis);

                        newAlerts.push(alert);
                    }
                }
            }

            for (const [category, currentVal] of Object.entries(currentSnapshot.byCategory)) {
                const baselineVal = baseline.byCategory?.[category] || 0;
                if (baselineVal > 0) {
                    const deviation = (currentVal - baselineVal) / baselineVal;
                    if (Math.abs(deviation) > thresholds.global) {
                        const alert = {
                            id: `ALT-${Date.now()}-${category.replace(/\s+/g, '-')}`,
                            timestamp: new Date().toISOString(),
                            type: deviation > 0 ? 'SPIKE' : 'DROP',
                            severity: Math.abs(deviation) > 0.25 ? 'critical' : 'warning',
                            scope: null,
                            category,
                            message: `"${category}" emissions ${deviation > 0 ? 'increased' : 'decreased'} by ${(Math.abs(deviation) * 100).toFixed(1)}%`,
                            current_value: Math.round(currentVal),
                            baseline_value: Math.round(baselineVal),
                            deviation_percent: Math.round(deviation * 1000) / 10,
                            acknowledged: false,
                        };

                        const analysis = await geminiService.analyzeAnomaly(alert);
                        alert.root_cause_analysis = JSON.stringify(analysis);

                        newAlerts.push(alert);
                    }
                }
            }
        }

        await db.insertSnapshot(currentSnapshot);

        for (const alert of newAlerts) {
            await db.insertAlert(alert);
        }

        return newAlerts;
    }

    _computeBaseline(history) {
        const n = history.length;
        const baseline = { scope1: 0, scope2: 0, scope3: 0, total: 0, byCategory: {} };

        for (const snapshot of history) {
            baseline.scope1 += snapshot.scope1 / n;
            baseline.scope2 += snapshot.scope2 / n;
            baseline.scope3 += snapshot.scope3 / n;
            baseline.total += snapshot.total / n;

            for (const [cat, val] of Object.entries(snapshot.byCategory || {})) {
                if (!baseline.byCategory[cat]) baseline.byCategory[cat] = 0;
                baseline.byCategory[cat] += val / n;
            }
        }

        return baseline;
    }

    async injectAnomaly(scope = 'scope1', multiplier = 1.5) {
        const history = await db.getSnapshots(1);
        if (history.length === 0) return [];

        const latest = history[0];
        const anomalySnapshot = {
            timestamp: new Date().toISOString(),
            scope1: latest.scope1,
            scope2: latest.scope2,
            scope3: latest.scope3,
            total: latest.total,
            byCategory: latest.byCategory,
        };
        anomalySnapshot[scope] = latest[scope] * multiplier;
        anomalySnapshot.total = anomalySnapshot.scope1 + anomalySnapshot.scope2 + anomalySnapshot.scope3;

        return await this.analyze({
            totals: anomalySnapshot,
            byCategory: anomalySnapshot.byCategory,
            timestamp: anomalySnapshot.timestamp,
        });
    }

    async getAlerts(options = {}) {
        return await db.getAlerts(options);
    }

    async acknowledgeAlert(alertId) {
        return await db.acknowledgeAlert(alertId);
    }

    async getStatus() {
        const thresholds = await this.getThresholds();
        const alerts = await db.getAlerts({});
        const unresolved = await db.getAlerts({ unacknowledgedOnly: true });
        const snapshots = await db.getSnapshots(12);

        return {
            isRunning: true,
            historyDepth: snapshots.length,
            totalAlerts: alerts.length,
            unresolvedAlerts: unresolved.length,
            thresholds,
        };
    }
}

export const auditorAgent = new AuditorAgent();
