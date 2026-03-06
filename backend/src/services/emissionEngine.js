import { EMISSION_FACTORS } from '../utils/emissionFactors.js';

/**
 * Emission Calculation Engine
 * Core formula: CO2e = Activity Data × Emission Factor
 *
 * Uses GHG Protocol methodology for Scope 1, 2, and 3.
 */
class EmissionEngine {
    /**
     * Calculate emissions for all activity data using a provided factor map.
     */
    calculateWithFactors(activityData, factorMap) {
        const results = {
            scope1: [],
            scope2: [],
            scope3: [],
            totals: { scope1: 0, scope2: 0, scope3: 0, total: 0 },
            byCategory: {},
            byFacility: {},
            byDepartment: {},
            byVertical: {},
            timestamp: new Date().toISOString(),
        };

        // Generic Activity Records (from the database)
        if (activityData.activities) {
            for (const act of activityData.activities) {
                const entry = this.calculateActivityEmission(act, factorMap);
                const scopeKey = `scope${entry.scope}`;
                results[scopeKey].push(entry);
                results.totals[scopeKey] += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        results.totals.total = results.totals.scope1 + results.totals.scope2 + results.totals.scope3;
        return results;
    }

    calculateActivityEmission(act, factorMap) {
        let factor = 0;
        let source = 'Default';
        let year = 2024;
        let scope = act.scope;

        // Try to find matching factor in the library
        if (factorMap && (factorMap[act.activity_type] || factorMap[act.source_type])) {
            const f = factorMap[act.activity_type] || factorMap[act.source_type];
            factor = f.kg_co2e_per_unit;
            source = f.source;
            year = f.year;
            scope = f.scope || scope;
        } else {
            // Fallback to static factors if lib doesn't have it
            if (act.scope === 1) {
                const f = EMISSION_FACTORS.fuels[act.source_type] || EMISSION_FACTORS.fuels['Diesel'];
                factor = f.factor;
            } else if (act.scope === 2) {
                const f = act.category === 'Purchased Electricity'
                    ? EMISSION_FACTORS.electricity['US Average']
                    : EMISSION_FACTORS.steam['Default'];
                factor = f.factor;
            } else {
                const category = act.category || '';
                const sourceType = act.source_type || '';
                let f;
                if (category === 'Downstream Transport' || category.includes('Transport')) {
                    f = EMISSION_FACTORS.transport[sourceType] || EMISSION_FACTORS.transport['Road Freight'];
                } else if (category === 'Business Travel') {
                    f = EMISSION_FACTORS.businessTravel[sourceType] || EMISSION_FACTORS.businessTravel['Car'];
                } else if (category === 'Employee Commute') {
                    f = EMISSION_FACTORS.commute[sourceType] || EMISSION_FACTORS.commute['Car'];
                } else if (category === 'Waste Disposal') {
                    f = EMISSION_FACTORS.waste[sourceType] || EMISSION_FACTORS.waste['Landfill'];
                } else if (category === 'Purchased Goods') {
                    f = EMISSION_FACTORS.materials[sourceType] || EMISSION_FACTORS.materials['Default'];
                } else {
                    f = EMISSION_FACTORS.transport['Road Freight'];
                }
                factor = f.factor;
            }
        }

        const co2e_kg = act.quantity * factor;
        const confidence = this._getConfidence(act.data_source);

        return {
            id: act.id,
            scope: scope,
            category: act.category,
            source: act.description || act.source_type,
            activity_type: act.activity_type || act.source_type,
            activity_data: act.quantity,
            activity_unit: act.unit,
            emission_factor: factor,
            emission_factor_source: `${source} ${year}`,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: act, timestamp: new Date().toISOString() }),
            formula: `CO2e = Activity Data (${act.quantity} ${act.unit}) × Factor (${factor} from ${source}).`,
            date: act.date,
            department: act.department,
            facility: act.facility,
        };
    }

    calculateAll(activityData) {
        const activities = activityData.activities || activityData;
        const normalized = Array.isArray(activities) ? activities : [];
        return this.calculateWithFactors({ activities: normalized }, {});
    }

    _getConfidence(source) {
        if (!source) return 60;
        if (source.includes('mcp') || source.includes('api')) return 95;
        if (source.includes('csv')) return 80;
        return 60; // Manual
    }

    _aggregate(results, entry) {
        const cat = entry.category || 'Other';
        if (!results.byCategory[cat]) results.byCategory[cat] = 0;
        results.byCategory[cat] += entry.co2e_kg;

        if (entry.facility) {
            if (!results.byFacility[entry.facility]) results.byFacility[entry.facility] = 0;
            results.byFacility[entry.facility] += entry.co2e_kg;
        }

        if (entry.department) {
            if (!results.byDepartment[entry.department]) results.byDepartment[entry.department] = 0;
            results.byDepartment[entry.department] += entry.co2e_kg;
        }
    }
}

export const emissionEngine = new EmissionEngine();
