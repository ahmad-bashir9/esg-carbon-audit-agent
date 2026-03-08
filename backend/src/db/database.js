import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

class DB {
  constructor() {
    this.pool = null;
  }

  async connect() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await this.migrate();
    console.log('✅ Postgres (Neon) database connected');
    return this.pool;
  }

  async query(text, params = []) {
    return this.pool.query(text, params);
  }

  async getOne(text, params = []) {
    const { rows } = await this.pool.query(text, params);
    return rows[0] || null;
  }

  async getAll(text, params = []) {
    const { rows } = await this.pool.query(text, params);
    return rows;
  }

  async migrate() {
    await this.pool.query(`
      -- ── Activity Data ──────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS activity_data (
        id SERIAL PRIMARY KEY,
        external_id TEXT,
        date TEXT NOT NULL,
        scope INTEGER NOT NULL CHECK(scope IN (1, 2, 3)),
        category TEXT NOT NULL,
        source_type TEXT NOT NULL,
        description TEXT,
        quantity DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL,
        facility TEXT,
        department TEXT,
        supplier TEXT,
        origin TEXT,
        destination TEXT,
        transport_mode TEXT,
        metadata TEXT,
        data_source TEXT DEFAULT 'manual',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Calculated Emissions ───────────────────────────────────
      CREATE TABLE IF NOT EXISTS emissions (
        id SERIAL PRIMARY KEY,
        activity_id INTEGER REFERENCES activity_data(id) ON DELETE CASCADE,
        scope INTEGER NOT NULL,
        category TEXT NOT NULL,
        source_description TEXT,
        activity_data DOUBLE PRECISION NOT NULL,
        activity_unit TEXT NOT NULL,
        emission_factor DOUBLE PRECISION NOT NULL,
        emission_factor_source TEXT DEFAULT 'GHG Protocol',
        co2e_kg DOUBLE PRECISION NOT NULL,
        calculation_method TEXT DEFAULT 'deterministic',
        confidence_score DOUBLE PRECISION DEFAULT 100,
        raw_lineage_snapshot TEXT,
        date TEXT NOT NULL,
        facility TEXT,
        department TEXT,
        calculated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Alerts ─────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('SPIKE', 'DROP')),
        severity TEXT NOT NULL CHECK(severity IN ('warning', 'critical')),
        scope TEXT,
        category TEXT,
        message TEXT NOT NULL,
        current_value DOUBLE PRECISION,
        baseline_value DOUBLE PRECISION,
        deviation_percent DOUBLE PRECISION,
        root_cause_analysis TEXT,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Reports ────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        reporting_period TEXT NOT NULL,
        framework TEXT NOT NULL,
        total_co2e DOUBLE PRECISION,
        scope1_co2e DOUBLE PRECISION,
        scope2_co2e DOUBLE PRECISION,
        scope3_co2e DOUBLE PRECISION,
        filename TEXT,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Emission Snapshots (for auditor baseline) ──────────────
      CREATE TABLE IF NOT EXISTS emission_snapshots (
        id SERIAL PRIMARY KEY,
        timestamp TEXT NOT NULL,
        scope1 DOUBLE PRECISION NOT NULL DEFAULT 0,
        scope2 DOUBLE PRECISION NOT NULL DEFAULT 0,
        scope3 DOUBLE PRECISION NOT NULL DEFAULT 0,
        total DOUBLE PRECISION NOT NULL DEFAULT 0,
        by_category TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Settings ───────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Auth & Profiles ────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS company_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Acme Corporation',
        industry TEXT,
        employee_count INTEGER,
        headquarters TEXT,
        reporting_framework TEXT DEFAULT 'GHG Protocol',
        revenue DOUBLE PRECISION,
        floor_area_sqft DOUBLE PRECISION,
        units_produced DOUBLE PRECISION,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Emission Factor Library ────────────────────────────────
      CREATE TABLE IF NOT EXISTS emission_factors (
        id SERIAL PRIMARY KEY,
        vertical TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        unit TEXT NOT NULL,
        kg_co2e_per_unit DOUBLE PRECISION NOT NULL,
        source TEXT,
        year INTEGER,
        scope INTEGER NOT NULL,
        UNIQUE(vertical, activity_type, unit, scope)
      );

      -- ── Reduction Targets ──────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reduction_targets (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        scope TEXT DEFAULT 'all',
        base_year INTEGER NOT NULL,
        base_emissions DOUBLE PRECISION NOT NULL,
        target_year INTEGER NOT NULL,
        target_percent DOUBLE PRECISION NOT NULL,
        interim_milestones TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'achieved', 'off_track', 'archived')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Suppliers ──────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        tier INTEGER DEFAULT 1,
        contact_email TEXT,
        carbon_score TEXT DEFAULT 'unrated',
        total_emissions DOUBLE PRECISION DEFAULT 0,
        last_assessed TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Report Schedules ───────────────────────────────────────
      CREATE TABLE IF NOT EXISTS report_schedules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
        framework TEXT DEFAULT 'CSRD & SEC',
        recipients TEXT,
        next_run TEXT,
        last_run TEXT,
        enabled INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Audit Log ──────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'export', 'login', 'generate_report')),
        old_value TEXT,
        new_value TEXT,
        user_id TEXT,
        user_name TEXT DEFAULT 'system',
        ip_address TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── MCP Sync Log ──────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS mcp_sync_log (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        records_fetched INTEGER DEFAULT 0,
        records_new INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ── Industry Benchmarks ────────────────────────────────────
      CREATE TABLE IF NOT EXISTS industry_benchmarks (
        id SERIAL PRIMARY KEY,
        industry TEXT NOT NULL,
        metric TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL,
        source TEXT,
        year INTEGER,
        percentile TEXT,
        UNIQUE(industry, metric)
      );

      -- ── Indexes ────────────────────────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_data(date);
      CREATE INDEX IF NOT EXISTS idx_activity_scope ON activity_data(scope);
      CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_data(category);
      CREATE INDEX IF NOT EXISTS idx_activity_date_scope ON activity_data(date, scope);
      CREATE INDEX IF NOT EXISTS idx_activity_date_facility ON activity_data(date, facility);
      CREATE INDEX IF NOT EXISTS idx_emissions_date ON emissions(date);
      CREATE INDEX IF NOT EXISTS idx_emissions_scope ON emissions(scope);
      CREATE INDEX IF NOT EXISTS idx_emissions_date_scope ON emissions(date, scope);
      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
    `);

    // ── Seed default data ──────────────────────────────────────
    await this.pool.query(`
      INSERT INTO settings (key, value) VALUES
        ('auditor_threshold', '0.10'),
        ('auditor_scope1_threshold', '0.10'),
        ('auditor_scope2_threshold', '0.10'),
        ('auditor_scope3_threshold', '0.10'),
        ('company_name', 'Acme Corporation'),
        ('active_vertical', 'default'),
        ('default_grid_region', 'US Average')
      ON CONFLICT (key) DO NOTHING
    `);

    await this.pool.query(`
      INSERT INTO company_profile (id, name) VALUES (1, 'Acme Corporation')
      ON CONFLICT (id) DO NOTHING
    `);

    await this.pool.query(`
      INSERT INTO emission_factors (vertical, activity_type, unit, kg_co2e_per_unit, source, year, scope) VALUES
        ('logistics', 'road_freight_articulated', 'tonne-km', 0.0962, 'DEFRA', 2024, 1),
        ('logistics', 'road_freight_rigid', 'tonne-km', 0.12, 'DEFRA', 2024, 1),
        ('logistics', 'rail_freight', 'tonne-km', 0.0280, 'DEFRA', 2024, 1),
        ('logistics', 'air_freight', 'tonne-km', 1.044, 'DEFRA', 2024, 3),
        ('logistics', 'sea_freight', 'tonne-km', 0.0116, 'DEFRA', 2024, 3),
        ('logistics', 'refrigerant_r134a', 'kg', 1430, 'EPA', 2024, 1),
        ('logistics', 'refrigerant_r404a', 'kg', 3922, 'EPA', 2024, 1)
      ON CONFLICT (vertical, activity_type, unit, scope) DO NOTHING
    `);

    await this.pool.query(`
      INSERT INTO industry_benchmarks (industry, metric, value, unit, source, year, percentile) VALUES
        ('General Enterprise', 'total_per_employee', 4200, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        ('General Enterprise', 'total_per_revenue', 120, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        ('General Enterprise', 'scope1_pct', 15, '%', 'EPA', 2024, 'median'),
        ('General Enterprise', 'scope2_pct', 25, '%', 'EPA', 2024, 'median'),
        ('General Enterprise', 'scope3_pct', 60, '%', 'EPA', 2024, 'median'),
        ('Logistics & Freight', 'total_per_employee', 12500, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        ('Logistics & Freight', 'total_per_revenue', 350, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        ('Logistics & Freight', 'scope1_pct', 35, '%', 'DEFRA', 2024, 'median'),
        ('Logistics & Freight', 'scope2_pct', 10, '%', 'DEFRA', 2024, 'median'),
        ('Logistics & Freight', 'scope3_pct', 55, '%', 'DEFRA', 2024, 'median'),
        ('Technology', 'total_per_employee', 3100, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        ('Technology', 'total_per_revenue', 45, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        ('Manufacturing', 'total_per_employee', 18500, 'kg CO2e/employee', 'EPA', 2024, 'median'),
        ('Manufacturing', 'total_per_revenue', 580, 'kg CO2e/$1M revenue', 'EPA', 2024, 'median')
      ON CONFLICT (industry, metric) DO NOTHING
    `);
  }

  // ─── Activity Data CRUD ──────────────────────────────────────────
  async insertActivity(data) {
    const { rows } = await this.pool.query(`
      INSERT INTO activity_data (external_id, date, scope, category, source_type, description, quantity, unit,
        facility, department, supplier, origin, destination, transport_mode, metadata, data_source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      data.external_id || null, data.date, data.scope, data.category, data.source_type,
      data.description || null, data.quantity, data.unit, data.facility || null,
      data.department || null, data.supplier || null, data.origin || null,
      data.destination || null, data.transport_mode || null,
      data.metadata ? JSON.stringify(data.metadata) : null, data.data_source || 'manual',
    ]);
    return { lastID: rows[0]?.id };
  }

  async insertActivitiesBatch(records) {
    if (records.length === 0) return 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const data of records) {
        await client.query(`
          INSERT INTO activity_data (external_id, date, scope, category, source_type, description, quantity, unit,
            facility, department, supplier, origin, destination, transport_mode, metadata, data_source)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          data.external_id || null, data.date, data.scope, data.category, data.source_type,
          data.description || null, data.quantity, data.unit, data.facility || null,
          data.department || null, data.supplier || null, data.origin || null,
          data.destination || null, data.transport_mode || null,
          data.metadata ? JSON.stringify(data.metadata) : null, data.data_source || 'manual',
        ]);
      }
      await client.query('COMMIT');
      return records.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActivities(filters = {}) {
    let where = ' WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.scope) { where += ` AND scope = $${idx++}`; params.push(filters.scope); }
    if (filters.category) { where += ` AND category = $${idx++}`; params.push(filters.category); }
    if (filters.facility) { where += ` AND facility = $${idx++}`; params.push(filters.facility); }
    if (filters.department) { where += ` AND department = $${idx++}`; params.push(filters.department); }
    if (filters.startDate) { where += ` AND date >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { where += ` AND date <= $${idx++}`; params.push(filters.endDate); }
    if (filters.data_source) { where += ` AND data_source = $${idx++}`; params.push(filters.data_source); }
    if (filters.search) { where += ` AND (description ILIKE $${idx} OR source_type ILIKE $${idx} OR facility ILIKE $${idx})`; params.push(`%${filters.search}%`); idx++; }

    const orderCol = filters.sortBy || 'date';
    const orderDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';
    const allowedCols = ['date', 'scope', 'category', 'source_type', 'quantity', 'unit', 'facility', 'department', 'data_source'];
    const safeCol = allowedCols.includes(orderCol) ? orderCol : 'date';

    let sql = `SELECT * FROM activity_data${where} ORDER BY ${safeCol} ${orderDir}`;

    if (filters.page && filters.pageSize) {
      const countRow = await this.getOne(`SELECT COUNT(*) as total FROM activity_data${where}`, params);
      const offset = (filters.page - 1) * filters.pageSize;
      sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(filters.pageSize, offset);
      const rows = await this.getAll(sql, params);
      return { rows, total: parseInt(countRow.total), page: filters.page, pageSize: filters.pageSize };
    }

    if (filters.limit) { sql += ` LIMIT $${idx++}`; params.push(filters.limit); }
    return this.getAll(sql, params);
  }

  async getActivity(id) {
    return this.getOne('SELECT * FROM activity_data WHERE id = $1', [id]);
  }

  async updateActivity(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['date', 'scope', 'category', 'source_type', 'description', 'quantity', 'unit',
        'facility', 'department', 'supplier', 'origin', 'destination', 'transport_mode'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    params.push(id);
    return this.pool.query(`UPDATE activity_data SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  async deleteActivity(id) {
    return this.pool.query('DELETE FROM activity_data WHERE id = $1', [id]);
  }

  // ─── Emissions ───────────────────────────────────────────────────
  async insertEmission(data) {
    return this.pool.query(`
      INSERT INTO emissions (activity_id, scope, category, source_description, activity_data, activity_unit,
        emission_factor, emission_factor_source, co2e_kg, calculation_method, confidence_score, raw_lineage_snapshot,
        date, facility, department)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      data.activity_id || null, data.scope, data.category, data.source_description,
      data.activity_data, data.activity_unit, data.emission_factor,
      data.emission_factor_source || 'GHG Protocol', data.co2e_kg,
      data.calculation_method || 'deterministic',
      data.confidence_score !== undefined ? data.confidence_score : 100,
      data.raw_lineage_snapshot || null, data.date, data.facility || null, data.department || null,
    ]);
  }

  async batchInsertEmissions(records) {
    if (records.length === 0) return 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const data of records) {
        await client.query(`
          INSERT INTO emissions (activity_id, scope, category, source_description, activity_data, activity_unit,
            emission_factor, emission_factor_source, co2e_kg, calculation_method, confidence_score, raw_lineage_snapshot,
            date, facility, department)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          data.activity_id || null, data.scope, data.category, data.source_description,
          data.activity_data, data.activity_unit, data.emission_factor,
          data.emission_factor_source || 'GHG Protocol', data.co2e_kg,
          data.calculation_method || 'deterministic',
          data.confidence_score !== undefined ? data.confidence_score : 100,
          data.raw_lineage_snapshot || null, data.date, data.facility || null, data.department || null,
        ]);
      }
      await client.query('COMMIT');
      return records.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getDistinctFilters() {
    const [departments, facilities, categories, dateRange] = await Promise.all([
      this.getAll('SELECT DISTINCT department FROM activity_data WHERE department IS NOT NULL ORDER BY department'),
      this.getAll('SELECT DISTINCT facility FROM activity_data WHERE facility IS NOT NULL ORDER BY facility'),
      this.getAll('SELECT DISTINCT category FROM activity_data WHERE category IS NOT NULL ORDER BY category'),
      this.getOne('SELECT MIN(date) as earliest, MAX(date) as latest FROM activity_data'),
    ]);
    return {
      departments: departments.map(r => r.department),
      facilities: facilities.map(r => r.facility),
      categories: categories.map(r => r.category),
      dateRange: dateRange || { earliest: null, latest: null },
    };
  }

  async getEmissions(filters = {}) {
    let sql = 'SELECT * FROM emissions WHERE 1=1';
    const params = [];
    let idx = 1;
    if (filters.scope) { sql += ` AND scope = $${idx++}`; params.push(filters.scope); }
    if (filters.startDate) { sql += ` AND date >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { sql += ` AND date <= $${idx++}`; params.push(filters.endDate); }
    if (filters.facility) { sql += ` AND facility = $${idx++}`; params.push(filters.facility); }
    if (filters.department) { sql += ` AND department = $${idx++}`; params.push(filters.department); }
    sql += ' ORDER BY date DESC';
    return this.getAll(sql, params);
  }

  async clearEmissions() {
    return this.pool.query('DELETE FROM emissions');
  }

  // ─── Alerts ──────────────────────────────────────────────────────
  async insertAlert(alert) {
    return this.pool.query(`
      INSERT INTO alerts (id, timestamp, type, severity, scope, category, message,
        current_value, baseline_value, deviation_percent, root_cause_analysis, acknowledged)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        timestamp = EXCLUDED.timestamp, type = EXCLUDED.type, severity = EXCLUDED.severity,
        scope = EXCLUDED.scope, category = EXCLUDED.category, message = EXCLUDED.message,
        current_value = EXCLUDED.current_value, baseline_value = EXCLUDED.baseline_value,
        deviation_percent = EXCLUDED.deviation_percent, root_cause_analysis = EXCLUDED.root_cause_analysis,
        acknowledged = EXCLUDED.acknowledged
    `, [
      alert.id, alert.timestamp, alert.type, alert.severity,
      alert.scope || null, alert.category || null, alert.message,
      alert.current_value, alert.baseline_value, alert.deviation_percent,
      alert.root_cause_analysis || null, alert.acknowledged ? 1 : 0,
    ]);
  }

  async getAlerts(filters = {}) {
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];
    let idx = 1;
    if (filters.severity) { sql += ` AND severity = $${idx++}`; params.push(filters.severity); }
    if (filters.unacknowledgedOnly) { sql += ' AND acknowledged = 0'; }
    sql += ' ORDER BY timestamp DESC';
    const rows = await this.getAll(sql, params);
    return rows.map(a => ({ ...a, acknowledged: !!a.acknowledged }));
  }

  async acknowledgeAlert(id) {
    return this.pool.query("UPDATE alerts SET acknowledged = 1, acknowledged_at = NOW()::TEXT WHERE id = $1", [id]);
  }

  // ─── Snapshots ───────────────────────────────────────────────────
  async insertSnapshot(snapshot) {
    return this.pool.query(`
      INSERT INTO emission_snapshots (timestamp, scope1, scope2, scope3, total, by_category)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      snapshot.timestamp, snapshot.scope1, snapshot.scope2, snapshot.scope3,
      snapshot.total, JSON.stringify(snapshot.byCategory || {}),
    ]);
  }

  async getSnapshots(limit = 12) {
    const rows = await this.getAll('SELECT * FROM emission_snapshots ORDER BY timestamp DESC LIMIT $1', [limit]);
    return rows.map(s => ({ ...s, byCategory: JSON.parse(s.by_category || '{}') }));
  }

  // ─── Reports ─────────────────────────────────────────────────────
  async insertReport(report) {
    return this.pool.query(`
      INSERT INTO reports (company_name, reporting_period, framework, total_co2e, scope1_co2e, scope2_co2e, scope3_co2e, filename)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      report.company_name, report.reporting_period, report.framework,
      report.total_co2e, report.scope1_co2e, report.scope2_co2e, report.scope3_co2e, report.filename,
    ]);
  }

  async getReports() {
    return this.getAll('SELECT * FROM reports ORDER BY generated_at DESC');
  }

  // ─── Settings ────────────────────────────────────────────────────
  async getSetting(key) {
    const row = await this.getOne('SELECT value FROM settings WHERE key = $1', [key]);
    return row ? row.value : null;
  }

  async getEmissionFactors(vertical) {
    return this.getAll('SELECT * FROM emission_factors WHERE vertical = $1', [vertical]);
  }

  async setSetting(key, value) {
    return this.pool.query(`
      INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `, [key, String(value)]);
  }

  async getAllSettings() {
    const rows = await this.getAll('SELECT key, value FROM settings');
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  }

  // ─── Stats ───────────────────────────────────────────────────────
  async getActivityStats() {
    const totalRow = await this.getOne('SELECT COUNT(*) as count FROM activity_data');
    const totalRecords = parseInt(totalRow.count);
    const byScope = await this.getAll('SELECT scope, COUNT(*) as count FROM activity_data GROUP BY scope');
    const byCategory = await this.getAll('SELECT category, COUNT(*) as count FROM activity_data GROUP BY category ORDER BY count DESC');
    const bySource = await this.getAll('SELECT data_source, COUNT(*) as count FROM activity_data GROUP BY data_source');
    const dateRange = await this.getOne('SELECT MIN(date) as earliest, MAX(date) as latest FROM activity_data');
    return { totalRecords, byScope, byCategory, bySource, dateRange };
  }

  // ─── Reduction Targets ───────────────────────────────────────────
  async getTargets() {
    return this.getAll('SELECT * FROM reduction_targets ORDER BY created_at DESC');
  }

  async getTarget(id) {
    return this.getOne('SELECT * FROM reduction_targets WHERE id = $1', [id]);
  }

  async insertTarget(data) {
    return this.pool.query(`
      INSERT INTO reduction_targets (name, scope, base_year, base_emissions, target_year, target_percent, interim_milestones, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      data.name, data.scope || 'all', data.base_year, data.base_emissions,
      data.target_year, data.target_percent,
      data.interim_milestones ? JSON.stringify(data.interim_milestones) : null,
      data.status || 'active',
    ]);
  }

  async updateTarget(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'scope', 'base_year', 'base_emissions', 'target_year', 'target_percent', 'status'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
      if (key === 'interim_milestones') {
        fields.push(`interim_milestones = $${idx++}`);
        params.push(JSON.stringify(value));
      }
    }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    params.push(id);
    return this.pool.query(`UPDATE reduction_targets SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  async deleteTarget(id) {
    return this.pool.query('DELETE FROM reduction_targets WHERE id = $1', [id]);
  }

  // ─── Suppliers ─────────────────────────────────────────────────────
  async getSuppliers() {
    return this.getAll('SELECT * FROM suppliers ORDER BY total_emissions DESC');
  }

  async getSupplier(id) {
    return this.getOne('SELECT * FROM suppliers WHERE id = $1', [id]);
  }

  async insertSupplier(data) {
    return this.pool.query(`
      INSERT INTO suppliers (name, industry, tier, contact_email, carbon_score, total_emissions, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      data.name, data.industry || null, data.tier || 1, data.contact_email || null,
      data.carbon_score || 'unrated', data.total_emissions || 0, data.notes || null,
    ]);
  }

  async updateSupplier(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'industry', 'tier', 'contact_email', 'carbon_score', 'total_emissions', 'last_assessed', 'notes'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    params.push(id);
    return this.pool.query(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  async deleteSupplier(id) {
    return this.pool.query('DELETE FROM suppliers WHERE id = $1', [id]);
  }

  async getSupplierEmissions(supplierId) {
    return this.getAll(
      'SELECT * FROM activity_data WHERE supplier = (SELECT name FROM suppliers WHERE id = $1) ORDER BY date DESC',
      [supplierId]
    );
  }

  async recalcSupplierScore(supplierId) {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) return null;
    const row = await this.getOne(
      'SELECT SUM(quantity) as total_qty FROM activity_data WHERE supplier = $1',
      [supplier.name]
    );
    const total = parseFloat(row?.total_qty) || 0;
    let score = 'A';
    if (total > 10000) score = 'F';
    else if (total > 5000) score = 'D';
    else if (total > 2000) score = 'C';
    else if (total > 500) score = 'B';
    await this.pool.query(
      "UPDATE suppliers SET carbon_score = $1, total_emissions = $2, last_assessed = NOW()::TEXT, updated_at = NOW() WHERE id = $3",
      [score, total, supplierId]
    );
    return { carbon_score: score, total_emissions: total };
  }

  // ─── Report Schedules ──────────────────────────────────────────────
  async getReportSchedules() {
    return this.getAll('SELECT * FROM report_schedules ORDER BY created_at DESC');
  }

  async insertReportSchedule(data) {
    return this.pool.query(`
      INSERT INTO report_schedules (name, frequency, framework, recipients, next_run, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      data.name, data.frequency, data.framework || 'CSRD & SEC',
      data.recipients || '', data.next_run || null, data.enabled !== undefined ? data.enabled : 1,
    ]);
  }

  async updateReportSchedule(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'frequency', 'framework', 'recipients', 'next_run', 'last_run', 'enabled'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (fields.length === 0) return null;
    params.push(id);
    return this.pool.query(`UPDATE report_schedules SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  async deleteReportSchedule(id) {
    return this.pool.query('DELETE FROM report_schedules WHERE id = $1', [id]);
  }

  async getDueSchedules() {
    return this.getAll("SELECT * FROM report_schedules WHERE enabled = 1 AND (next_run IS NULL OR next_run <= NOW()::TEXT)");
  }

  // ─── Audit Log ─────────────────────────────────────────────────────
  async insertAuditLog(entry) {
    return this.pool.query(`
      INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, user_id, user_name, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      entry.entity_type, entry.entity_id || null, entry.action,
      entry.old_value ? JSON.stringify(entry.old_value) : null,
      entry.new_value ? JSON.stringify(entry.new_value) : null,
      entry.user_id || null, entry.user_name || 'system', entry.ip_address || null,
    ]);
  }

  async getAuditLog(filters = {}) {
    let where = ' WHERE 1=1';
    const params = [];
    let idx = 1;
    if (filters.entity_type) { where += ` AND entity_type = $${idx++}`; params.push(filters.entity_type); }
    if (filters.action) { where += ` AND action = $${idx++}`; params.push(filters.action); }
    if (filters.startDate) { where += ` AND timestamp >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { where += ` AND timestamp <= $${idx++}`; params.push(filters.endDate); }
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    params.push(limit, offset);
    const rows = await this.getAll(`SELECT * FROM audit_log${where} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`, params);
    const countParams = params.slice(0, -2);
    const countRow = await this.getOne(`SELECT COUNT(*) as total FROM audit_log${where}`, countParams);
    return { rows, total: parseInt(countRow.total) };
  }

  // ─── MCP Sync Log ─────────────────────────────────────────────────
  async insertSyncLog(entry) {
    return this.pool.query(`
      INSERT INTO mcp_sync_log (source, tool_name, records_fetched, records_new, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      entry.source, entry.tool_name, entry.records_fetched || 0,
      entry.records_new || 0, entry.status || 'success', entry.error_message || null,
    ]);
  }

  async getSyncLogs(limit = 50) {
    return this.getAll('SELECT * FROM mcp_sync_log ORDER BY synced_at DESC LIMIT $1', [limit]);
  }

  async getLastSync() {
    return this.getOne('SELECT * FROM mcp_sync_log ORDER BY synced_at DESC LIMIT 1');
  }

  // ─── Industry Benchmarks ──────────────────────────────────────────
  async getBenchmarks(industry) {
    if (industry) {
      return this.getAll('SELECT * FROM industry_benchmarks WHERE industry = $1', [industry]);
    }
    return this.getAll('SELECT * FROM industry_benchmarks ORDER BY industry, metric');
  }

  // ─── Company Profile ──────────────────────────────────────────────
  async getCompanyProfile() {
    return this.getOne('SELECT * FROM company_profile WHERE id = 1');
  }

  async updateCompanyProfile(data) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'industry', 'employee_count', 'headquarters', 'reporting_framework', 'revenue', 'floor_area_sqft', 'units_produced'].includes(key)) {
        fields.push(`${key} = $${idx++}`);
        params.push(value);
      }
    }
    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    params.push(1);
    return this.pool.query(`UPDATE company_profile SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  // ─── Users (Auth) ─────────────────────────────────────────────────
  async getUserByEmail(email) {
    return this.getOne('SELECT * FROM users WHERE email = $1', [email]);
  }

  async getUserById(id) {
    return this.getOne('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [id]);
  }

  async insertUser(data) {
    return this.pool.query(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
    `, [data.id, data.name, data.email, data.password_hash, data.role || 'user']);
  }

  async getUsers() {
    return this.getAll('SELECT id, name, email, role, created_at FROM users');
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}

export const db = new DB();
