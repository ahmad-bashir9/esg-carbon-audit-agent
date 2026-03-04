import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { readFileSync, unlinkSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { mcpManager } from '../services/mcpClient.js';
import { emissionEngine } from '../services/emissionEngine.js';
import { auditorAgent } from '../agents/auditorAgent.js';
import { reportGenerator } from '../services/reportGenerator.js';
import { geminiService } from '../services/geminiService.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/dashboard', async (req, res) => {
    try {
        const { startDate, endDate, department, facility } = req.query;

        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (department) filters.department = department;
        if (facility) filters.facility = facility;

        const activities = await db.getActivities(filters);

        const activityData = _dbToEngineFormat(activities);
        const emissions = emissionEngine.calculateAll(activityData);

        const newAlerts = await auditorAgent.analyze(emissions);

        await _storeEmissions(emissions);

        res.json({
            success: true,
            data: {
                totals: emissions.totals,
                byCategory: emissions.byCategory,
                byFacility: emissions.byFacility,
                byDepartment: emissions.byDepartment,
                scope1: emissions.scope1,
                scope2: emissions.scope2,
                scope3: emissions.scope3,
                timestamp: emissions.timestamp,
                newAlerts,
                recordCount: activities.length,
            },
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI INSIGHTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/insights', async (req, res) => {
    try {
        const activities = await db.getActivities({});
        const activityData = _dbToEngineFormat(activities);
        const emissions = emissionEngine.calculateAll(activityData);
        const insights = await geminiService.generateInsights(emissions);

        res.json({ success: true, data: insights, aiEnabled: geminiService.enabled });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTIVITY DATA CRUD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/data/activities', async (req, res) => {
    try {
        const { scope, category, facility, department, startDate, endDate, source, limit } = req.query;
        const filters = {};
        if (scope) filters.scope = parseInt(scope);
        if (category) filters.category = category;
        if (facility) filters.facility = facility;
        if (department) filters.department = department;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (source) filters.data_source = source;
        if (limit) filters.limit = parseInt(limit);

        const activities = await db.getActivities(filters);
        const stats = await db.getActivityStats();

        res.json({ success: true, data: activities, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/data/activities/:id', async (req, res) => {
    try {
        const activity = await db.getActivity(parseInt(req.params.id));
        if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
        res.json({ success: true, data: activity });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/data/activities', async (req, res) => {
    try {
        await db.insertActivity(req.body);
        res.json({ success: true, id: req.body.external_id || 'manual' });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/data/activities/:id', async (req, res) => {
    try {
        const result = await db.updateActivity(parseInt(req.params.id), req.body);
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.delete('/data/activities/:id', async (req, res) => {
    try {
        const result = await db.deleteActivity(parseInt(req.params.id));
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSV UPLOAD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/data/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

        const fileContent = readFileSync(req.file.path, 'utf-8');
        unlinkSync(req.file.path);

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        if (records.length === 0) {
            return res.status(400).json({ success: false, error: 'CSV file is empty' });
        }

        const mapped = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            try {
                const activity = {
                    external_id: row.id || row.external_id || null,
                    date: row.date || row.Date || row.DATE,
                    scope: parseInt(row.scope || row.Scope || row.SCOPE),
                    category: row.category || row.Category || row.CATEGORY,
                    source_type: row.source_type || row.type || row.Type || row.source || 'Unknown',
                    description: row.description || row.Description || row.desc || '',
                    quantity: parseFloat(row.quantity || row.Quantity || row.amount || row.Amount || 0),
                    unit: row.unit || row.Unit || row.UNIT || 'unknown',
                    facility: row.facility || row.Facility || null,
                    department: row.department || row.Department || null,
                    supplier: row.supplier || row.Supplier || null,
                    origin: row.origin || row.Origin || null,
                    destination: row.destination || row.Destination || null,
                    transport_mode: row.transport_mode || row.mode || row.Mode || null,
                    data_source: 'csv-upload',
                };

                if (!activity.date || !activity.scope || !activity.category || !activity.quantity) {
                    errors.push({ row: i + 2, error: 'Missing required field (date, scope, category, or quantity)' });
                    continue;
                }

                if (activity.description && (!activity.source_type || activity.source_type === 'Unknown')) {
                    const match = await geminiService.matchEmissionFactor(activity.description, activity.scope);
                    activity.source_type = match.type;
                }

                mapped.push(activity);
            } catch (err) {
                errors.push({ row: i + 2, error: err.message });
            }
        }

        const count = mapped.length > 0 ? await db.insertActivitiesBatch(mapped) : 0;

        res.json({
            success: true,
            imported: count,
            errors: errors.length,
            errorDetails: errors.slice(0, 10),
            totalRows: records.length,
        });
    } catch (error) {
        console.error('CSV upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/data/stats', async (req, res) => {
    try {
        const stats = await db.getActivityStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/alerts', async (req, res) => {
    try {
        const severity = req.query.severity || undefined;
        const alerts = await auditorAgent.getAlerts({
            severity,
            unacknowledgedOnly: req.query.unresolved === 'true',
        });
        const status = await auditorAgent.getStatus();
        res.json({ success: true, data: alerts, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/alerts/:id/acknowledge', async (req, res) => {
    try {
        const result = await auditorAgent.acknowledgeAlert(req.params.id);
        res.json({ success: true, changes: result?.changes || 0 });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/audit/simulate-anomaly', async (req, res) => {
    try {
        const { scope = 'scope1', multiplier = 1.5 } = req.body || {};
        const alerts = await auditorAgent.injectAnomaly(scope, multiplier);
        const status = await auditorAgent.getStatus();
        res.json({ success: true, alerts, status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/settings', async (req, res) => {
    try {
        const settings = await db.getAllSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        for (const [key, value] of Object.entries(req.body)) {
            await db.setSetting(key, value);
        }
        const settings = await db.getAllSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/report', async (req, res) => {
    try {
        const activities = await db.getActivities({});
        const activityData = _dbToEngineFormat(activities);
        const emissions = emissionEngine.calculateAll(activityData);

        const compSetting = await db.getSetting('company_name');
        const company = req.query.company || compSetting || 'Acme Corporation';
        const period = req.query.period || new Date().toISOString().slice(0, 7);
        const framework = req.query.framework || 'CSRD & SEC';

        const pdfBuffer = await reportGenerator.generateReport(emissions, {
            companyName: company,
            reportingPeriod: period,
            framework,
        });

        await db.insertReport({
            company_name: company,
            reporting_period: period,
            framework,
            total_co2e: emissions.totals.total,
            scope1_co2e: emissions.totals.scope1,
            scope2_co2e: emissions.totals.scope2,
            scope3_co2e: emissions.totals.scope3,
            filename: `ESG_Report_${Date.now()}.pdf`,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ESG_Report_${company.replace(/\s+/g, '_')}_${period}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/reports/history', async (req, res) => {
    try {
        const reports = await db.getReports();
        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EMISSION FACTORS & STATUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/emission-factors', async (req, res) => {
    const module = await import('../utils/emissionFactors.js');
    res.json({ success: true, data: module.EMISSION_FACTORS });
});

router.get('/status', async (req, res) => {
    const [agent, dbStats] = await Promise.all([
        auditorAgent.getStatus(),
        db.getActivityStats()
    ]);

    res.json({
        success: true,
        agent,
        ai: geminiService.getStatus(),
        mcpConnected: !!(mcpManager.erpClient && mcpManager.crmClient),
        database: dbStats,
        uptime: process.uptime(),
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILTER OPTIONS (for dashboard dropdowns)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get('/filters', async (req, res) => {
    try {
        const activities = await db.getActivities({});
        const departments = [...new Set(activities.map(a => a.department).filter(Boolean))];
        const facilities = [...new Set(activities.map(a => a.facility).filter(Boolean))];
        const categories = [...new Set(activities.map(a => a.category).filter(Boolean))];
        const dbStats = await db.getActivityStats();

        res.json({
            success: true,
            data: { departments, facilities, categories, dateRange: dbStats.dateRange },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECARBONIZATION SIMULATOR (Phase 5)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.post('/simulator/predict', async (req, res) => {
    const { params, baseline } = req.body;

    try {
        let reductionPercent = 0;
        let costImpact = 'neutral';
        let costMagnitude = '$0';
        let analysis = '';
        let tags = [];
        let riskScore = 30;
        let riskDetail = 'Low implementation risk.';

        // Scientific Fallback Logic
        const s1Base = baseline.scope1 || 0;
        const s2Base = baseline.scope2 || 0;
        const s3Base = baseline.scope3 || 0;

        const s1Reduction = (s1Base * (params.evTransition / 100)) * 0.95; // EV vs Diesel factor
        const s2Reduction = (s2Base * (params.renewables / 100)); // Direct swap
        const s3ReductionCommute = (s3Base * 0.12 * (params.remoteWork / 100)); // Commute avg 12% of S3
        const s3ReductionLogistics = (s3Base * 0.25 * (params.supplyChainRail / 100)) * 0.35; // Rail shift avg saving

        const totalReduction = s1Reduction + s2Reduction + s3ReductionCommute + s3ReductionLogistics;
        reductionPercent = (totalReduction / (baseline.total || 1)) * 100;
        const newTotal = baseline.total - totalReduction;

        // ROI Modeling
        const annualOpacity = (params.renewables * 0.08) + (params.evTransition * 0.12);
        if (annualOpacity > 5) {
            costImpact = 'saving';
            costMagnitude = `$${Math.round(totalReduction * 0.14).toLocaleString()} / yr`;
            analysis = `The proposed strategy prioritizes high-impact Scope 1 & 2 reductions. Operational efficiency gains from ${params.renewables}% renewable energy mix and fleet electrification are projected to yield significant utility savings, estimated at ${costMagnitude} annually.`;
            tags = ['High ROI', 'SBTi Aligned', 'Operational Excellence'];
        } else {
            costImpact = 'investment';
            costMagnitude = `$${Math.round(totalReduction * 0.08).toLocaleString()} CapEx`;
            analysis = "Proposed shifts are currently incremental. We recommend increasing the Renewable Energy mix to >40% to achieve the critical mass required for a 'saving' cost impact profile.";
            tags = ['Incremental', 'Low Risk'];
        }

        if (params.supplyChainRail > 60 || params.evTransition > 70) {
            riskScore = 75;
            riskDetail = "Significant logistical reorganization required. Potential supply chain disruption and high initial CapEx for fleet replacement.";
        }

        // Gemini AI Enhancement
        if (geminiService.enabled) {
            try {
                const aiResult = await geminiService.analyzeStrategy(params, baseline);
                if (aiResult) {
                    analysis = aiResult.analysis;
                    tags = aiResult.tags;
                    riskScore = aiResult.riskScore;
                    riskDetail = aiResult.riskDetail || riskDetail;
                }
            } catch (e) {
                console.warn('Simulator AI enhancement failed', e);
            }
        }

        res.json({
            success: true,
            data: {
                newTotal,
                reductionPercent,
                costImpact,
                costMagnitude,
                analysis,
                tags,
                riskScore,
                riskDetail
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTHENTICATION & PROFILES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-carbonlens-key';

router.post('/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await db.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const id = 'usr_' + Date.now();
        await db.createUser({ id, name, email, password_hash });

        const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id, name, email } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/profile', async (req, res) => {
    try {
        const profile = await db.getCompanyProfile();
        res.json({ success: true, data: profile });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/profile', async (req, res) => {
    try {
        await db.updateCompanyProfile(req.body);
        const profile = await db.getCompanyProfile();
        res.json({ success: true, data: profile });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _dbToEngineFormat(activities) {
    const data = {
        fuelLogs: [],
        utilityBills: [],
        purchaseOrders: [],
        shippingManifests: [],
        businessTravel: [],
        employeeCommute: [],
        wasteRecords: [],
    };

    for (const a of activities) {
        switch (a.category) {
            case 'Fuel Combustion':
                data.fuelLogs.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    type: a.source_type,
                    quantity_liters: a.unit === 'liters' ? a.quantity : undefined,
                    quantity_therms: a.unit === 'therms' ? a.quantity : undefined,
                    quantity_gallons: a.unit === 'gallons' ? a.quantity : undefined,
                    department: a.department,
                    vehicle: a.facility,
                    facility: a.facility,
                    data_source: a.data_source,
                    scope: 1,
                });
                break;
            case 'Purchased Electricity':
                data.utilityBills.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: 'Electricity',
                    kwh: a.quantity,
                    facility: a.facility,
                    provider: 'GridCo',
                    data_source: a.data_source,
                    scope: 2,
                });
                break;
            case 'Purchased Steam':
                data.utilityBills.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: 'Steam',
                    pounds: a.quantity,
                    facility: a.facility,
                    provider: 'SteamWorks',
                    data_source: a.data_source,
                    scope: 2,
                });
                break;
            case 'Purchased Goods':
                data.purchaseOrders.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    supplier: a.supplier || 'Unknown',
                    material: a.source_type,
                    weight_tons: a.quantity,
                    origin_country: a.origin || 'Unknown',
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Downstream Transport':
                data.shippingManifests.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    origin: a.origin || '',
                    destination: a.destination || '',
                    distance_km: 1,
                    weight_tons: a.quantity,
                    mode: a.transport_mode || a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Business Travel':
                data.businessTravel.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    employee: 'Employee',
                    origin: a.origin || '',
                    destination: a.destination || '',
                    distance_km: a.quantity,
                    mode: a.transport_mode || a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Employee Commute':
                data.businessTravel.push({
                    id: a.external_id || `DB-${a.id}`,
                    date: a.date,
                    employee: 'Aggregated',
                    origin: 'Home',
                    destination: 'Office',
                    distance_km: a.quantity,
                    mode: a.source_type,
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
            case 'Waste Disposal':
                data.wasteRecords.push({
                    id: a.external_id || `DB-${a.id}`,
                    month: a.date.slice(0, 7),
                    type: a.source_type,
                    weight_tons: a.quantity,
                    facility: a.facility || 'Unknown',
                    data_source: a.data_source,
                    scope: 3,
                });
                break;
        }
    }

    return data;
}

async function _storeEmissions(emissions) {
    try {
        await db.clearEmissions();
        for (const entry of [...emissions.scope1, ...emissions.scope2, ...emissions.scope3]) {
            await db.insertEmission({
                activity_id: null,
                scope: entry.scope,
                category: entry.category,
                source_description: entry.source,
                activity_data: entry.activity_data,
                activity_unit: entry.activity_unit,
                emission_factor: entry.emission_factor,
                emission_factor_source: 'GHG Protocol',
                co2e_kg: entry.co2e_kg,
                calculation_method: 'deterministic',
                date: entry.date,
                facility: entry.facility || null,
                department: entry.department || null,
            });
        }
    } catch (err) {
        console.warn('Failed to store emissions:', err.message);
    }
}

export default router;
