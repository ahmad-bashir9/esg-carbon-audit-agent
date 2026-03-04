import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * MCP Client Manager
 * Manages connections to the simulated ERP and CRM MCP servers.
 */
class McpClientManager {
    constructor() {
        this.erpClient = null;
        this.crmClient = null;
    }

    async connectERP() {
        if (this.erpClient) return this.erpClient;

        const transport = new StdioClientTransport({
            command: 'node',
            args: [resolve(__dirname, '../../../mcp-servers/erp/index.js')],
        });

        this.erpClient = new Client({ name: 'backend-erp-client', version: '1.0.0' });
        await this.erpClient.connect(transport);
        console.log('✅ Connected to ERP MCP Server');
        return this.erpClient;
    }

    async connectCRM() {
        if (this.crmClient) return this.crmClient;

        const transport = new StdioClientTransport({
            command: 'node',
            args: [resolve(__dirname, '../../../mcp-servers/crm/index.js')],
        });

        this.crmClient = new Client({ name: 'backend-crm-client', version: '1.0.0' });
        await this.crmClient.connect(transport);
        console.log('✅ Connected to CRM MCP Server');
        return this.crmClient;
    }

    async connectAll() {
        await Promise.all([this.connectERP(), this.connectCRM()]);
        console.log('✅ All MCP connections established');
    }

    async callTool(server, toolName, args = {}) {
        const client = server === 'erp' ? this.erpClient : this.crmClient;
        if (!client) throw new Error(`MCP Client for ${server} is not connected`);

        const result = await client.callTool({ name: toolName, arguments: args });
        const textContent = result.content.find(c => c.type === 'text');
        return textContent ? JSON.parse(textContent.text) : [];
    }

    async fetchAllActivityData(month) {
        const args = month ? { month } : {};

        const [fuelLogs, utilityBills, purchaseOrders, shippingManifests, businessTravel, employeeCommute, wasteRecords] =
            await Promise.all([
                this.callTool('erp', 'get_fuel_logs', args),
                this.callTool('erp', 'get_utility_bills', args),
                this.callTool('erp', 'get_purchase_orders', args),
                this.callTool('crm', 'get_shipping_manifests', args),
                this.callTool('crm', 'get_business_travel', args),
                this.callTool('crm', 'get_employee_commute', args),
                this.callTool('crm', 'get_waste_records', args),
            ]);

        return { fuelLogs, utilityBills, purchaseOrders, shippingManifests, businessTravel, employeeCommute, wasteRecords };
    }

    async disconnect() {
        if (this.erpClient) await this.erpClient.close();
        if (this.crmClient) await this.crmClient.close();
        console.log('🔌 MCP connections closed');
    }
}

export const mcpManager = new McpClientManager();
