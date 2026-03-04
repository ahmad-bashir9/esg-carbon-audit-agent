import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Simulated SAP ERP Data ──────────────────────────────────────────
const fuelLogs = [
    { id: 'FL-001', date: '2026-02-01', type: 'Diesel', quantity_liters: 1200, department: 'Logistics', vehicle: 'Fleet Truck A', scope: 1 },
    { id: 'FL-002', date: '2026-02-03', type: 'Gasoline', quantity_liters: 450, department: 'Sales', vehicle: 'Company Car B', scope: 1 },
    { id: 'FL-003', date: '2026-02-05', type: 'Natural Gas', quantity_therms: 3200, department: 'Manufacturing', facility: 'Plant 1', scope: 1 },
    { id: 'FL-004', date: '2026-02-10', type: 'Diesel', quantity_liters: 980, department: 'Logistics', vehicle: 'Fleet Truck C', scope: 1 },
    { id: 'FL-005', date: '2026-02-14', type: 'Propane', quantity_gallons: 600, department: 'Facilities', facility: 'Warehouse', scope: 1 },
    { id: 'FL-006', date: '2026-02-18', type: 'Diesel', quantity_liters: 2500, department: 'Logistics', vehicle: 'Fleet Truck A', scope: 1 },
    { id: 'FL-007', date: '2026-02-22', type: 'Gasoline', quantity_liters: 320, department: 'Sales', vehicle: 'Company Car D', scope: 1 },
    { id: 'FL-008', date: '2026-02-25', type: 'Natural Gas', quantity_therms: 2800, department: 'Manufacturing', facility: 'Plant 2', scope: 1 },
];

const utilityBills = [
    { id: 'UB-001', month: '2026-01', type: 'Electricity', kwh: 125000, cost_usd: 15000, facility: 'HQ Office', provider: 'GridCo', scope: 2 },
    { id: 'UB-002', month: '2026-01', type: 'Electricity', kwh: 340000, cost_usd: 37400, facility: 'Plant 1', provider: 'GridCo', scope: 2 },
    { id: 'UB-003', month: '2026-01', type: 'Steam', pounds: 50000, cost_usd: 8500, facility: 'Plant 1', provider: 'SteamWorks', scope: 2 },
    { id: 'UB-004', month: '2026-02', type: 'Electricity', kwh: 132000, cost_usd: 15840, facility: 'HQ Office', provider: 'GridCo', scope: 2 },
    { id: 'UB-005', month: '2026-02', type: 'Electricity', kwh: 355000, cost_usd: 39050, facility: 'Plant 1', provider: 'GridCo', scope: 2 },
    { id: 'UB-006', month: '2026-02', type: 'Electricity', kwh: 89000, cost_usd: 9790, facility: 'Warehouse', provider: 'GridCo', scope: 2 },
    { id: 'UB-007', month: '2026-02', type: 'Steam', pounds: 55000, cost_usd: 9350, facility: 'Plant 1', provider: 'SteamWorks', scope: 2 },
];

const purchaseOrders = [
    { id: 'PO-001', date: '2026-02-02', supplier: 'SteelCorp', material: 'Raw Steel', weight_tons: 150, origin_country: 'China', scope: 3 },
    { id: 'PO-002', date: '2026-02-08', supplier: 'PlastiMax', material: 'Polymer Resin', weight_tons: 45, origin_country: 'Germany', scope: 3 },
    { id: 'PO-003', date: '2026-02-12', supplier: 'PackagePro', material: 'Cardboard Packaging', weight_tons: 20, origin_country: 'USA', scope: 3 },
    { id: 'PO-004', date: '2026-02-15', supplier: 'ChemSynth', material: 'Industrial Solvents', weight_tons: 8, origin_country: 'India', scope: 3 },
    { id: 'PO-005', date: '2026-02-20', supplier: 'SteelCorp', material: 'Raw Steel', weight_tons: 200, origin_country: 'China', scope: 3 },
];

// ── MCP Server Setup ────────────────────────────────────────────────
const server = new McpServer({
    name: 'SAP-ERP-Simulator',
    version: '1.0.0',
});

server.tool('get_fuel_logs', 'Retrieve fuel consumption logs from the fleet and facilities', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = fuelLogs;
    if (month) data = data.filter(l => l.date.startsWith(month));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_utility_bills', 'Retrieve utility bills (electricity, steam, etc.)', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = utilityBills;
    if (month) data = data.filter(b => b.month === month);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_purchase_orders', 'Retrieve raw material purchase orders for Scope 3 upstream analysis', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = purchaseOrders;
    if (month) data = data.filter(p => p.date.startsWith(month));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

// ── Start ───────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('SAP ERP MCP Server running on stdio');
