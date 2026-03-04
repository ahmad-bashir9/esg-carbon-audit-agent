import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Simulated HubSpot CRM Data ──────────────────────────────────────
const shippingManifests = [
    { id: 'SM-001', date: '2026-02-01', origin: 'Chicago, IL', destination: 'New York, NY', distance_km: 1270, weight_tons: 12, mode: 'Road Freight', carrier: 'FastLogistics', scope: 3 },
    { id: 'SM-002', date: '2026-02-03', origin: 'Los Angeles, CA', destination: 'Seattle, WA', distance_km: 1830, weight_tons: 8, mode: 'Road Freight', carrier: 'WestHaul', scope: 3 },
    { id: 'SM-003', date: '2026-02-06', origin: 'Shanghai, CN', destination: 'Long Beach, CA', distance_km: 10500, weight_tons: 150, mode: 'Ocean Freight', carrier: 'MaerskLine', scope: 3 },
    { id: 'SM-004', date: '2026-02-10', origin: 'Chicago, IL', destination: 'London, UK', distance_km: 6350, weight_tons: 5, mode: 'Air Freight', carrier: 'AirCargo Intl', scope: 3 },
    { id: 'SM-005', date: '2026-02-14', origin: 'Dallas, TX', destination: 'Miami, FL', distance_km: 2060, weight_tons: 20, mode: 'Rail Freight', carrier: 'UnionPacific', scope: 3 },
    { id: 'SM-006', date: '2026-02-18', origin: 'Hamburg, DE', destination: 'New York, NY', distance_km: 6200, weight_tons: 90, mode: 'Ocean Freight', carrier: 'HapagLloyd', scope: 3 },
    { id: 'SM-007', date: '2026-02-22', origin: 'Chicago, IL', destination: 'Houston, TX', distance_km: 1740, weight_tons: 15, mode: 'Road Freight', carrier: 'FastLogistics', scope: 3 },
];

const businessTravel = [
    { id: 'BT-001', date: '2026-02-02', employee: 'J. Smith', origin: 'New York, NY', destination: 'London, UK', distance_km: 5570, mode: 'Flight (Economy)', purpose: 'Client Meeting', scope: 3 },
    { id: 'BT-002', date: '2026-02-05', employee: 'A. Chen', origin: 'San Francisco, CA', destination: 'Tokyo, JP', distance_km: 8280, mode: 'Flight (Business)', purpose: 'Conference', scope: 3 },
    { id: 'BT-003', date: '2026-02-09', employee: 'M. Johnson', origin: 'Chicago, IL', destination: 'Denver, CO', distance_km: 1475, mode: 'Flight (Economy)', purpose: 'Site Inspection', scope: 3 },
    { id: 'BT-004', date: '2026-02-12', employee: 'S. Patel', origin: 'Dallas, TX', destination: 'New York, NY', distance_km: 2205, mode: 'Flight (Economy)', purpose: 'Sales Pitch', scope: 3 },
    { id: 'BT-005', date: '2026-02-15', employee: 'L. Martinez', origin: 'London, UK', destination: 'Dubai, AE', distance_km: 5480, mode: 'Flight (Business)', purpose: 'Partnership Review', scope: 3 },
    { id: 'BT-006', date: '2026-02-20', employee: 'J. Smith', origin: 'New York, NY', destination: 'Chicago, IL', distance_km: 1150, mode: 'Train', purpose: 'Team Offsite', scope: 3 },
];

const employeeCommute = [
    { id: 'EC-001', month: '2026-02', total_employees: 450, avg_commute_km: 35, car_percentage: 0.65, public_transit_percentage: 0.25, wfh_percentage: 0.10, scope: 3 },
];

const wasteRecords = [
    { id: 'WR-001', month: '2026-02', type: 'Landfill', weight_tons: 18, facility: 'HQ Office', scope: 3 },
    { id: 'WR-002', month: '2026-02', type: 'Recycled', weight_tons: 12, facility: 'HQ Office', scope: 3 },
    { id: 'WR-003', month: '2026-02', type: 'Landfill', weight_tons: 45, facility: 'Plant 1', scope: 3 },
    { id: 'WR-004', month: '2026-02', type: 'Hazardous', weight_tons: 3, facility: 'Plant 1', scope: 3 },
    { id: 'WR-005', month: '2026-02', type: 'Recycled', weight_tons: 30, facility: 'Plant 1', scope: 3 },
];

// ── MCP Server Setup ────────────────────────────────────────────────
const server = new McpServer({
    name: 'HubSpot-CRM-Simulator',
    version: '1.0.0',
});

server.tool('get_shipping_manifests', 'Retrieve outbound shipping and distribution manifests', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = shippingManifests;
    if (month) data = data.filter(s => s.date.startsWith(month));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_business_travel', 'Retrieve employee business travel records', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = businessTravel;
    if (month) data = data.filter(t => t.date.startsWith(month));
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_employee_commute', 'Retrieve aggregated employee commute data', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = employeeCommute;
    if (month) data = data.filter(c => c.month === month);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

server.tool('get_waste_records', 'Retrieve waste disposal and recycling records', {
    month: z.string().optional().describe('Optional month filter (YYYY-MM)'),
}, async ({ month }) => {
    let data = wasteRecords;
    if (month) data = data.filter(w => w.month === month);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});

// ── Start ───────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('HubSpot CRM MCP Server running on stdio');
