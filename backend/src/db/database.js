import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.VERCEL
    ? '/tmp/carbonlens.db'
    : resolve(__dirname, '../../carbonlens.db');

class DB {
  constructor() {
    this.db = null;
  }

  async connect() {
    this.db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    // For concurrency
    await this.db.run('PRAGMA journal_mode = WAL');
    await this.db.run('PRAGMA foreign_keys = ON');
    await this.migrate();
    console.log('✅ SQLite database connected:', DB_PATH);
    return this.db;
  }

  async migrate() {
    await this.db.exec(`
      -- ── Activity Data ──────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS activity_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT,
        date TEXT NOT NULL,
        scope INTEGER NOT NULL CHECK(scope IN (1, 2, 3)),
        category TEXT NOT NULL,
        source_type TEXT NOT NULL,
        description TEXT,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        facility TEXT,
        department TEXT,
        supplier TEXT,
        origin TEXT,
        destination TEXT,
        transport_mode TEXT,
        metadata TEXT,
        data_source TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Calculated Emissions ───────────────────────────────────
      CREATE TABLE IF NOT EXISTS emissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER REFERENCES activity_data(id) ON DELETE CASCADE,
        scope INTEGER NOT NULL,
        category TEXT NOT NULL,
        source_description TEXT,
        activity_data REAL NOT NULL,
        activity_unit TEXT NOT NULL,
        emission_factor REAL NOT NULL,
        emission_factor_source TEXT DEFAULT 'GHG Protocol',
        co2e_kg REAL NOT NULL,
        calculation_method TEXT DEFAULT 'deterministic',
        confidence_score REAL DEFAULT 100,
        raw_lineage_snapshot TEXT,
        date TEXT NOT NULL,
        facility TEXT,
        department TEXT,
        calculated_at TEXT DEFAULT (datetime('now'))
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
        current_value REAL,
        baseline_value REAL,
        deviation_percent REAL,
        root_cause_analysis TEXT,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Reports ────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        reporting_period TEXT NOT NULL,
        framework TEXT NOT NULL,
        total_co2e REAL,
        scope1_co2e REAL,
        scope2_co2e REAL,
        scope3_co2e REAL,
        filename TEXT,
        generated_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Emission Snapshots (for auditor baseline) ──────────────
      CREATE TABLE IF NOT EXISTS emission_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        scope1 REAL NOT NULL DEFAULT 0,
        scope2 REAL NOT NULL DEFAULT 0,
        scope3 REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        by_category TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Settings ───────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Default settings ───────────────────────────────────────
      INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('auditor_threshold', '0.10'),
        ('auditor_scope1_threshold', '0.10'),
        ('auditor_scope2_threshold', '0.10'),
        ('auditor_scope3_threshold', '0.10'),
        ('company_name', 'Acme Corporation'),
        ('active_vertical', 'default'),
        ('default_grid_region', 'US Average');

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
      
      -- ── Auth & Profiles ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS company_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Acme Corporation',
        industry TEXT,
        employee_count INTEGER,
        headquarters TEXT,
        reporting_framework TEXT DEFAULT 'GHG Protocol',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      INSERT OR IGNORE INTO company_profile (id, name) VALUES (1, 'Acme Corporation');

      -- ── Emission Factor Library (roadmap) ───────────────────────
      CREATE TABLE IF NOT EXISTS emission_factors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vertical TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        unit TEXT NOT NULL,
        kg_co2e_per_unit REAL NOT NULL,
        source TEXT,
        year INTEGER,
        scope INTEGER NOT NULL
      );

      -- Seed Logistics Factors
      INSERT OR IGNORE INTO emission_factors (vertical, activity_type, unit, kg_co2e_per_unit, source, year, scope) VALUES 
        ('logistics', 'road_freight_articulated', 'tonne-km', 0.0962, 'DEFRA', 2024, 1),
        ('logistics', 'road_freight_rigid', 'tonne-km', 0.12, 'DEFRA', 2024, 1),
        ('logistics', 'rail_freight', 'tonne-km', 0.0280, 'DEFRA', 2024, 1),
        ('logistics', 'air_freight', 'tonne-km', 1.044, 'DEFRA', 2024, 3),
        ('logistics', 'sea_freight', 'tonne-km', 0.0116, 'DEFRA', 2024, 3),
        ('logistics', 'refrigerant_r134a', 'kg', 1430, 'EPA', 2024, 1),
        ('logistics', 'refrigerant_r404a', 'kg', 3922, 'EPA', 2024, 1);

      -- ── Reduction Targets ──────────────────────────────────────
      CREATE TABLE IF NOT EXISTS reduction_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        scope TEXT DEFAULT 'all',
        base_year INTEGER NOT NULL,
        base_emissions REAL NOT NULL,
        target_year INTEGER NOT NULL,
        target_percent REAL NOT NULL,
        interim_milestones TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'achieved', 'off_track', 'archived')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Suppliers ──────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT,
        tier INTEGER DEFAULT 1,
        contact_email TEXT,
        carbon_score TEXT DEFAULT 'unrated',
        total_emissions REAL DEFAULT 0,
        last_assessed TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Report Schedules ──────────────────────────────────────
      CREATE TABLE IF NOT EXISTS report_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'monthly')),
        framework TEXT DEFAULT 'CSRD & SEC',
        recipients TEXT,
        next_run TEXT,
        last_run TEXT,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Audit Log ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'export', 'login', 'generate_report')),
        old_value TEXT,
        new_value TEXT,
        user_id TEXT,
        user_name TEXT DEFAULT 'system',
        ip_address TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

      -- ── MCP Sync Log ──────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS mcp_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        records_fetched INTEGER DEFAULT 0,
        records_new INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        synced_at TEXT DEFAULT (datetime('now'))
      );

      -- ── Industry Benchmarks ───────────────────────────────────
      CREATE TABLE IF NOT EXISTS industry_benchmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        industry TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        source TEXT,
        year INTEGER,
        percentile TEXT
      );

      INSERT OR IGNORE INTO industry_benchmarks (id, industry, metric, value, unit, source, year, percentile) VALUES
        (1, 'General Enterprise', 'total_per_employee', 4200, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        (2, 'General Enterprise', 'total_per_revenue', 120, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        (3, 'General Enterprise', 'scope1_pct', 15, '%', 'EPA', 2024, 'median'),
        (4, 'General Enterprise', 'scope2_pct', 25, '%', 'EPA', 2024, 'median'),
        (5, 'General Enterprise', 'scope3_pct', 60, '%', 'EPA', 2024, 'median'),
        (6, 'Logistics & Freight', 'total_per_employee', 12500, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        (7, 'Logistics & Freight', 'total_per_revenue', 350, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        (8, 'Logistics & Freight', 'scope1_pct', 35, '%', 'DEFRA', 2024, 'median'),
        (9, 'Logistics & Freight', 'scope2_pct', 10, '%', 'DEFRA', 2024, 'median'),
        (10, 'Logistics & Freight', 'scope3_pct', 55, '%', 'DEFRA', 2024, 'median'),
        (11, 'Technology', 'total_per_employee', 3100, 'kg CO2e/employee', 'CDP', 2024, 'median'),
        (12, 'Technology', 'total_per_revenue', 45, 'kg CO2e/$1M revenue', 'CDP', 2024, 'median'),
        (13, 'Manufacturing', 'total_per_employee', 18500, 'kg CO2e/employee', 'EPA', 2024, 'median'),
        (14, 'Manufacturing', 'total_per_revenue', 580, 'kg CO2e/$1M revenue', 'EPA', 2024, 'median');

      -- Extend company_profile with intensity fields
      -- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a safe approach
    `);

    // Add columns to company_profile if they don't exist
    const profileCols = await this.db.all("PRAGMA table_info(company_profile)");
    const colNames = profileCols.map(c => c.name);
    const newCols = [
      { name: 'revenue', type: 'REAL' },
      { name: 'floor_area_sqft', type: 'REAL' },
      { name: 'units_produced', type: 'REAL' },
    ];
    for (const col of newCols) {
      if (!colNames.includes(col.name)) {
        await this.db.run(`ALTER TABLE company_profile ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  }

  // ─── Activity Data CRUD ──────────────────────────────────────────
  async insertActivity(data) {
    return this.db.run(`
      INSERT INTO activity_data (external_id, date, scope, category, source_type, description, quantity, unit,
        facility, department, supplier, origin, destination, transport_mode, metadata, data_source)
      VALUES ($external_id, $date, $scope, $category, $source_type, $description, $quantity, $unit,
        $facility, $department, $supplier, $origin, $destination, $transport_mode, $metadata, $data_source)
    `, {
      $external_id: data.external_id || null,
      $date: data.date,
      $scope: data.scope,
      $category: data.category,
      $source_type: data.source_type,
      $description: data.description || null,
      $quantity: data.quantity,
      $unit: data.unit,
      $facility: data.facility || null,
      $department: data.department || null,
      $supplier: data.supplier || null,
      $origin: data.origin || null,
      $destination: data.destination || null,
      $transport_mode: data.transport_mode || null,
      $metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      $data_source: data.data_source || 'manual',
    });
  }

  async insertActivitiesBatch(records) {
    if (records.length === 0) return 0;

    // Begin transaction
    await this.db.run('BEGIN TRANSACTION');
    try {
      const stmt = await this.db.prepare(`
        INSERT INTO activity_data (external_id, date, scope, category, source_type, description, quantity, unit,
          facility, department, supplier, origin, destination, transport_mode, metadata, data_source)
        VALUES ($external_id, $date, $scope, $category, $source_type, $description, $quantity, $unit,
          $facility, $department, $supplier, $origin, $destination, $transport_mode, $metadata, $data_source)
      `);
      for (const data of records) {
        await stmt.run({
          $external_id: data.external_id || null,
          $date: data.date,
          $scope: data.scope,
          $category: data.category,
          $source_type: data.source_type,
          $description: data.description || null,
          $quantity: data.quantity,
          $unit: data.unit,
          $facility: data.facility || null,
          $department: data.department || null,
          $supplier: data.supplier || null,
          $origin: data.origin || null,
          $destination: data.destination || null,
          $transport_mode: data.transport_mode || null,
          $metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          $data_source: data.data_source || 'manual',
        });
      }
      await stmt.finalize();
      await this.db.run('COMMIT');
      return records.length;
    } catch (err) {
      await this.db.run('ROLLBACK');
      throw err;
    }
  }

  async getActivities(filters = {}) {
    let where = ' WHERE 1=1';
    const params = {};

    if (filters.scope) { where += ' AND scope = $scope'; params.$scope = filters.scope; }
    if (filters.category) { where += ' AND category = $category'; params.$category = filters.category; }
    if (filters.facility) { where += ' AND facility = $facility'; params.$facility = filters.facility; }
    if (filters.department) { where += ' AND department = $department'; params.$department = filters.department; }
    if (filters.startDate) { where += ' AND date >= $startDate'; params.$startDate = filters.startDate; }
    if (filters.endDate) { where += ' AND date <= $endDate'; params.$endDate = filters.endDate; }
    if (filters.data_source) { where += ' AND data_source = $data_source'; params.$data_source = filters.data_source; }
    if (filters.search) { where += ' AND (description LIKE $search OR source_type LIKE $search OR facility LIKE $search)'; params.$search = `%${filters.search}%`; }

    const orderCol = filters.sortBy || 'date';
    const orderDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';
    const allowedCols = ['date', 'scope', 'category', 'source_type', 'quantity', 'unit', 'facility', 'department', 'data_source'];
    const safeCol = allowedCols.includes(orderCol) ? orderCol : 'date';

    let sql = `SELECT * FROM activity_data${where} ORDER BY ${safeCol} ${orderDir}`;

    if (filters.page && filters.pageSize) {
      const countRow = await this.db.get(`SELECT COUNT(*) as total FROM activity_data${where}`, params);
      const offset = (filters.page - 1) * filters.pageSize;
      sql += ` LIMIT $limit OFFSET $offset`;
      params.$limit = filters.pageSize;
      params.$offset = offset;
      const rows = await this.db.all(sql, params);
      return { rows, total: countRow.total, page: filters.page, pageSize: filters.pageSize };
    }

    if (filters.limit) { sql += ' LIMIT $limit'; params.$limit = filters.limit; }
    return this.db.all(sql, params);
  }

  async getActivity(id) {
    return this.db.get('SELECT * FROM activity_data WHERE id = ?', [id]);
  }

  async updateActivity(id, data) {
    const fields = [];
    const params = { $id: id };
    for (const [key, value] of Object.entries(data)) {
      if (['date', 'scope', 'category', 'source_type', 'description', 'quantity', 'unit',
        'facility', 'department', 'supplier', 'origin', 'destination', 'transport_mode'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params['$' + key] = value;
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = datetime('now')");
    return this.db.run(`UPDATE activity_data SET ${fields.join(', ')} WHERE id = $id`, params);
  }

  async deleteActivity(id) {
    return this.db.run('DELETE FROM activity_data WHERE id = ?', [id]);
  }

  // ─── Emissions ───────────────────────────────────────────────────
  async insertEmission(data) {
    return this.db.run(`
      INSERT INTO emissions (activity_id, scope, category, source_description, activity_data, activity_unit,
        emission_factor, emission_factor_source, co2e_kg, calculation_method, confidence_score, raw_lineage_snapshot, 
        date, facility, department)
      VALUES ($activity_id, $scope, $category, $source_description, $activity_data, $activity_unit,
        $emission_factor, $emission_factor_source, $co2e_kg, $calculation_method, $confidence_score, $raw_lineage_snapshot,
        $date, $facility, $department)
    `, {
      $activity_id: data.activity_id || null,
      $scope: data.scope,
      $category: data.category,
      $source_description: data.source_description,
      $activity_data: data.activity_data,
      $activity_unit: data.activity_unit,
      $emission_factor: data.emission_factor,
      $emission_factor_source: data.emission_factor_source || 'GHG Protocol',
      $co2e_kg: data.co2e_kg,
      $calculation_method: data.calculation_method || 'deterministic',
      $confidence_score: data.confidence_score !== undefined ? data.confidence_score : 100,
      $raw_lineage_snapshot: data.raw_lineage_snapshot || null,
      $date: data.date,
      $facility: data.facility || null,
      $department: data.department || null,
    });
  }

  async batchInsertEmissions(records) {
    if (records.length === 0) return 0;
    await this.db.run('BEGIN TRANSACTION');
    try {
      const stmt = await this.db.prepare(`
        INSERT INTO emissions (activity_id, scope, category, source_description, activity_data, activity_unit,
          emission_factor, emission_factor_source, co2e_kg, calculation_method, confidence_score, raw_lineage_snapshot,
          date, facility, department)
        VALUES ($activity_id, $scope, $category, $source_description, $activity_data, $activity_unit,
          $emission_factor, $emission_factor_source, $co2e_kg, $calculation_method, $confidence_score, $raw_lineage_snapshot,
          $date, $facility, $department)
      `);
      for (const data of records) {
        await stmt.run({
          $activity_id: data.activity_id || null,
          $scope: data.scope,
          $category: data.category,
          $source_description: data.source_description,
          $activity_data: data.activity_data,
          $activity_unit: data.activity_unit,
          $emission_factor: data.emission_factor,
          $emission_factor_source: data.emission_factor_source || 'GHG Protocol',
          $co2e_kg: data.co2e_kg,
          $calculation_method: data.calculation_method || 'deterministic',
          $confidence_score: data.confidence_score !== undefined ? data.confidence_score : 100,
          $raw_lineage_snapshot: data.raw_lineage_snapshot || null,
          $date: data.date,
          $facility: data.facility || null,
          $department: data.department || null,
        });
      }
      await stmt.finalize();
      await this.db.run('COMMIT');
      return records.length;
    } catch (err) {
      await this.db.run('ROLLBACK');
      throw err;
    }
  }

  async getDistinctFilters() {
    const [departments, facilities, categories, dateRange] = await Promise.all([
      this.db.all('SELECT DISTINCT department FROM activity_data WHERE department IS NOT NULL ORDER BY department'),
      this.db.all('SELECT DISTINCT facility FROM activity_data WHERE facility IS NOT NULL ORDER BY facility'),
      this.db.all('SELECT DISTINCT category FROM activity_data WHERE category IS NOT NULL ORDER BY category'),
      this.db.get('SELECT MIN(date) as earliest, MAX(date) as latest FROM activity_data'),
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
    const params = {};
    if (filters.scope) { sql += ' AND scope = $scope'; params.$scope = filters.scope; }
    if (filters.startDate) { sql += ' AND date >= $startDate'; params.$startDate = filters.startDate; }
    if (filters.endDate) { sql += ' AND date <= $endDate'; params.$endDate = filters.endDate; }
    if (filters.facility) { sql += ' AND facility = $facility'; params.$facility = filters.facility; }
    if (filters.department) { sql += ' AND department = $department'; params.$department = filters.department; }
    sql += ' ORDER BY date DESC';
    return this.db.all(sql, params);
  }

  async clearEmissions() {
    return this.db.run('DELETE FROM emissions');
  }

  // ─── Alerts ──────────────────────────────────────────────────────
  async insertAlert(alert) {
    return this.db.run(`
      INSERT OR REPLACE INTO alerts (id, timestamp, type, severity, scope, category, message,
        current_value, baseline_value, deviation_percent, root_cause_analysis, acknowledged)
      VALUES ($id, $timestamp, $type, $severity, $scope, $category, $message,
        $current_value, $baseline_value, $deviation_percent, $root_cause_analysis, $acknowledged)
    `, {
      $id: alert.id,
      $timestamp: alert.timestamp,
      $type: alert.type,
      $severity: alert.severity,
      $scope: alert.scope || null,
      $category: alert.category || null,
      $message: alert.message,
      $current_value: alert.current_value,
      $baseline_value: alert.baseline_value,
      $deviation_percent: alert.deviation_percent,
      $root_cause_analysis: alert.root_cause_analysis || null,
      $acknowledged: alert.acknowledged ? 1 : 0,
    });
  }

  async getAlerts(filters = {}) {
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    const params = {};
    if (filters.severity) { sql += ' AND severity = $severity'; params.$severity = filters.severity; }
    if (filters.unacknowledgedOnly) { sql += ' AND acknowledged = 0'; }
    sql += ' ORDER BY timestamp DESC';
    const rows = await this.db.all(sql, params);
    return rows.map(a => ({ ...a, acknowledged: !!a.acknowledged }));
  }

  async acknowledgeAlert(id) {
    return this.db.run("UPDATE alerts SET acknowledged = 1, acknowledged_at = datetime('now') WHERE id = ?", [id]);
  }

  // ─── Snapshots ───────────────────────────────────────────────────
  async insertSnapshot(snapshot) {
    return this.db.run(`
      INSERT INTO emission_snapshots (timestamp, scope1, scope2, scope3, total, by_category)
      VALUES ($timestamp, $scope1, $scope2, $scope3, $total, $by_category)
    `, {
      $timestamp: snapshot.timestamp,
      $scope1: snapshot.scope1,
      $scope2: snapshot.scope2,
      $scope3: snapshot.scope3,
      $total: snapshot.total,
      $by_category: JSON.stringify(snapshot.byCategory || {}),
    });
  }

  async getSnapshots(limit = 12) {
    const rows = await this.db.all('SELECT * FROM emission_snapshots ORDER BY timestamp DESC LIMIT ?', [limit]);
    return rows.map(s => ({ ...s, byCategory: JSON.parse(s.by_category || '{}') }));
  }

  // ─── Reports ─────────────────────────────────────────────────────
  async insertReport(report) {
    return this.db.run(`
      INSERT INTO reports (company_name, reporting_period, framework, total_co2e, scope1_co2e, scope2_co2e, scope3_co2e, filename)
      VALUES ($company_name, $reporting_period, $framework, $total_co2e, $scope1_co2e, $scope2_co2e, $scope3_co2e, $filename)
    `, {
      $company_name: report.company_name,
      $reporting_period: report.reporting_period,
      $framework: report.framework,
      $total_co2e: report.total_co2e,
      $scope1_co2e: report.scope1_co2e,
      $scope2_co2e: report.scope2_co2e,
      $scope3_co2e: report.scope3_co2e,
      $filename: report.filename
    });
  }

  async getReports() {
    return await this.db.all('SELECT * FROM reports ORDER BY generated_at DESC');
  }

  // ─── Settings ────────────────────────────────────────────────────
  async getSetting(key) {
    const row = await this.db.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  }

  async getEmissionFactors(vertical) {
    return await this.db.all('SELECT * FROM emission_factors WHERE vertical = ?', [vertical]);
  }

  async setSetting(key, value) {
    return this.db.run(`
      INSERT INTO settings (key, value, updated_at) VALUES ($key, $value, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = $value, updated_at = datetime('now')
    `, { $key: key, $value: String(value) });
  }

  async getAllSettings() {
    const rows = await this.db.all('SELECT key, value FROM settings');
    return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  }

  // ─── Stats ───────────────────────────────────────────────────────
  async getActivityStats() {
    const totalRecords = (await this.db.get('SELECT COUNT(*) as count FROM activity_data')).count;
    const byScope = await this.db.all('SELECT scope, COUNT(*) as count FROM activity_data GROUP BY scope');
    const byCategory = await this.db.all('SELECT category, COUNT(*) as count FROM activity_data GROUP BY category ORDER BY count DESC');
    const bySource = await this.db.all('SELECT data_source, COUNT(*) as count FROM activity_data GROUP BY data_source');
    const dateRange = await this.db.get('SELECT MIN(date) as earliest, MAX(date) as latest FROM activity_data');

    return { totalRecords, byScope, byCategory, bySource, dateRange };
  }

  // ─── Reduction Targets ───────────────────────────────────────────
  async getTargets() {
    return this.db.all('SELECT * FROM reduction_targets ORDER BY created_at DESC');
  }

  async getTarget(id) {
    return this.db.get('SELECT * FROM reduction_targets WHERE id = ?', [id]);
  }

  async insertTarget(data) {
    return this.db.run(`
      INSERT INTO reduction_targets (name, scope, base_year, base_emissions, target_year, target_percent, interim_milestones, status)
      VALUES ($name, $scope, $base_year, $base_emissions, $target_year, $target_percent, $interim_milestones, $status)
    `, {
      $name: data.name,
      $scope: data.scope || 'all',
      $base_year: data.base_year,
      $base_emissions: data.base_emissions,
      $target_year: data.target_year,
      $target_percent: data.target_percent,
      $interim_milestones: data.interim_milestones ? JSON.stringify(data.interim_milestones) : null,
      $status: data.status || 'active',
    });
  }

  async updateTarget(id, data) {
    const fields = [];
    const params = { $id: id };
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'scope', 'base_year', 'base_emissions', 'target_year', 'target_percent', 'status'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params[`$${key}`] = value;
      }
      if (key === 'interim_milestones') {
        fields.push('interim_milestones = $interim_milestones');
        params.$interim_milestones = JSON.stringify(value);
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = datetime('now')");
    return this.db.run(`UPDATE reduction_targets SET ${fields.join(', ')} WHERE id = $id`, params);
  }

  async deleteTarget(id) {
    return this.db.run('DELETE FROM reduction_targets WHERE id = ?', [id]);
  }

  // ─── Suppliers ─────────────────────────────────────────────────────
  async getSuppliers() {
    return this.db.all('SELECT * FROM suppliers ORDER BY total_emissions DESC');
  }

  async getSupplier(id) {
    return this.db.get('SELECT * FROM suppliers WHERE id = ?', [id]);
  }

  async insertSupplier(data) {
    return this.db.run(`
      INSERT INTO suppliers (name, industry, tier, contact_email, carbon_score, total_emissions, notes)
      VALUES ($name, $industry, $tier, $contact_email, $carbon_score, $total_emissions, $notes)
    `, {
      $name: data.name,
      $industry: data.industry || null,
      $tier: data.tier || 1,
      $contact_email: data.contact_email || null,
      $carbon_score: data.carbon_score || 'unrated',
      $total_emissions: data.total_emissions || 0,
      $notes: data.notes || null,
    });
  }

  async updateSupplier(id, data) {
    const fields = [];
    const params = { $id: id };
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'industry', 'tier', 'contact_email', 'carbon_score', 'total_emissions', 'last_assessed', 'notes'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params[`$${key}`] = value;
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = datetime('now')");
    return this.db.run(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = $id`, params);
  }

  async deleteSupplier(id) {
    return this.db.run('DELETE FROM suppliers WHERE id = ?', [id]);
  }

  async getSupplierEmissions(supplierId) {
    return this.db.all(
      'SELECT * FROM activity_data WHERE supplier = (SELECT name FROM suppliers WHERE id = ?) ORDER BY date DESC',
      [supplierId]
    );
  }

  async recalcSupplierScore(supplierId) {
    const supplier = await this.getSupplier(supplierId);
    if (!supplier) return null;
    const activities = await this.db.all(
      'SELECT SUM(quantity) as total_qty FROM activity_data WHERE supplier = ?',
      [supplier.name]
    );
    const total = activities[0]?.total_qty || 0;
    let score = 'A';
    if (total > 10000) score = 'F';
    else if (total > 5000) score = 'D';
    else if (total > 2000) score = 'C';
    else if (total > 500) score = 'B';
    await this.db.run(
      "UPDATE suppliers SET carbon_score = ?, total_emissions = ?, last_assessed = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [score, total, supplierId]
    );
    return { carbon_score: score, total_emissions: total };
  }

  // ─── Report Schedules ──────────────────────────────────────────────
  async getReportSchedules() {
    return this.db.all('SELECT * FROM report_schedules ORDER BY created_at DESC');
  }

  async insertReportSchedule(data) {
    return this.db.run(`
      INSERT INTO report_schedules (name, frequency, framework, recipients, next_run, enabled)
      VALUES ($name, $frequency, $framework, $recipients, $next_run, $enabled)
    `, {
      $name: data.name,
      $frequency: data.frequency,
      $framework: data.framework || 'CSRD & SEC',
      $recipients: data.recipients || '',
      $next_run: data.next_run || null,
      $enabled: data.enabled !== undefined ? data.enabled : 1,
    });
  }

  async updateReportSchedule(id, data) {
    const fields = [];
    const params = { $id: id };
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'frequency', 'framework', 'recipients', 'next_run', 'last_run', 'enabled'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params[`$${key}`] = value;
      }
    }
    if (fields.length === 0) return null;
    return this.db.run(`UPDATE report_schedules SET ${fields.join(', ')} WHERE id = $id`, params);
  }

  async deleteReportSchedule(id) {
    return this.db.run('DELETE FROM report_schedules WHERE id = ?', [id]);
  }

  async getDueSchedules() {
    return this.db.all("SELECT * FROM report_schedules WHERE enabled = 1 AND (next_run IS NULL OR next_run <= datetime('now'))");
  }

  // ─── Audit Log ─────────────────────────────────────────────────────
  async insertAuditLog(entry) {
    return this.db.run(`
      INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, user_id, user_name, ip_address)
      VALUES ($entity_type, $entity_id, $action, $old_value, $new_value, $user_id, $user_name, $ip_address)
    `, {
      $entity_type: entry.entity_type,
      $entity_id: entry.entity_id || null,
      $action: entry.action,
      $old_value: entry.old_value ? JSON.stringify(entry.old_value) : null,
      $new_value: entry.new_value ? JSON.stringify(entry.new_value) : null,
      $user_id: entry.user_id || null,
      $user_name: entry.user_name || 'system',
      $ip_address: entry.ip_address || null,
    });
  }

  async getAuditLog(filters = {}) {
    let where = ' WHERE 1=1';
    const params = {};
    if (filters.entity_type) { where += ' AND entity_type = $entity_type'; params.$entity_type = filters.entity_type; }
    if (filters.action) { where += ' AND action = $action'; params.$action = filters.action; }
    if (filters.startDate) { where += ' AND timestamp >= $startDate'; params.$startDate = filters.startDate; }
    if (filters.endDate) { where += ' AND timestamp <= $endDate'; params.$endDate = filters.endDate; }
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    const rows = await this.db.all(`SELECT * FROM audit_log${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, { ...params, 1: limit, 2: offset });
    const countRow = await this.db.get(`SELECT COUNT(*) as total FROM audit_log${where}`, params);
    return { rows, total: countRow.total };
  }

  // ─── MCP Sync Log ─────────────────────────────────────────────────
  async insertSyncLog(entry) {
    return this.db.run(`
      INSERT INTO mcp_sync_log (source, tool_name, records_fetched, records_new, status, error_message)
      VALUES ($source, $tool_name, $records_fetched, $records_new, $status, $error_message)
    `, {
      $source: entry.source,
      $tool_name: entry.tool_name,
      $records_fetched: entry.records_fetched || 0,
      $records_new: entry.records_new || 0,
      $status: entry.status || 'success',
      $error_message: entry.error_message || null,
    });
  }

  async getSyncLogs(limit = 50) {
    return this.db.all('SELECT * FROM mcp_sync_log ORDER BY synced_at DESC LIMIT ?', [limit]);
  }

  async getLastSync() {
    return this.db.get('SELECT * FROM mcp_sync_log ORDER BY synced_at DESC LIMIT 1');
  }

  // ─── Industry Benchmarks ──────────────────────────────────────────
  async getBenchmarks(industry) {
    if (industry) {
      return this.db.all('SELECT * FROM industry_benchmarks WHERE industry = ?', [industry]);
    }
    return this.db.all('SELECT * FROM industry_benchmarks ORDER BY industry, metric');
  }

  // ─── Company Profile ──────────────────────────────────────────────
  async getCompanyProfile() {
    return this.db.get('SELECT * FROM company_profile WHERE id = 1');
  }

  async updateCompanyProfile(data) {
    const fields = [];
    const params = { $id: 1 };
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'industry', 'employee_count', 'headquarters', 'reporting_framework', 'revenue', 'floor_area_sqft', 'units_produced'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params[`$${key}`] = value;
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = datetime('now')");
    return this.db.run(`UPDATE company_profile SET ${fields.join(', ')} WHERE id = $id`, params);
  }

  // ─── Users (Auth) ─────────────────────────────────────────────────
  async getUserByEmail(email) {
    return this.db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async getUserById(id) {
    return this.db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
  }

  async insertUser(data) {
    return this.db.run(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES ($id, $name, $email, $password_hash, $role)
    `, {
      $id: data.id,
      $name: data.name,
      $email: data.email,
      $password_hash: data.password_hash,
      $role: data.role || 'user',
    });
  }

  async getUsers() {
    return this.db.all('SELECT id, name, email, role, created_at FROM users');
  }

  async close() {
    if (this.db) await this.db.close();
  }
}

export const db = new DB();
