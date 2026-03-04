import { db } from '../db/database.js';
import { mcpManager } from '../services/mcpClient.js';

export async function seedFromMCP() {
    const stats = await db.getActivityStats();
    if (stats.totalRecords > 0) {
        console.log(`ℹ️  Database already has ${stats.totalRecords} records, skipping seed.`);
        return;
    }

    console.log('🌱 Seeding database from MCP servers...');

    const activityData = await mcpManager.fetchAllActivityData();
    const records = [];

    for (const log of activityData.fuelLogs) {
        records.push({
            external_id: log.id,
            date: log.date,
            scope: 1,
            category: 'Fuel Combustion',
            source_type: log.type,
            description: `${log.type} - ${log.vehicle || log.facility}`,
            quantity: log.quantity_liters || log.quantity_therms || log.quantity_gallons || 0,
            unit: log.quantity_liters ? 'liters' : log.quantity_therms ? 'therms' : 'gallons',
            facility: log.facility || log.vehicle,
            department: log.department,
            data_source: 'mcp-erp',
        });
    }

    for (const bill of activityData.utilityBills) {
        records.push({
            external_id: bill.id,
            date: bill.month + '-01',
            scope: 2,
            category: bill.type === 'Electricity' ? 'Purchased Electricity' : 'Purchased Steam',
            source_type: bill.type,
            description: `${bill.type} - ${bill.facility} (${bill.provider})`,
            quantity: bill.kwh || bill.pounds || 0,
            unit: bill.kwh ? 'kWh' : 'pounds',
            facility: bill.facility,
            data_source: 'mcp-erp',
        });
    }

    for (const po of activityData.purchaseOrders) {
        records.push({
            external_id: po.id,
            date: po.date,
            scope: 3,
            category: 'Purchased Goods',
            source_type: po.material,
            description: `${po.material} from ${po.supplier} (${po.origin_country})`,
            quantity: po.weight_tons,
            unit: 'tons',
            supplier: po.supplier,
            origin: po.origin_country,
            data_source: 'mcp-erp',
        });
    }

    for (const sm of activityData.shippingManifests) {
        records.push({
            external_id: sm.id,
            date: sm.date,
            scope: 3,
            category: 'Downstream Transport',
            source_type: sm.mode,
            description: `${sm.mode} - ${sm.origin} → ${sm.destination}`,
            quantity: sm.weight_tons * sm.distance_km,
            unit: 'ton-km',
            origin: sm.origin,
            destination: sm.destination,
            transport_mode: sm.mode,
            data_source: 'mcp-crm',
        });
    }

    for (const bt of activityData.businessTravel) {
        records.push({
            external_id: bt.id,
            date: bt.date,
            scope: 3,
            category: 'Business Travel',
            source_type: bt.mode,
            description: `${bt.mode} - ${bt.origin} → ${bt.destination} (${bt.employee})`,
            quantity: bt.distance_km,
            unit: 'passenger-km',
            origin: bt.origin,
            destination: bt.destination,
            transport_mode: bt.mode,
            data_source: 'mcp-crm',
        });
    }

    for (const ec of activityData.employeeCommute) {
        const workDays = 22;
        const totalKm = ec.total_employees * ec.avg_commute_km * 2 * workDays;

        records.push({
            external_id: ec.id + '-car',
            date: ec.month + '-01',
            scope: 3,
            category: 'Employee Commute',
            source_type: 'Car',
            description: 'Car commute (aggregated)',
            quantity: Math.round(totalKm * ec.car_percentage),
            unit: 'km',
            data_source: 'mcp-crm',
        });

        records.push({
            external_id: ec.id + '-transit',
            date: ec.month + '-01',
            scope: 3,
            category: 'Employee Commute',
            source_type: 'Public Transit',
            description: 'Public transit commute (aggregated)',
            quantity: Math.round(totalKm * ec.public_transit_percentage),
            unit: 'km',
            data_source: 'mcp-crm',
        });
    }

    for (const wr of activityData.wasteRecords) {
        records.push({
            external_id: wr.id,
            date: wr.month + '-01',
            scope: 3,
            category: 'Waste Disposal',
            source_type: wr.type,
            description: `${wr.type} - ${wr.facility}`,
            quantity: wr.weight_tons,
            unit: 'tons',
            facility: wr.facility,
            data_source: 'mcp-crm',
        });
    }

    const count = await db.insertActivitiesBatch(records);
    console.log(`✅ Seeded ${count} activity records from MCP servers`);
}
