/**
 * Gemini AI Service
 * Provides intelligent emission factor matching, insights, and analysis.
 *
 * STUB MODE: Works without an API key using deterministic fallbacks.
 * Set GEMINI_API_KEY in .env to enable AI features.
 */

import { EMISSION_FACTORS } from '../utils/emissionFactors.js';

class GeminiService {
    constructor() {
        this.client = null;
        this.enabled = false;
    }

    async initialize() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey && apiKey !== 'your-key-here') {
            try {
                const { GoogleGenerativeAI } = await import('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                this.client = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
                this.enabled = true;
                console.log('✅ Gemini AI enabled');
            } catch (err) {
                console.warn('⚠️  Gemini initialization failed, using deterministic mode:', err.message);
            }
        } else {
            console.log('ℹ️  Gemini AI disabled (no API key). Using deterministic emission matching.');
        }
    }

    /**
     * Match an unstructured activity description to the best emission factor.
     * Falls back to keyword matching if Gemini is not available.
     */
    async matchEmissionFactor(description, scope) {
        if (this.enabled && this.client) {
            try {
                const prompt = `You are an ESG carbon audit expert. Given this activity description, identify the most appropriate GHG Protocol emission factor.

Activity: "${description}"
Scope: ${scope}

Available emission factor categories:
${JSON.stringify(EMISSION_FACTORS, null, 2)}

Respond ONLY with a JSON object:
{
  "category": "the category key (e.g., 'fuels', 'electricity', 'transport')",
  "type": "the specific type within that category (e.g., 'Diesel', 'US Average', 'Road Freight')",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (err) {
                console.warn('Gemini factor matching failed, using fallback:', err.message);
            }
        }

        // Deterministic fallback: keyword matching
        return this._keywordMatch(description, scope);
    }

    /**
     * Generate AI insights for the dashboard.
     */
    async generateInsights(emissionData) {
        if (this.enabled && this.client) {
            try {
                const total = emissionData.totals.total || 1;
                const prompt = `You are a sustainability analyst for a corporation. Analyze these emission calculations and provide 3-4 actionable insights.

Total Emissions: ${emissionData.totals.total.toFixed(0)} kg CO₂e
- Scope 1: ${emissionData.totals.scope1.toFixed(0)} kg (${((emissionData.totals.scope1 / total) * 100).toFixed(1)}%)
- Scope 2: ${emissionData.totals.scope2.toFixed(0)} kg (${((emissionData.totals.scope2 / total) * 100).toFixed(1)}%)
- Scope 3: ${emissionData.totals.scope3.toFixed(0)} kg (${((emissionData.totals.scope3 / total) * 100).toFixed(1)}%)

Top Categories: ${JSON.stringify(emissionData.byCategory)}

Respond with a JSON array of insights:
[{ "title": "short title", "description": "1-2 sentence actionable insight", "impact": "high/medium/low", "category": "scope1/scope2/scope3/general" }]`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (err) {
                console.warn('Gemini insights failed, using fallback:', err.message);
            }
        }

        // Deterministic fallback insights
        return this._generateFallbackInsights(emissionData);
    }

    /**
     * Analyze an alert and suggest root causes.
     */
    async analyzeAnomaly(alert, context = {}) {
        if (this.enabled && this.client) {
            try {
                const prompt = `You are a carbon audit specialist. An anomaly was detected in emission monitoring:

Alert: ${alert.message}
Scope: ${alert.scope || alert.category}
Current Value: ${alert.current_value ?? alert.currentValue} kg CO₂e
Baseline: ${alert.baseline_value ?? alert.baselineValue} kg CO₂e
Deviation: ${alert.deviation_percent ?? alert.deviationPercent}%

Provide a brief root cause analysis and 2-3 recommended actions. Respond as JSON:
{
  "root_cause": "most likely explanation",
  "recommendations": ["action 1", "action 2"],
  "risk_level": "high/medium/low"
}`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (err) {
                console.warn('Gemini anomaly analysis failed:', err.message);
            }
        }

        // Deterministic fallback
        return {
            root_cause: alert.type === 'SPIKE'
                ? `Unusual increase in ${alert.scope || alert.category} emissions detected. This may be caused by seasonal demand, new equipment, or data reporting changes.`
                : `Significant decrease in ${alert.scope || alert.category} emissions. This could indicate reduced operations, efficiency improvements, or missing data.`,
            recommendations: [
                'Review the raw activity data for the period to identify the specific source of change.',
                'Compare with the same period last year to determine if this is a seasonal pattern.',
                alert.type === 'SPIKE' ? 'Consider initiating an internal audit on the affected operations.' : 'Verify data completeness to rule out missing entries.',
            ],
            risk_level: Math.abs(alert.deviation_percent ?? alert.deviationPercent ?? 0) > 25 ? 'high' : 'medium',
        };
    }

    async generateSQL(question) {
        if (!this.enabled || !this.client) return null;

        try {
            const prompt = `You are a Postgres SQL expert for a carbon emissions database. Convert the user's natural language question into a single SELECT query.

DATABASE SCHEMA:
- activity_data (id, source, scope, category, quantity, unit, date, facility, department, supplier, origin, destination, transport_mode, data_source, created_at)
- emission_calculations (id, activity_id, scope, category, source_description, activity_data, activity_unit, emission_factor, emission_factor_source, co2e_kg, calculation_method, confidence_score, date, facility, department, created_at)
- reduction_targets (id, name, scope, target_type, baseline_year, baseline_value, target_value, target_year, status, created_at)
- alerts (id, type, scope, category, message, current_value, baseline_value, deviation_percent, acknowledged, created_at)

RULES:
- Only SELECT queries allowed (never INSERT/UPDATE/DELETE/DROP)
- Always LIMIT to 100 rows
- Use co2e_kg column for emissions amounts
- Date format is 'YYYY-MM-DD' string
- Return ONLY the SQL query, nothing else

USER QUESTION: "${question}"`;

            const result = await this.client.generateContent(prompt);
            const text = result.response.text().trim();
            const sqlMatch = text.match(/```sql\n?([\s\S]*?)```/) || text.match(/(SELECT[\s\S]*)/i);
            if (sqlMatch) {
                const sql = (sqlMatch[1] || sqlMatch[0]).trim();
                if (/^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)/i.test(sql)) return null;
                return sql;
            }
        } catch (err) {
            console.warn('Gemini SQL generation failed:', err.message);
        }
        return null;
    }

    async chatWithData(question, context) {
        if (this.enabled && this.client) {
            try {
                const sqlResults = context.sqlResults ? `\n\nSQL QUERY RESULTS (from the actual database):\n${JSON.stringify(context.sqlResults, null, 2)}` : '';

                const prompt = `You are CarbonLens AI, an ESG carbon audit assistant. Answer the user's question based on the following emissions data context.

EMISSIONS CONTEXT:
- Total Emissions: ${context.totals?.total?.toFixed(0) || 0} kg CO2e
- Direct (Scope 1): ${context.totals?.scope1?.toFixed(0) || 0} kg CO2e
- Energy (Scope 2): ${context.totals?.scope2?.toFixed(0) || 0} kg CO2e
- Supply Chain (Scope 3): ${context.totals?.scope3?.toFixed(0) || 0} kg CO2e
- Categories: ${JSON.stringify(context.byCategory || {})}
- Facilities: ${JSON.stringify(context.byFacility || {})}
- Departments: ${JSON.stringify(context.byDepartment || {})}
- Record Count: ${context.recordCount || 0}
- Recent Trends: ${JSON.stringify(context.trends || [])}
- Active Targets: ${JSON.stringify(context.targets || [])}
${sqlResults}

USER QUESTION: "${question}"

Respond in a helpful, concise manner. Use specific numbers from the data. If SQL query results are provided, prioritize those for your answer. Format numbers clearly. Keep your answer under 200 words.`;

                const result = await this.client.generateContent(prompt);
                return { answer: result.response.text(), source: 'gemini', sql: context.sqlQuery || null };
            } catch (err) {
                console.warn('Gemini chat failed, using fallback:', err.message);
            }
        }

        return this._fallbackChat(question, context);
    }

    _fallbackChat(question, context) {
        const q = question.toLowerCase();
        const totals = context.totals || { total: 0, scope1: 0, scope2: 0, scope3: 0 };
        const total = totals.total || 1;

        if (q.includes('total') || q.includes('overall') || q.includes('how much')) {
            return { answer: `Your total emissions are ${Math.round(totals.total).toLocaleString()} kg CO2e. Direct emissions account for ${((totals.scope1/total)*100).toFixed(1)}%, energy emissions ${((totals.scope2/total)*100).toFixed(1)}%, and supply chain ${((totals.scope3/total)*100).toFixed(1)}%.`, source: 'deterministic' };
        }
        if (q.includes('highest') || q.includes('top') || q.includes('biggest') || q.includes('hotspot')) {
            const cats = Object.entries(context.byCategory || {}).sort((a,b) => b[1]-a[1]);
            const top = cats[0];
            return { answer: top ? `The highest emission category is "${top[0]}" at ${Math.round(top[1]).toLocaleString()} kg CO2e (${((top[1]/total)*100).toFixed(1)}% of total).` : 'No category data available.', source: 'deterministic' };
        }
        if (q.includes('facility') || q.includes('location') || q.includes('site')) {
            const facs = Object.entries(context.byFacility || {}).sort((a,b) => b[1]-a[1]);
            const list = facs.slice(0,3).map(([n,v]) => `${n}: ${Math.round(v).toLocaleString()} kg`).join(', ');
            return { answer: list ? `Top facilities by emissions: ${list}.` : 'No facility data available.', source: 'deterministic' };
        }
        if (q.includes('scope 1') || q.includes('direct')) {
            return { answer: `Direct emissions (Scope 1) total ${Math.round(totals.scope1).toLocaleString()} kg CO2e, representing ${((totals.scope1/total)*100).toFixed(1)}% of your carbon footprint. These come from fuel combustion and on-site operations.`, source: 'deterministic' };
        }
        if (q.includes('scope 2') || q.includes('energy') || q.includes('electricity')) {
            return { answer: `Energy emissions (Scope 2) total ${Math.round(totals.scope2).toLocaleString()} kg CO2e, representing ${((totals.scope2/total)*100).toFixed(1)}% of your footprint. Consider renewable energy procurement to reduce this.`, source: 'deterministic' };
        }
        if (q.includes('scope 3') || q.includes('supply chain')) {
            return { answer: `Supply chain emissions (Scope 3) total ${Math.round(totals.scope3).toLocaleString()} kg CO2e, representing ${((totals.scope3/total)*100).toFixed(1)}% of your footprint. Engaging suppliers on decarbonization is the key lever.`, source: 'deterministic' };
        }
        if (q.includes('reduce') || q.includes('improve') || q.includes('recommendation')) {
            const topCat = Object.entries(context.byCategory || {}).sort((a,b) => b[1]-a[1])[0];
            return { answer: `Focus on your largest emission source${topCat ? ` ("${topCat[0]}")` : ''}. Key strategies: switch to renewable energy for Scope 2, electrify fleet for Scope 1, and engage suppliers for Scope 3 reductions.`, source: 'deterministic' };
        }

        return { answer: `Your carbon footprint is ${Math.round(totals.total).toLocaleString()} kg CO2e across ${context.recordCount || 0} activity records. Ask me about specific scopes, categories, facilities, or reduction strategies for more detail.`, source: 'deterministic' };
    }

    async scanGreenwashingRisk(reportData) {
        const context = `
REPORT DATA:
- Total Emissions: ${reportData.totals?.total?.toFixed(0) || 0} kg CO2e
- Scope 1: ${reportData.totals?.scope1?.toFixed(0) || 0} kg
- Scope 2: ${reportData.totals?.scope2?.toFixed(0) || 0} kg
- Scope 3: ${reportData.totals?.scope3?.toFixed(0) || 0} kg
- Categories covered: ${Object.keys(reportData.byCategory || {}).join(', ')}
- Record count: ${reportData.recordCount || 0}
- Scope 3 categories present: ${Object.keys(reportData.byCategory || {}).filter(c => ['Purchased Goods', 'Downstream Transport', 'Business Travel', 'Employee Commute', 'Waste Disposal'].includes(c)).join(', ') || 'None'}
- Company: ${reportData.companyName || 'Unknown'}
- Period: ${reportData.period || 'Unknown'}
- Framework: ${reportData.framework || 'Unknown'}`;

        if (this.enabled && this.client) {
            try {
                const prompt = `You are a regulatory ESG compliance auditor. Analyze this emissions report for greenwashing risks BEFORE it is published. Check for:
1. Missing Scope 3 categories (GHG Protocol requires 15 categories - flag any that are likely material but absent)
2. Suspiciously low emissions relative to company size/industry
3. Methodology inconsistencies
4. Vague or unsubstantiated reduction claims
5. Data completeness issues

${context}

Respond ONLY with JSON:
{
  "risk_score": 0-100,
  "risk_level": "low/medium/high/critical",
  "findings": [
    { "category": "category name", "severity": "low/medium/high", "finding": "description", "recommendation": "what to fix" }
  ],
  "summary": "2-3 sentence overall assessment",
  "missing_scope3_categories": ["category names that should be included"]
}`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return { ...JSON.parse(jsonMatch[0]), source: 'gemini' };
            } catch (err) {
                console.warn('Gemini greenwashing scan failed:', err.message);
            }
        }

        return this._fallbackGreenwashingScan(reportData);
    }

    _fallbackGreenwashingScan(data) {
        const findings = [];
        const totals = data.totals || { total: 0, scope1: 0, scope2: 0, scope3: 0 };
        const cats = Object.keys(data.byCategory || {});
        const scope3Cats = ['Purchased Goods', 'Downstream Transport', 'Business Travel', 'Employee Commute', 'Waste Disposal'];
        const presentScope3 = scope3Cats.filter(c => cats.includes(c));
        const missingScope3 = scope3Cats.filter(c => !cats.includes(c));

        if (missingScope3.length > 2) {
            findings.push({ category: 'Scope 3 Coverage', severity: 'high', finding: `${missingScope3.length} of 5 common Scope 3 categories are missing. This understates your total footprint.`, recommendation: `Add data for: ${missingScope3.join(', ')}` });
        }
        if (totals.scope3 === 0 && totals.total > 0) {
            findings.push({ category: 'Scope 3 Omission', severity: 'high', finding: 'No Scope 3 emissions reported at all. For most companies, Scope 3 is 60-80% of total footprint.', recommendation: 'Include supply chain, business travel, and employee commute data.' });
        }
        if ((data.recordCount || 0) < 20) {
            findings.push({ category: 'Data Completeness', severity: 'medium', finding: `Only ${data.recordCount || 0} activity records. This may not represent a full reporting period.`, recommendation: 'Ensure all facilities and months are covered.' });
        }
        if (totals.scope2 > 0 && !cats.includes('Purchased Electricity')) {
            findings.push({ category: 'Methodology', severity: 'medium', finding: 'Scope 2 emissions present but no "Purchased Electricity" category found. Check categorization.', recommendation: 'Verify emission factor methodology for energy sources.' });
        }
        const riskScore = Math.min(100, findings.reduce((s, f) => s + (f.severity === 'high' ? 30 : f.severity === 'medium' ? 15 : 5), 0));
        return {
            risk_score: riskScore,
            risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
            findings,
            summary: findings.length === 0
                ? 'No significant greenwashing risks detected. Report appears comprehensive.'
                : `Found ${findings.length} issue(s) that should be addressed before publishing. Risk score: ${riskScore}/100.`,
            missing_scope3_categories: missingScope3,
            source: 'deterministic',
        };
    }

    async generateBoardSummary(emissionData) {
        const totals = emissionData.totals || { total: 0, scope1: 0, scope2: 0, scope3: 0 };
        const total = totals.total || 1;

        if (this.enabled && this.client) {
            try {
                const prompt = `You are a corporate sustainability director preparing a 5-point executive summary for the board of directors. Write in clear, authoritative business language — no jargon.

EMISSIONS DATA:
- Total: ${totals.total.toFixed(0)} kg CO2e
- Direct Operations: ${totals.scope1.toFixed(0)} kg (${((totals.scope1/total)*100).toFixed(1)}%)
- Energy: ${totals.scope2.toFixed(0)} kg (${((totals.scope2/total)*100).toFixed(1)}%)
- Supply Chain: ${totals.scope3.toFixed(0)} kg (${((totals.scope3/total)*100).toFixed(1)}%)
- Top Categories: ${JSON.stringify(emissionData.byCategory || {})}
- Active Targets: ${JSON.stringify(emissionData.targets || [])}

Respond ONLY with JSON:
{
  "headline": "One-line headline for the board (e.g., 'Carbon footprint reduced 8% YoY')",
  "key_metrics": [
    { "label": "metric name", "value": "formatted number", "trend": "up/down/flat", "context": "brief explanation" }
  ],
  "strategic_risks": ["risk 1", "risk 2"],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "forward_commitments": "1-2 sentence forward-looking statement",
  "summary_paragraph": "3-4 sentence executive overview"
}`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return { ...JSON.parse(jsonMatch[0]), source: 'gemini' };
            } catch (err) {
                console.warn('Gemini board summary failed:', err.message);
            }
        }

        const topCat = Object.entries(emissionData.byCategory || {}).sort((a,b) => b[1]-a[1])[0];
        return {
            headline: `Total carbon footprint: ${Math.round(totals.total).toLocaleString()} kg CO2e`,
            key_metrics: [
                { label: 'Total Emissions', value: `${Math.round(totals.total).toLocaleString()} kg`, trend: 'flat', context: 'Current reporting period' },
                { label: 'Direct Operations', value: `${((totals.scope1/total)*100).toFixed(1)}%`, trend: 'flat', context: `${Math.round(totals.scope1).toLocaleString()} kg CO2e` },
                { label: 'Energy', value: `${((totals.scope2/total)*100).toFixed(1)}%`, trend: 'flat', context: `${Math.round(totals.scope2).toLocaleString()} kg CO2e` },
                { label: 'Supply Chain', value: `${((totals.scope3/total)*100).toFixed(1)}%`, trend: 'flat', context: `${Math.round(totals.scope3).toLocaleString()} kg CO2e` },
            ],
            strategic_risks: [
                'Supply chain emissions represent the largest share and are hardest to control',
                'Regulatory deadlines for CSRD/SEC compliance are approaching',
            ],
            recommended_actions: [
                'Prioritize supplier engagement program for top 10 emission contributors',
                'Evaluate renewable energy procurement for Scope 2 reduction',
                'Establish science-based targets aligned with 1.5°C pathway',
            ],
            forward_commitments: `The organization is committed to reducing its carbon footprint through targeted interventions in its top emission category${topCat ? ` ("${topCat[0]}")` : ''} and accelerating the transition to clean energy sources.`,
            summary_paragraph: `The organization's total greenhouse gas emissions stand at ${Math.round(totals.total).toLocaleString()} kg CO2e. Supply chain activities account for ${((totals.scope3/total)*100).toFixed(1)}% of the total footprint, followed by energy consumption at ${((totals.scope2/total)*100).toFixed(1)}%. Direct operations represent ${((totals.scope1/total)*100).toFixed(1)}%. Immediate focus areas include supplier decarbonization and renewable energy procurement.`,
            source: 'deterministic',
        };
    }

    async analyzeStrategy(params, baseline) {
        if (this.enabled && this.client) {
            try {
                const prompt = `You are a strategic decarbonization expert. Analyze this "What-If" scenario for a corporation and provide a professional forecast.

Baseline Emissions: ${JSON.stringify(baseline)}
Proposed Strategy: ${JSON.stringify(params)}

Consider:
1. Renewables (Scope 2 impact)
2. EV Transition (Scope 1 impact)
3. Supply Chain Rail (Scope 3 logistics impact)
4. Remote Work (Scope 3.7 impact)

Respond ONLY with a JSON object:
{
  "analysis": "1-2 paragraph professional strategic assessment",
  "tags": ["Tag1", "Tag2"],
  "riskScore": 0-100,
  "riskDetail": "explanation of implementation risks",
  "costImpact": "saving/investment"
}`;

                const result = await this.client.generateContent(prompt);
                const text = result.response.text();
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (err) {
                console.warn('Gemini strategy analysis failed:', err.message);
            }
        }
        return null; // Fallback to deterministic logic handled in api.js
    }

    // ─── Fallback Helpers ──────────────────────────────────────────
    _keywordMatch(description, scope) {
        const lower = description.toLowerCase();
        const keywords = {
            fuels: ['diesel', 'gasoline', 'petrol', 'fuel', 'natural gas', 'propane', 'lpg', 'coal', 'combustion'],
            electricity: ['electricity', 'electric', 'kwh', 'power', 'grid'],
            steam: ['steam', 'heat', 'heating'],
            transport: ['shipping', 'freight', 'transport', 'logistics', 'truck', 'ship', 'cargo'],
            businessTravel: ['flight', 'travel', 'business trip', 'air travel', 'train'],
            commute: ['commute', 'commuting', 'employee travel'],
            materials: ['steel', 'polymer', 'packaging', 'raw material', 'procurement', 'purchase'],
            waste: ['waste', 'landfill', 'recycl', 'disposal', 'hazardous'],
        };

        for (const [category, words] of Object.entries(keywords)) {
            for (const word of words) {
                if (lower.includes(word)) {
                    const types = Object.keys(EMISSION_FACTORS[category] || {});
                    return {
                        category,
                        type: types[0] || 'Default',
                        confidence: 0.6,
                        reasoning: `Keyword match: "${word}" found in description`,
                    };
                }
            }
        }

        return { category: 'materials', type: 'Default', confidence: 0.3, reasoning: 'No keyword match, using default' };
    }

    _generateFallbackInsights(data) {
        const insights = [];
        const { totals, byCategory } = data;
        const total = totals.total || 1;

        if (totals.scope3 / total > 0.5) {
            insights.push({
                title: 'Value Chain Dominance',
                description: `Scope 3 accounts for ${((totals.scope3 / total) * 100).toFixed(0)}% of total emissions. Engaging suppliers on decarbonization could yield the largest reductions.`,
                impact: 'high',
                category: 'scope3',
            });
        }

        // Top category insight
        const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
        if (topCategory) {
            insights.push({
                title: `Top Hotspot: ${topCategory[0]}`,
                description: `"${topCategory[0]}" is your largest emission source at ${Math.round(topCategory[1]).toLocaleString()} kg CO₂e. Prioritize reduction initiatives here.`,
                impact: 'high',
                category: 'general',
            });
        }

        // Energy efficiency insight
        if (totals.scope2 > 0) {
            insights.push({
                title: 'Energy Transition Opportunity',
                description: `Scope 2 emissions of ${Math.round(totals.scope2).toLocaleString()} kg CO₂e could be reduced by switching to renewable energy procurement or on-site generation.`,
                impact: 'medium',
                category: 'scope2',
            });
        }

        // Fleet optimization
        if (byCategory['Fuel Combustion']) {
            insights.push({
                title: 'Fleet Electrification',
                description: `Fleet fuel combustion contributes ${Math.round(byCategory['Fuel Combustion']).toLocaleString()} kg CO₂e. Consider EV transition for company vehicles.`,
                impact: 'medium',
                category: 'scope1',
            });
        }

        return insights;
    }

    getStatus() {
        return {
            enabled: this.enabled,
            model: this.enabled ? 'gemini-2.5-pro' : 'deterministic-fallback',
        };
    }
}

export const geminiService = new GeminiService();
