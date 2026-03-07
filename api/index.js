import app, { initializeApp } from '../backend/src/app.js';

let ready = false;

export default async function handler(req, res) {
    if (!ready) {
        try {
            await initializeApp();
            ready = true;
        } catch (err) {
            console.error('Initialization failed:', err);
            return res.status(500).json({
                success: false,
                error: 'Server initialization failed: ' + err.message,
            });
        }
    }

    return app(req, res);
}
