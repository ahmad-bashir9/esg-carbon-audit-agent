import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { db } from './db/database.js';
import { mcpManager } from './services/mcpClient.js';
import { geminiService } from './services/geminiService.js';
import { seedFromMCP } from './db/seed.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Startup ─────────────────────────────────────────────────────────
async function start() {
    try {
        // 1. Connect database
        console.log('📦 Initializing database...');
        await db.connect();

        // 2. Initialize Gemini AI (graceful degradation without key)
        console.log('🤖 Initializing Gemini AI...');
        await geminiService.initialize();

        // 3. Connect MCP servers
        console.log('🔌 Connecting to MCP servers...');
        await mcpManager.connectAll();

        // 4. Seed database from MCP if empty
        await seedFromMCP();

        // 5. Start scheduled jobs
        cron.schedule('0 */6 * * *', async () => {
            console.log('[CRON] Running scheduled MCP sync...');
            try {
                const res = await fetch(`http://localhost:${PORT}/api/integrations/sync-now`, { method: 'POST' });
                const json = await res.json();
                console.log('[CRON] MCP sync complete:', json.data?.length || 0, 'tools synced');
            } catch (err) {
                console.warn('[CRON] MCP sync failed:', err.message);
            }
        });

        cron.schedule('0 8 * * *', async () => {
            console.log('[CRON] Checking scheduled reports...');
            try {
                const due = await db.getDueSchedules();
                for (const schedule of due) {
                    console.log(`[CRON] Generating scheduled report: ${schedule.name}`);
                    const nextRun = new Date();
                    switch (schedule.frequency) {
                        case 'daily': nextRun.setDate(nextRun.getDate() + 1); break;
                        case 'weekly': nextRun.setDate(nextRun.getDate() + 7); break;
                        case 'monthly': nextRun.setMonth(nextRun.getMonth() + 1); break;
                    }
                    await db.updateReportSchedule(schedule.id, {
                        last_run: new Date().toISOString(),
                        next_run: nextRun.toISOString(),
                    });
                }
            } catch (err) {
                console.warn('[CRON] Scheduled reports failed:', err.message);
            }
        });

        app.listen(PORT, () => {
            console.log(`\n========================================================`);
            console.log(`🚀 BACKEND ONLINE (Port ${PORT})`);
            console.log(`🤖 Gemini AI: ${geminiService.enabled ? 'ENABLED' : 'DISABLED (set GEMINI_API_KEY in .env)'}`);
            console.log(`⏰ Cron: MCP sync (6h), Report scheduler (8am daily)`);
            console.log(`========================================================\n`);
            console.log(`✅ Backend API is running silently.`);
            console.log(`\n👉 PLEASE OPEN THE FRONTEND APP IN YOUR BROWSER:`);
            console.log(`   🌐 http://localhost:5173/`);
            console.log(`\n(Do not click the raw /api/ links from the console, as they return raw JSON data)`);
        });
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

start();

async function shutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    try {
        await db.close();
        console.log('Database closed.');
    } catch (err) {
        console.error('Error during shutdown:', err);
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
