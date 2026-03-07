import express from 'express';
import cors from 'cors';
import { db } from './db/database.js';
import { mcpManager } from './services/mcpClient.js';
import { geminiService } from './services/geminiService.js';
import { seedFromMCP } from './db/seed.js';
import apiRoutes from './routes/api.js';

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.VERCEL) {
            cb(null, true);
        } else {
            cb(null, true);
        }
    },
    credentials: true,
}));
app.use(express.json());

app.use('/api', apiRoutes);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

let _initialized = false;

export async function initializeApp() {
    if (_initialized) return app;

    await db.connect();

    await geminiService.initialize();

    if (!process.env.VERCEL) {
        try {
            await mcpManager.connectAll();
        } catch (err) {
            console.warn('MCP connection failed (non-critical):', err.message);
        }
    }

    await seedFromMCP();
    _initialized = true;
    return app;
}

export default app;
