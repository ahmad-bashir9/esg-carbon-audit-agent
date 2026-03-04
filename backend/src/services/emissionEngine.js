import { EMISSION_FACTORS } from '../utils/emissionFactors.js';

/**
 * Emission Calculation Engine
 * Core formula: CO2e = Activity Data × Emission Factor
 *
 * Uses GHG Protocol methodology for Scope 1, 2, and 3.
 */
class EmissionEngine {

    /**
     * Calculate emissions for all activity data.
     */
    calculateAll(activityData) {
        const results = {
            scope1: [],
            scope2: [],
            scope3: [],
            totals: { scope1: 0, scope2: 0, scope3: 0, total: 0 },
            byCategory: {},
            byFacility: {},
            byDepartment: {},
            timestamp: new Date().toISOString(),
        };

        // Scope 1: Fuel logs
        if (activityData.fuelLogs) {
            for (const log of activityData.fuelLogs) {
                const entry = this.calculateFuelEmission(log);
                results.scope1.push(entry);
                results.totals.scope1 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        // Scope 2: Utility bills
        if (activityData.utilityBills) {
            for (const bill of activityData.utilityBills) {
                const entry = this.calculateUtilityEmission(bill);
                results.scope2.push(entry);
                results.totals.scope2 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        // Scope 3: Transport, Travel, Commute, Materials, Waste
        if (activityData.shippingManifests) {
            for (const manifest of activityData.shippingManifests) {
                const entry = this.calculateTransportEmission(manifest);
                results.scope3.push(entry);
                results.totals.scope3 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        if (activityData.businessTravel) {
            for (const trip of activityData.businessTravel) {
                const entry = this.calculateTravelEmission(trip);
                results.scope3.push(entry);
                results.totals.scope3 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        if (activityData.employeeCommute) {
            for (const commute of activityData.employeeCommute) {
                const entries = this.calculateCommuteEmission(commute);
                for (const entry of entries) {
                    results.scope3.push(entry);
                    results.totals.scope3 += entry.co2e_kg;
                    this._aggregate(results, entry);
                }
            }
        }

        if (activityData.purchaseOrders) {
            for (const po of activityData.purchaseOrders) {
                const entry = this.calculateMaterialEmission(po);
                results.scope3.push(entry);
                results.totals.scope3 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        if (activityData.wasteRecords) {
            for (const waste of activityData.wasteRecords) {
                const entry = this.calculateWasteEmission(waste);
                results.scope3.push(entry);
                results.totals.scope3 += entry.co2e_kg;
                this._aggregate(results, entry);
            }
        }

        results.totals.total = results.totals.scope1 + results.totals.scope2 + results.totals.scope3;

        return results;
    }

    // ─── Scope 1 ─────────────────────────────────────────────────────
    calculateFuelEmission(log) {
        const fuelType = log.type;
        const factors = EMISSION_FACTORS.fuels[fuelType] || EMISSION_FACTORS.fuels['Diesel'];
        const quantity = log.quantity_liters || log.quantity_therms || log.quantity_gallons || 0;
        const co2e_kg = quantity * factors.factor;

        const confidence = this._getConfidence(log.data_source);

        return {
            id: log.id,
            scope: 1,
            category: 'Fuel Combustion',
            source: `${fuelType} - ${log.vehicle || log.facility}`,
            activity_data: quantity,
            activity_unit: factors.unit,
            emission_factor: factors.factor,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: log, timestamp: new Date().toISOString() }),
            formula: `CO2e = Activity Data (${quantity} ${factors.unit}) × Emission Factor (${factors.factor}). [Method: ISO 14064-1:2018]`,
            date: log.date,
            department: log.department,
            facility: log.facility || log.vehicle,
        };
    }

    // ─── Scope 2 ─────────────────────────────────────────────────────
    calculateUtilityEmission(bill) {
        const confidence = this._getConfidence(bill.data_source);
        const lineage = JSON.stringify({ raw: bill, timestamp: new Date().toISOString() });

        if (bill.type === 'Electricity') {
            const factors = EMISSION_FACTORS.electricity['US Average'];
            const co2e_kg = bill.kwh * factors.factor;
            return {
                id: bill.id,
                scope: 2,
                category: 'Purchased Electricity',
                source: `${bill.facility} - ${bill.provider}`,
                activity_data: bill.kwh,
                activity_unit: 'kWh',
                emission_factor: factors.factor,
                co2e_kg: Math.round(co2e_kg * 100) / 100,
                confidence_score: confidence,
                raw_lineage_snapshot: lineage,
                formula: `CO2e = Consumption (${bill.kwh} kWh) × Grid Factor (${factors.factor}). [Method: ISO 14064-1 Location-based]`,
                date: bill.month,
                facility: bill.facility,
            };
        }
        if (bill.type === 'Steam') {
            const factors = EMISSION_FACTORS.steam['Default'];
            const co2e_kg = bill.pounds * factors.factor;
            return {
                id: bill.id,
                scope: 2,
                category: 'Purchased Steam',
                source: `${bill.facility} - ${bill.provider}`,
                activity_data: bill.pounds,
                activity_unit: 'pound',
                emission_factor: factors.factor,
                co2e_kg: Math.round(co2e_kg * 100) / 100,
                confidence_score: confidence,
                raw_lineage_snapshot: lineage,
                formula: `CO2e = Steam Weight (${bill.pounds} lb) × Factor (${factors.factor}). [Method: ISO 14064-1 Heat/Steam]`,
                date: bill.month,
                facility: bill.facility,
            };
        }
        return { id: bill.id, scope: 2, category: 'Unknown Utility', co2e_kg: 0, confidence_score: 0 };
    }

    // ─── Scope 3 ─────────────────────────────────────────────────────
    calculateTransportEmission(manifest) {
        const mode = manifest.mode;
        const factors = EMISSION_FACTORS.transport[mode] || EMISSION_FACTORS.transport['Road Freight'];
        const tonKm = manifest.weight_tons * manifest.distance_km;
        const co2e_kg = tonKm * factors.factor;
        const confidence = this._getConfidence(manifest.data_source);

        return {
            id: manifest.id,
            scope: 3,
            category: 'Downstream Transport',
            source: `${mode} - ${manifest.origin} → ${manifest.destination}`,
            activity_data: tonKm,
            activity_unit: 'ton-km',
            emission_factor: factors.factor,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: manifest, timestamp: new Date().toISOString() }),
            formula: `CO2e = (Weight ${manifest.weight_tons}t × Distance ${manifest.distance_km}km) × Mode Factor (${factors.factor}). [Method: Distance-based Scope 3.4]`,
            date: manifest.date,
        };
    }

    calculateTravelEmission(trip) {
        const mode = trip.mode;
        const factors = EMISSION_FACTORS.businessTravel[mode] || EMISSION_FACTORS.businessTravel['Flight (Economy)'];
        const co2e_kg = trip.distance_km * factors.factor;
        const confidence = this._getConfidence(trip.data_source);

        return {
            id: trip.id,
            scope: 3,
            category: 'Business Travel',
            source: `${mode} - ${trip.origin} → ${trip.destination} (${trip.employee})`,
            activity_data: trip.distance_km,
            activity_unit: 'passenger-km',
            emission_factor: factors.factor,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: trip, timestamp: new Date().toISOString() }),
            formula: `CO2e = Distance (${trip.distance_km}km) × Travel Factor (${factors.factor}). [Method: Distance-based Scope 3.6]`,
            date: trip.date,
        };
    }

    calculateCommuteEmission(commute) {
        const entries = [];
        const workingDays = 22;
        const totalKm = commute.total_employees * commute.avg_commute_km * 2 * workingDays;
        const confidence = this._getConfidence(commute.data_source);
        const lineage = JSON.stringify({ raw: commute, timestamp: new Date().toISOString() });

        // Car commuters
        const carKm = totalKm * commute.car_percentage;
        const carFactor = EMISSION_FACTORS.commute['Car'];
        entries.push({
            id: `${commute.id}-car`,
            scope: 3,
            category: 'Employee Commute',
            source: 'Car commute (aggregated)',
            activity_data: Math.round(carKm),
            activity_unit: 'km',
            emission_factor: carFactor.factor,
            co2e_kg: Math.round(carKm * carFactor.factor * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: lineage,
            formula: `CO2e = Aggregated Distance (${Math.round(carKm)}km) × Vehicle Factor (${carFactor.factor}). [Method: Average-data Scope 3.7]`,
            date: commute.month,
        });

        // Transit commuters
        const transitKm = totalKm * commute.public_transit_percentage;
        const transitFactor = EMISSION_FACTORS.commute['Public Transit'];
        entries.push({
            id: `${commute.id}-transit`,
            scope: 3,
            category: 'Employee Commute',
            source: 'Public transit commute (aggregated)',
            activity_data: Math.round(transitKm),
            activity_unit: 'km',
            emission_factor: transitFactor.factor,
            co2e_kg: Math.round(transitKm * transitFactor.factor * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: lineage,
            formula: `CO2e = Aggregated Distance (${Math.round(transitKm)}km) × Transit Factor (${transitFactor.factor}). [Method: Average-data Scope 3.7]`,
            date: commute.month,
        });

        return entries;
    }

    calculateMaterialEmission(po) {
        const material = po.material;
        const factors = EMISSION_FACTORS.materials[material] || EMISSION_FACTORS.materials['Default'];
        const co2e_kg = po.weight_tons * factors.factor;
        const confidence = this._getConfidence(po.data_source);

        return {
            id: po.id,
            scope: 3,
            category: 'Purchased Goods',
            source: `${material} from ${po.supplier} (${po.origin_country})`,
            activity_data: po.weight_tons,
            activity_unit: 'ton',
            emission_factor: factors.factor,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: po, timestamp: new Date().toISOString() }),
            formula: `CO2e = Mass (${po.weight_tons}t) × Cradle-to-Gate Factor (${factors.factor}). [Method: Spend-based alternate Scope 3.1]`,
            date: po.date,
        };
    }

    calculateWasteEmission(waste) {
        const factors = EMISSION_FACTORS.waste[waste.type] || EMISSION_FACTORS.waste['Landfill'];
        const co2e_kg = waste.weight_tons * factors.factor;
        const confidence = this._getConfidence(waste.data_source);

        return {
            id: waste.id,
            scope: 3,
            category: 'Waste Disposal',
            source: `${waste.type} - ${waste.facility}`,
            activity_data: waste.weight_tons,
            activity_unit: 'ton',
            emission_factor: factors.factor,
            co2e_kg: Math.round(co2e_kg * 100) / 100,
            confidence_score: confidence,
            raw_lineage_snapshot: JSON.stringify({ raw: waste, timestamp: new Date().toISOString() }),
            formula: `CO2e = Waste Mass (${waste.weight_tons}t) × Disposal Factor (${factors.factor}). [Method: Waste-type specific Scope 3.5]`,
            date: waste.month,
        };
    }

    _getConfidence(source) {
        if (!source) return 60;
        if (source.includes('mcp') || source.includes('api')) return 95;
        if (source.includes('csv')) return 80;
        return 60; // Manual
    }

    // ─── Aggregation Helpers ─────────────────────────────────────────
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
