import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
        db.connect();

        // 2. Initialize Gemini AI (graceful degradation without key)
        console.log('🤖 Initializing Gemini AI...');
        await geminiService.initialize();

        // 3. Connect MCP servers
        console.log('🔌 Connecting to MCP servers...');
        await mcpManager.connectAll();

        // 4. Seed database from MCP if empty
        await seedFromMCP();

        app.listen(PORT, () => {
            console.log(`\n========================================================`);
            console.log(`🚀 BACKEND ONLINE (Port ${PORT})`);
            console.log(`🤖 Gemini AI: ${geminiService.enabled ? 'ENABLED' : 'DISABLED (set GEMINI_API_KEY in .env)'}`);
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
