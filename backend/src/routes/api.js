import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { readFileSync, unlinkSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { mcpManager } from '../services/mcpClient.js';
import { emissionEngine } from '../services/emissionEngine.js';
import { auditorAgent } from '../agents/auditorAgent.js';
import { reportGenerator } from '../services/reportGenerator.js';
import { geminiService } from '../services/geminiService.js';
import { VERTICALS } from '../config/verticals.js';
import { EMISSION_FACTORS } from '../utils/emissionFactors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'carbonlens-dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
mkdirSync(UPLOAD_DIR, { recursive: true });

const router = express.Router();
const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/dashboard', async (req, res) => {
    try {
        const { startDate, endDate, department, facility } = req.query;
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (department) filters.department = department;
        if (facility) filters.facility = facility;

        // 1. Get Active Vertical & Factors
        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => {
            acc[f.activity_type] = f;
            return acc;
        }, {});

        // 2. Fetch Activities
        const activities = await db.getActivities(filters);

        // 3. Calculate Emissions using Engine
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);

        // 4. Run Auditor Agent
        const newAlerts = await auditorAgent.analyze(emissions);

        // 5. Cache results in emissions table for persistence
        await _storeEmissions(emissions);

        // 6. Save snapshot for trend tracking
        try {
            await db.insertSnapshot({
                timestamp: emissions.timestamp || new Date().toISOString(),
                scope1: emissions.totals.scope1,
                scope2: emissions.totals.scope2,
                scope3: emissions.totals.scope3,
                total: emissions.totals.total,
                byCategory: emissions.byCategory,
            });
        } catch (_) { /* snapshot is non-critical */ }

        res.json({
            success: true,
            data: {
                totals: emissions.totals,
                byCategory: emissions.byCategory,
                byFacility: emissions.byFacility,
                byDepartment: emissions.byDepartment,
                scope1: emissions.scope1,
                scope2: emissions.scope2,
                scope3: emissions.scope3,
                timestamp: emissions.timestamp,
                newAlerts,
                recordCount: activities.length,
            },
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI INSIGHTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/insights', async (req, res) => {
    try {
        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => { acc[f.activity_type] = f; return acc; }, {});
        const activities = await db.getActivities({});
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);
        const insights = await geminiService.generateInsights(emissions);

        res.json({ success: true, data: insights, aiEnabled: geminiService.enabled });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTIVITY DATA CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/data/activities', async (req, res) => {
    try {
        const { scope, category, facility, department, startDate, endDate, source, limit, page, pageSize, sortBy, sortDir, search } = req.query;
        const filters = {};
        if (scope) filters.scope = parseInt(scope);
        if (category) filters.category = category;
        if (facility) filters.facility = facility;
        if (department) filters.department = department;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (source) filters.data_source = source;
        if (search) filters.search = search;
        if (sortBy) filters.sortBy = sortBy;
        if (sortDir) filters.sortDir = sortDir;

        if (page) {
            filters.page = parseInt(page);
            filters.pageSize = parseInt(pageSize) || 25;
            const result = await db.getActivities(filters);
            const stats = await db.getActivityStats();
            res.json({ success: true, data: result.rows, stats, pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: Math.ceil(result.total / result.pageSize) } });
        } else {
            if (limit) filters.limit = parseInt(limit);
            const activities = await db.getActivities(filters);
            const stats = await db.getActivityStats();
            res.json({ success: true, data: activities, stats });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/data/activities/:id', async (req, res) => {
    try {
        const activity = await db.getActivity(parseInt(req.params.id));
        if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
        res.json({ success: true, data: activity });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/data/activities', async (req, res) => {
    try {
        const { date, scope, category, quantity, unit, source_type } = req.body;
        if (!date || !scope || !category || quantity == null || !unit) {
            return res.status(400).json({ success: false, error: 'Missing required fields: date, scope, category, quantity, unit' });
        }
        const parsedScope = parseInt(scope);
        if (![1, 2, 3].includes(parsedScope)) {
            return res.status(400).json({ success: false, error: 'Scope must be 1, 2, or 3' });
        }
        if (isNaN(parseFloat(quantity)) || parseFloat(quantity) < 0) {
            return res.status(400).json({ success: false, error: 'Quantity must be a non-negative number' });
        }
        await db.insertActivity({ ...req.body, scope: parsedScope, quantity: parseFloat(quantity), source_type: source_type || 'Unknown' });
        await _auditLog('activity', null, 'create', null, req.body);
        res.json({ success: true, id: req.body.external_id || 'manual' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/data/activities/:id', async (req, res) => {
    try {
        const result = await db.updateActivity(parseInt(req.params.id), req.body);
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/data/activities/:id', async (req, res) => {
    try {
        const old = await db.getActivity(parseInt(req.params.id));
        const result = await db.deleteActivity(parseInt(req.params.id));
        await _auditLog('activity', req.params.id, 'delete', old, null);
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSV UPLOAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/data/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const fileContent = readFileSync(req.file.path, 'utf-8');
        unlinkSync(req.file.path);

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        if (records.length === 0) {
            return res.status(400).json({ success: false, error: 'CSV file is empty' });
        }

        const mapped = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            try {
                const activity = {
                    external_id: row.id || row.external_id || null,
                    date: row.date || row.Date || row.DATE,
                    scope: parseInt(row.scope || row.Scope || row.SCOPE),
                    category: row.category || row.Category || row.CATEGORY,
                    source_type: row.source_type || row.type || row.Type || row.source || 'Unknown',
                    description: row.description || row.Description || row.desc || '',
                    quantity: parseFloat(row.quantity || row.Quantity || row.amount || row.Amount || 0),
                    unit: row.unit || row.Unit || row.UNIT || 'unknown',
                    facility: row.facility || row.Facility || null,
                    department: row.department || row.Department || null,
                    supplier: row.supplier || row.Supplier || null,
                    origin: row.origin || row.Origin || null,
                    destination: row.destination || row.Destination || null,
                    transport_mode: row.transport_mode || row.mode || row.Mode || null,
                    data_source: 'csv-upload',
                };

                if (!activity.date || !activity.scope || !activity.category || !activity.quantity) {
                    errors.push({ row: i + 2, error: 'Missing required field (date, scope, category, or quantity)' });
                    continue;
                }

                if (activity.description && (!activity.source_type || activity.source_type === 'Unknown')) {
                    const match = await geminiService.matchEmissionFactor(activity.description, activity.scope);
                    activity.source_type = match.type;
                }

                mapped.push(activity);
            } catch (err) {
                errors.push({ row: i + 2, error: err.message });
            }
        }

        const count = mapped.length > 0 ? await db.insertActivitiesBatch(mapped) : 0;

        res.json({
            success: true,
            imported: count,
            errors: errors.length,
            errorDetails: errors.slice(0, 10),
            totalRows: records.length,
        });
    } catch (error) {
        console.error('CSV upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/data/stats', async (req, res) => {
    try {
        const stats = await db.getActivityStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/alerts', async (req, res) => {
    try {
        const severity = req.query.severity || undefined;
        const alerts = await auditorAgent.getAlerts({
            severity,
            unacknowledgedOnly: req.query.unresolved === 'true',
        });
        const status = await auditorAgent.getStatus();
        res.json({ success: true, data: alerts, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/alerts/:id/acknowledge', async (req, res) => {
    try {
        const result = await auditorAgent.acknowledgeAlert(req.params.id);
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/audit/simulate-anomaly', async (req, res) => {
    try {
        const { scope = 'scope1', multiplier = 1.5 } = req.body || {};
        const alerts = await auditorAgent.injectAnomaly(scope, multiplier);
        const status = await auditorAgent.getStatus();
        res.json({ success: true, alerts, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/settings', async (req, res) => {
    try {
        const settings = await db.getAllSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const ALLOWED_SETTINGS = new Set([
    'auditor_threshold', 'auditor_scope1_threshold', 'auditor_scope2_threshold',
    'auditor_scope3_threshold', 'company_name', 'active_vertical', 'default_grid_region',
]);

router.put('/settings', async (req, res) => {
    try {
        const rejected = [];
        for (const [key, value] of Object.entries(req.body)) {
            if (!ALLOWED_SETTINGS.has(key)) {
                rejected.push(key);
                continue;
            }
            await db.setSetting(key, value);
        }
        const settings = await db.getAllSettings();
        res.json({ success: true, data: settings, rejected: rejected.length ? rejected : undefined });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/verticals/config', (req, res) => {
    res.json({ success: true, data: VERTICALS });
});

router.get('/verticals/active', async (req, res) => {
    try {
        const activeId = await db.getSetting('active_vertical') || 'default';
        const config = VERTICALS[activeId] || VERTICALS.default;
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/report', async (req, res) => {
    try {
        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => { acc[f.activity_type] = f; return acc; }, {});
        const activities = await db.getActivities({});
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);

        const compSetting = await db.getSetting('company_name');
        const company = req.query.company || compSetting || 'Acme Corporation';
        const period = req.query.period || new Date().toISOString().slice(0, 7);
        const framework = req.query.framework || 'CSRD & SEC';

        const activeVertical = VERTICALS[activeVerticalId] || VERTICALS.default;

        const pdfBuffer = await reportGenerator.generateReport(emissions, {
            companyName: company,
            reportingPeriod: period,
            framework,
            vertical: activeVertical
        });

        await db.insertReport({
            company_name: company,
            reporting_period: period,
            framework,
            total_co2e: emissions.totals.total,
            scope1_co2e: emissions.totals.scope1,
            scope2_co2e: emissions.totals.scope2,
            scope3_co2e: emissions.totals.scope3,
            filename: `ESG_Report_${Date.now()}.pdf`,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ESG_Report_${company.replace(/\s+/g, '_')}_${period}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/reports/history', async (req, res) => {
    try {
        const reports = await db.getReports();
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMISSION FACTORS & STATUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/emission-factors', (req, res) => {
    res.json({ success: true, data: EMISSION_FACTORS });
});

router.get('/status', async (req, res) => {
    const [agent, dbStats] = await Promise.all([
        auditorAgent.getStatus(),
        db.getActivityStats()
    ]);

    res.json({
        success: true,
        agent,
        ai: geminiService.getStatus(),
        mcpConnected: !!(mcpManager.erpClient && mcpManager.crmClient),
        database: dbStats,
        uptime: process.uptime(),
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILTER OPTIONS (for dashboard dropdowns)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMISSION TRENDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/trends', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const snapshots = await db.getSnapshots(limit);
        const points = snapshots.reverse().map(s => ({
            timestamp: s.timestamp,
            date: s.timestamp.slice(0, 10),
            scope1: Math.round(s.scope1),
            scope2: Math.round(s.scope2),
            scope3: Math.round(s.scope3),
            total: Math.round(s.total),
        }));
        res.json({ success: true, data: points });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSV EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/data/export', async (req, res) => {
    try {
        const { scope, category, facility, department, startDate, endDate, source } = req.query;
        const filters = {};
        if (scope) filters.scope = parseInt(scope);
        if (category) filters.category = category;
        if (facility) filters.facility = facility;
        if (department) filters.department = department;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (source) filters.data_source = source;

        const activities = await db.getActivities(filters);
        const rows = Array.isArray(activities) ? activities : activities.rows || [];

        const header = 'date,scope,category,source_type,description,quantity,unit,facility,department,supplier,origin,destination,transport_mode,data_source';
        const csvRows = rows.map(a => {
            const esc = (v) => {
                if (v == null) return '';
                const s = String(v);
                return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
            };
            return [a.date, a.scope, a.category, a.source_type, a.description, a.quantity, a.unit,
                    a.facility, a.department, a.supplier, a.origin, a.destination, a.transport_mode, a.data_source]
                    .map(esc).join(',');
        });

        const csv = [header, ...csvRows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="carbonlens_export_${new Date().toISOString().slice(0,10)}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/filters', async (req, res) => {
    try {
        const filterData = await db.getDistinctFilters();
        res.json({ success: true, data: filterData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECARBONIZATION SIMULATOR (Phase 5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/simulator/predict', async (req, res) => {
    const { params, baseline } = req.body;

    if (!params || !baseline) {
        return res.status(400).json({ success: false, error: 'Missing required fields: params, baseline' });
    }

    try {
        let reductionPercent = 0;
        let costImpact = 'neutral';
        let costMagnitude = '$0';
        let analysis = '';
        let tags = [];
        let riskScore = 30;
        let riskDetail = 'Low implementation risk.';

        const s1Base = baseline.scope1 || 0;
        const s2Base = baseline.scope2 || 0;
        const s3Base = baseline.scope3 || 0;

        const s1Reduction = (s1Base * (params.evTransition / 100)) * 0.95; // EV vs Diesel factor
        const s2Reduction = (s2Base * (params.renewables / 100)); // Direct swap
        const s3ReductionCommute = (s3Base * 0.12 * (params.remoteWork / 100)); // Commute avg 12% of S3
        const s3ReductionLogistics = (s3Base * 0.25 * (params.supplyChainRail / 100)) * 0.35; // Rail shift avg saving

        const totalReduction = s1Reduction + s2Reduction + s3ReductionCommute + s3ReductionLogistics;
        reductionPercent = (totalReduction / (baseline.total || 1)) * 100;
        const newTotal = baseline.total - totalReduction;

        // ROI Modeling
        const annualOpacity = (params.renewables * 0.08) + (params.evTransition * 0.12);
        if (annualOpacity > 5) {
            costImpact = 'saving';
            costMagnitude = `$${Math.round(totalReduction * 0.14).toLocaleString()} / yr`;
            analysis = `The proposed strategy prioritizes high-impact Scope 1 & 2 reductions. Operational efficiency gains from ${params.renewables}% renewable energy mix and fleet electrification are projected to yield significant utility savings, estimated at ${costMagnitude} annually.`;
            tags = ['High ROI', 'SBTi Aligned', 'Operational Excellence'];
        } else {
            costImpact = 'investment';
            costMagnitude = `$${Math.round(totalReduction * 0.08).toLocaleString()} CapEx`;
            analysis = "Proposed shifts are currently incremental. We recommend increasing the Renewable Energy mix to >40% to achieve the critical mass required for a 'saving' cost impact profile.";
            tags = ['Incremental', 'Low Risk'];
        }

        if (params.supplyChainRail > 60 || params.evTransition > 70) {
            riskScore = 75;
            riskDetail = "Significant logistical reorganization required. Potential supply chain disruption and high initial CapEx for fleet replacement.";
        }

        // Gemini AI Enhancement
        if (geminiService.enabled) {
            try {
                const aiResult = await geminiService.analyzeStrategy(params, baseline);
                if (aiResult) {
                    analysis = aiResult.analysis;
                    tags = aiResult.tags;
                    riskScore = aiResult.riskScore;
                    riskDetail = aiResult.riskDetail || riskDetail;
                }
            } catch (e) {
                console.warn('Simulator AI enhancement failed', e);
            }
        }

        res.json({
            success: true,
            data: {
                newTotal,
                reductionPercent,
                costImpact,
                costMagnitude,
                analysis,
                tags,
                riskScore,
                riskDetail
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI CHAT ASSISTANT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => { acc[f.activity_type] = f; return acc; }, {});
        const activities = await db.getActivities({});
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);
        const targets = await db.getTargets();
        let trends = [];
        try {
            const snapshots = await db.getSnapshots(10);
            trends = snapshots.reverse().map(s => ({ date: s.timestamp?.slice(0, 10), total: Math.round(s.total) }));
        } catch (_) {}

        const context = {
            totals: emissions.totals,
            byCategory: emissions.byCategory,
            byFacility: emissions.byFacility,
            byDepartment: emissions.byDepartment,
            recordCount: activities.length,
            trends,
            targets: targets.map(t => ({ name: t.name, target_percent: t.target_percent, target_year: t.target_year, scope: t.scope })),
        };

        const result = await geminiService.chatWithData(message, context);
        res.json({ success: true, data: { answer: result.answer, source: result.source } });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REDUCTION TARGETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/targets', async (req, res) => {
    try {
        const targets = await db.getTargets();
        const parsed = targets.map(t => ({
            ...t,
            interim_milestones: t.interim_milestones ? JSON.parse(t.interim_milestones) : [],
        }));
        res.json({ success: true, data: parsed });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/targets', async (req, res) => {
    try {
        const { name, scope, base_year, base_emissions, target_year, target_percent } = req.body;
        if (!name || !base_year || base_emissions == null || !target_year || target_percent == null) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }
        await db.insertTarget(req.body);
        await _auditLog('target', null, 'create', null, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/targets/:id', async (req, res) => {
    try {
        const old = await db.getTarget(parseInt(req.params.id));
        await db.updateTarget(parseInt(req.params.id), req.body);
        await _auditLog('target', req.params.id, 'update', old, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/targets/:id', async (req, res) => {
    try {
        const old = await db.getTarget(parseInt(req.params.id));
        await db.deleteTarget(parseInt(req.params.id));
        await _auditLog('target', req.params.id, 'delete', old, null);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPPLIERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/suppliers', async (req, res) => {
    try {
        const suppliers = await db.getSuppliers();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/suppliers', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'Supplier name is required' });
        await db.insertSupplier(req.body);
        await _auditLog('supplier', null, 'create', null, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/suppliers/:id', async (req, res) => {
    try {
        const old = await db.getSupplier(parseInt(req.params.id));
        await db.updateSupplier(parseInt(req.params.id), req.body);
        await _auditLog('supplier', req.params.id, 'update', old, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/suppliers/:id', async (req, res) => {
    try {
        const old = await db.getSupplier(parseInt(req.params.id));
        await db.deleteSupplier(parseInt(req.params.id));
        await _auditLog('supplier', req.params.id, 'delete', old, null);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.post('/suppliers/:id/recalc', async (req, res) => {
    try {
        const result = await db.recalcSupplierScore(parseInt(req.params.id));
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARBON INTENSITY & COMPANY PROFILE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/company-profile', async (req, res) => {
    try {
        const profile = await db.getCompanyProfile();
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/company-profile', async (req, res) => {
    try {
        await db.updateCompanyProfile(req.body);
        await _auditLog('company_profile', '1', 'update', null, req.body);
        const profile = await db.getCompanyProfile();
        res.json({ success: true, data: profile });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.get('/intensity', async (req, res) => {
    try {
        const profile = await db.getCompanyProfile();
        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => { acc[f.activity_type] = f; return acc; }, {});
        const activities = await db.getActivities({});
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);
        const total = emissions.totals.total || 0;

        const metrics = [];
        if (profile.employee_count && profile.employee_count > 0) {
            metrics.push({ key: 'per_employee', label: 'Per Employee', value: Math.round(total / profile.employee_count), unit: 'kg CO2e/employee', denominator: profile.employee_count });
        }
        if (profile.revenue && profile.revenue > 0) {
            metrics.push({ key: 'per_revenue', label: 'Per $1M Revenue', value: Math.round((total / profile.revenue) * 1000000), unit: 'kg CO2e/$1M', denominator: profile.revenue });
        }
        if (profile.floor_area_sqft && profile.floor_area_sqft > 0) {
            metrics.push({ key: 'per_sqft', label: 'Per Sq Ft', value: Math.round((total / profile.floor_area_sqft) * 100) / 100, unit: 'kg CO2e/sqft', denominator: profile.floor_area_sqft });
        }
        if (profile.units_produced && profile.units_produced > 0) {
            metrics.push({ key: 'per_unit', label: 'Per Unit Produced', value: Math.round((total / profile.units_produced) * 100) / 100, unit: 'kg CO2e/unit', denominator: profile.units_produced });
        }

        res.json({ success: true, data: { metrics, totalEmissions: total, profile } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORT SCHEDULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/report-schedules', async (req, res) => {
    try {
        const schedules = await db.getReportSchedules();
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/report-schedules', async (req, res) => {
    try {
        const { name, frequency } = req.body;
        if (!name || !frequency) return res.status(400).json({ success: false, error: 'Name and frequency are required' });

        const nextRun = _calcNextRun(frequency);
        await db.insertReportSchedule({ ...req.body, next_run: nextRun });
        await _auditLog('report_schedule', null, 'create', null, req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/report-schedules/:id', async (req, res) => {
    try {
        if (req.body.frequency) {
            req.body.next_run = _calcNextRun(req.body.frequency);
        }
        await db.updateReportSchedule(parseInt(req.params.id), req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/report-schedules/:id', async (req, res) => {
    try {
        await db.deleteReportSchedule(parseInt(req.params.id));
        await _auditLog('report_schedule', req.params.id, 'delete', null, null);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
        if (password.length < 6) return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

        const existing = await db.getUserByEmail(email);
        if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });

        const id = crypto.randomUUID();
        const password_hash = await bcrypt.hash(password, 10);
        const users = await db.getUsers();
        const role = users.length === 0 ? 'admin' : 'user';

        await db.insertUser({ id, name, email, password_hash, role });
        await _auditLog('user', id, 'create', null, { name, email, role });

        const token = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.json({ success: true, data: { token, user: { id, name, email, role } } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });

        const user = await db.getUserByEmail(email);
        if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        await _auditLog('user', user.id, 'login', null, { email });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/auth/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token provided' });

        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        const user = await db.getUserById(decoded.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

router.get('/auth/users', async (req, res) => {
    try {
        const users = await db.getUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUDIT LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/audit-log', async (req, res) => {
    try {
        const { entity_type, action, startDate, endDate, limit, offset } = req.query;
        const filters = {};
        if (entity_type) filters.entity_type = entity_type;
        if (action) filters.action = action;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (limit) filters.limit = parseInt(limit);
        if (offset) filters.offset = parseInt(offset);
        const result = await db.getAuditLog(filters);
        res.json({ success: true, data: result.rows, total: result.total });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MCP SYNC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/integrations/status', async (req, res) => {
    try {
        const lastSync = await db.getLastSync();
        const syncLogs = await db.getSyncLogs(20);
        const erpConnected = !!mcpManager.erpClient;
        const crmConnected = !!mcpManager.crmClient;
        res.json({
            success: true,
            data: {
                erp: { connected: erpConnected, name: 'ERP System' },
                crm: { connected: crmConnected, name: 'CRM System' },
                lastSync: lastSync?.synced_at || null,
                syncLogs,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/integrations/sync-now', async (req, res) => {
    try {
        const result = await _performMcpSync();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BENCHMARKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/benchmarks', async (req, res) => {
    try {
        const industry = req.query.industry;
        const benchmarks = await db.getBenchmarks(industry);
        const profile = await db.getCompanyProfile();

        const activeVerticalId = await db.getSetting('active_vertical') || 'default';
        const factors = await db.getEmissionFactors(activeVerticalId);
        const factorMap = factors.reduce((acc, f) => { acc[f.activity_type] = f; return acc; }, {});
        const activities = await db.getActivities({});
        const emissions = emissionEngine.calculateWithFactors({ activities }, factorMap);

        const yourMetrics = {};
        const total = emissions.totals.total || 0;
        if (profile.employee_count > 0) yourMetrics.total_per_employee = Math.round(total / profile.employee_count);
        if (profile.revenue > 0) yourMetrics.total_per_revenue = Math.round((total / profile.revenue) * 1000000);
        yourMetrics.scope1_pct = total > 0 ? Math.round((emissions.totals.scope1 / total) * 100) : 0;
        yourMetrics.scope2_pct = total > 0 ? Math.round((emissions.totals.scope2 / total) * 100) : 0;
        yourMetrics.scope3_pct = total > 0 ? Math.round((emissions.totals.scope3 / total) * 100) : 0;

        res.json({ success: true, data: { benchmarks, yourMetrics, profile } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _dbToEngineFormat(activities) {
    const data = {
        fuelLogs: [],
        utilityBills: [],
        purchaseOrders: [],
        shippingManifests: [],
        businessTravel: [],
        employeeCommute: [],
        wasteRecords: [],
    };

    for (const a of activities) {
        switch (a.category) {
            case 'Fuel Combustion':
                data.fuelLogs.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    type: a.source_type,
                    quantity_liters: a.unit === 'liters' ? a.quantity : undefined,
                    quantity_therms: a.unit === 'therms' ? a.quantity : undefined,
                    quantity_gallons: a.unit === 'gallons' ? a.quantity : undefined,
                    department: a.department,
                    vehicle: a.facility,
                    facility: a.facility,
                    data_source: a.data_source,
                    scope: 1,
                });
                break;
            case 'Purchased Electricity':
                data.utilityBills.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: 'Electricity',
                    kwh: a.quantity,
                    facility: a.facility,
                    provider: 'GridCo',
                    data_source: a.data_source,
                    scope: 2,
                });
                break;
            case 'Purchased Steam':
                data.utilityBills.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: 'Steam',
                    pounds: a.quantity,
                    facility: a.facility,
                    provider: 'SteamWorks',
                    data_source: a.data_source,
                    scope: 2,
                });
                break;
            case 'Purchased Goods':
                data.purchaseOrders.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    supplier: a.supplier || 'Unknown',
                    material: a.source_type,
                    weight_tons: a.quantity,
                    origin_country: a.origin || 'Unknown',
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Downstream Transport':
                data.shippingManifests.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    origin: a.origin || '',
                    destination: a.destination || '',
                    distance_km: 1,
                    weight_tons: a.quantity,
                    mode: a.transport_mode || a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Business Travel':
                data.businessTravel.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    employee: 'Employee',
                    origin: a.origin || '',
                    destination: a.destination || '',
                    distance_km: a.quantity,
                    mode: a.transport_mode || a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Employee Commute':
                data.businessTravel.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    employee: 'Aggregated',
                    origin: 'Home',
                    destination: 'Office',
                    distance_km: a.quantity,
                    mode: a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Waste Disposal':
                data.wasteRecords.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: a.source_type,
                    weight_tons: a.quantity,
                    facility: a.facility || 'Unknown',
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
        }
    }

    return data;
}

async function _auditLog(entityType, entityId, action, oldValue, newValue) {
    try {
        await db.insertAuditLog({ entity_type: entityType, entity_id: String(entityId || ''), action, old_value: oldValue, new_value: newValue });
    } catch (_) { /* non-critical */ }
}

function _calcNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
        case 'daily': now.setDate(now.getDate() + 1); break;
        case 'weekly': now.setDate(now.getDate() + 7); break;
        case 'monthly': now.setMonth(now.getMonth() + 1); break;
    }
    return now.toISOString();
}

async function _performMcpSync() {
    const results = [];
    const tools = [
        { server: 'erp', tool: 'get_fuel_logs', category: 'Fuel Combustion', scope: 1 },
        { server: 'erp', tool: 'get_utility_bills', category: 'Purchased Electricity', scope: 2 },
        { server: 'erp', tool: 'get_purchase_orders', category: 'Purchased Goods', scope: 3 },
        { server: 'crm', tool: 'get_shipping_manifests', category: 'Downstream Transport', scope: 3 },
        { server: 'crm', tool: 'get_business_travel', category: 'Business Travel', scope: 3 },
        { server: 'crm', tool: 'get_employee_commute', category: 'Employee Commute', scope: 3 },
        { server: 'crm', tool: 'get_waste_records', category: 'Waste Disposal', scope: 3 },
    ];

    for (const { server, tool, category, scope } of tools) {
        try {
            const data = await mcpManager.callTool(server, tool, {});
            const existingIds = new Set();
            const existing = await db.getActivities({ category, data_source: 'mcp' });
            const existArr = Array.isArray(existing) ? existing : existing.rows || [];
            existArr.forEach(a => { if (a.external_id) existingIds.add(a.external_id); });

            const newRecords = data.filter(d => !existingIds.has(d.id));
            if (newRecords.length > 0) {
                const mapped = newRecords.map(d => ({
                    external_id: d.id,
                    date: d.date || d.month || new Date().toISOString().slice(0, 10),
                    scope, category,
                    source_type: d.type || d.mode || d.material || 'Unknown',
                    description: d.description || '',
                    quantity: d.quantity_liters || d.kwh || d.weight_tons || d.distance_km || d.quantity || 0,
                    unit: d.quantity_liters ? 'liters' : d.kwh ? 'kWh' : d.weight_tons ? 'tonnes' : d.distance_km ? 'km' : 'units',
                    facility: d.facility || null,
                    department: d.department || null,
                    supplier: d.supplier || null,
                    origin: d.origin || null,
                    destination: d.destination || null,
                    transport_mode: d.mode || null,
                    data_source: 'mcp',
                }));
                await db.insertActivitiesBatch(mapped);
            }

            await db.insertSyncLog({ source: server, tool_name: tool, records_fetched: data.length, records_new: newRecords.length, status: 'success' });
            results.push({ tool, fetched: data.length, new: newRecords.length, status: 'success' });
        } catch (err) {
            await db.insertSyncLog({ source: server, tool_name: tool, records_fetched: 0, records_new: 0, status: 'error', error_message: err.message });
            results.push({ tool, fetched: 0, new: 0, status: 'error', error: err.message });
        }
    }
    return results;
}

async function _storeEmissions(emissions) {
    try {
        await db.clearEmissions();
        const entries = [...emissions.scope1, ...emissions.scope2, ...emissions.scope3];
        if (entries.length === 0) return;
        await db.batchInsertEmissions(entries.map(entry => ({
            activity_id: entry.id,
            scope: entry.scope,
            category: entry.category,
            source_description: entry.source,
            activity_data: entry.activity_data,
            activity_unit: entry.activity_unit,
            emission_factor: entry.emission_factor,
            emission_factor_source: entry.emission_factor_source || 'Default',
            co2e_kg: entry.co2e_kg,
            calculation_method: 'deterministic',
            confidence_score: entry.confidence_score,
            date: entry.date,
            facility: entry.facility || null,
            department: entry.department || null,
        })));
    } catch (err) {
        console.warn('Failed to store emissions:', err.message);
    }
}

export default router;
