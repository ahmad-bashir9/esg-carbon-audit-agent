import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = resolve(__dirname, '../../carbonlens.db');

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
        ('default_grid_region', 'US Average');

      -- ── Indexes ────────────────────────────────────────────────
      CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_data(date);
      CREATE INDEX IF NOT EXISTS idx_activity_scope ON activity_data(scope);
      CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_data(category);
      CREATE INDEX IF NOT EXISTS idx_emissions_date ON emissions(date);
      CREATE INDEX IF NOT EXISTS idx_emissions_scope ON emissions(scope);
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
    `);
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
    let sql = 'SELECT * FROM activity_data WHERE 1=1';
    const params = {};

    if (filters.scope) { sql += ' AND scope = $scope'; params.$scope = filters.scope; }
    if (filters.category) { sql += ' AND category = $category'; params.$category = filters.category; }
    if (filters.facility) { sql += ' AND facility = $facility'; params.$facility = filters.facility; }
    if (filters.department) { sql += ' AND department = $department'; params.$department = filters.department; }
    if (filters.startDate) { sql += ' AND date >= $startDate'; params.$startDate = filters.startDate; }
    if (filters.endDate) { sql += ' AND date <= $endDate'; params.$endDate = filters.endDate; }
    if (filters.data_source) { sql += ' AND data_source = $data_source'; params.$data_source = filters.data_source; }

    sql += ' ORDER BY date DESC';
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

  // ─── Authentication & Users ──────────────────────────────────────
  async getUserByEmail(email) {
    return this.db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async createUser(user) {
    return this.db.run(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES ($id, $name, $email, $password_hash)
    `, {
      $id: user.id,
      $name: user.name,
      $email: user.email,
      $password_hash: user.password_hash
    });
  }

  // ─── Company Profile ─────────────────────────────────────────────
  async getCompanyProfile() {
    return this.db.get('SELECT * FROM company_profile WHERE id = 1');
  }

  async updateCompanyProfile(data) {
    const fields = [];
    const params = {};
    for (const [key, value] of Object.entries(data)) {
      if (['name', 'industry', 'employee_count', 'headquarters', 'reporting_framework'].includes(key)) {
        fields.push(`${key} = $${key}`);
        params['$' + key] = value;
      }
    }
    if (fields.length === 0) return null;
    fields.push("updated_at = datetime('now')");
    return this.db.run(`UPDATE company_profile SET ${fields.join(', ')} WHERE id = 1`, params);
  }

  async close() {
    if (this.db) await this.db.close();
  }
}

export const db = new DB();
