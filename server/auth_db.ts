import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(process.cwd(), "timehero_db.sqlite");
const BACKUP_DIR = path.resolve(process.cwd(), "backups");
const LIVE_BACKUP_PATH = path.resolve(process.cwd(), "timehero_db.backup.sqlite");
const LOG_FILE = path.resolve(process.cwd(), "db_recovery_logs.json");

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login: string | null;
}

export interface DbDiagnostics {
  status: "healthy" | "recovered" | "compromised";
  isRecoveryMode: boolean;
  diagnostics: string[];
  recoveryLogs: string[];
  alerts: string[];
  lastStartupTime: string;
}

export let dbState: DbDiagnostics = {
  status: "healthy",
  isRecoveryMode: false,
  diagnostics: [],
  recoveryLogs: [],
  alerts: [],
  lastStartupTime: ""
};

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function logEvent(level: "INFO" | "WARNING" | "CRITICAL", message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  if (!dbState.recoveryLogs) dbState.recoveryLogs = [];
  dbState.recoveryLogs.push(logMessage);
  
  if (level === "CRITICAL" || level === "WARNING") {
    if (!dbState.alerts) dbState.alerts = [];
    dbState.alerts.push(logMessage);
  }
  
  try {
    let logs: any[] = [];
    if (fs.existsSync(LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    }
    logs.push({ timestamp, level, message });
    if (logs.length > 500) logs.shift();
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error("Failed to write db recovery logs:", err);
  }
}

export function createBackupSnapshot(buffer: Buffer) {
  try {
    // 1. Live backup
    fs.writeFileSync(LIVE_BACKUP_PATH, buffer);
    
    // 2. Timestamped snapshot
    const timestamp = Date.now();
    const snapshotPath = path.join(BACKUP_DIR, `timehero_db_backup_${timestamp}.sqlite`);
    fs.writeFileSync(snapshotPath, buffer);
    
    logEvent("INFO", `Created backup snapshot: timehero_db_backup_${timestamp}.sqlite`);
    
    // 3. Keep latest 10 snapshots
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite"))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: parseInt(f.replace("timehero_db_backup_", "").replace(".sqlite", ""), 10) || 0
      }))
      .sort((a, b) => b.time - a.time);
      
    if (files.length > 10) {
      const toDelete = files.slice(10);
      toDelete.forEach(f => {
        try {
          fs.unlinkSync(f.path);
          logEvent("INFO", `Pruned old backup snapshot: ${f.name}`);
        } catch (e: any) {
          logEvent("WARNING", `Failed to prune backup snapshot ${f.name}: ${e.message}`);
        }
      });
    }
  } catch (err: any) {
    logEvent("WARNING", `Backup generation failed: ${err.message}`);
  }
}

export function runStartupDiagnostics(db: any): { ok: boolean; message: string; details: string[] } {
  const details: string[] = [];
  try {
    // 1. Check journal mode
    const pragmaRes = db.exec("PRAGMA journal_mode;");
    const mode = pragmaRes && pragmaRes[0] && pragmaRes[0].values && pragmaRes[0].values[0] ? pragmaRes[0].values[0][0] : "unknown";
    details.push(`SQLite Journal Mode: ${mode}`);
    
    // 2. Integrity check
    const integrityRes = db.exec("PRAGMA integrity_check;");
    const integrity = integrityRes && integrityRes[0] && integrityRes[0].values && integrityRes[0].values[0] ? integrityRes[0].values[0][0] : "failed";
    details.push(`SQLite Integrity Check: ${integrity}`);
    if (integrity !== "ok") {
      return { ok: false, message: `Integrity check returned: ${integrity}`, details };
    }
    
    // 3. Verify core tables
    const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    const tables = tablesRes && tablesRes[0] ? tablesRes[0].values.map((v: any) => String(v[0])) : [];
    details.push(`Existing Tables: ${tables.join(", ")}`);
    
    const requiredTables = ["users", "sessions", "notifications", "categories"];
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    if (missingTables.length > 0) {
      return { ok: false, message: `Missing core tables: ${missingTables.join(", ")}`, details };
    }
    
    // 4. Try querying users table count
    const usersCountRes = db.exec("SELECT count(*) FROM users;");
    const usersCount = usersCountRes && usersCountRes[0] && usersCountRes[0].values && usersCountRes[0].values[0] ? Number(usersCountRes[0].values[0][0]) : 0;
    details.push(`Verified readable 'users' table. Count: ${usersCount}`);
    
    return { ok: true, message: "Healthy", details };
  } catch (err: any) {
    return { ok: false, message: `Exception during diagnostics: ${err.message}`, details };
  }
}

let dbInstance: any = null;
let dbPromise: Promise<any> | null = null;

// Expose getter for dbState
export function getDbState() {
  // Read snapshot filenames
  let snapshotFiles: string[] = [];
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      snapshotFiles = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite"))
        .sort((a, b) => b.localeCompare(a));
    }
  } catch (e) {
    console.error("Failed to read snapshots directory:", e);
  }
  return {
    ...dbState,
    snapshots: snapshotFiles
  };
}

export async function forceReloadDbInstance() {
  dbInstance = null;
  dbPromise = null;
  return getDb();
}

export async function getDb() {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    const SQL = await initSqlJs();
    let fileBuffer: Buffer | undefined;
    dbState.lastStartupTime = new Date().toISOString();
    
    // Scan for prior installation indicators (backups, snapshots, malformed archives, or recovery logs)
    let hasPriorInstallation = false;
    try {
      const hasLiveBackup = fs.existsSync(LIVE_BACKUP_PATH);
      const hasLogs = fs.existsSync(LOG_FILE);
      let hasSnapshots = false;
      if (fs.existsSync(BACKUP_DIR)) {
        const files = fs.readdirSync(BACKUP_DIR);
        hasSnapshots = files.some(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite"));
      }
      let hasMalformed = false;
      if (fs.existsSync(process.cwd())) {
        const files = fs.readdirSync(process.cwd());
        hasMalformed = files.some(f => f.startsWith("timehero_db.sqlite.malformed_"));
      }
      
      if (hasLiveBackup || hasSnapshots || hasLogs || hasMalformed) {
        hasPriorInstallation = true;
      }
    } catch (e) {
      console.error("Error scanning prior installation indicators:", e);
    }
    
    // Log exactly which file is being opened on startup (this creates LOG_FILE if it doesn't exist)
    logEvent("INFO", `Attempting to open database file: ${DB_PATH}`);
    
    if (hasPriorInstallation) {
      try {
        const hasLiveBackup = fs.existsSync(LIVE_BACKUP_PATH);
        const hasLogs = fs.existsSync(LOG_FILE);
        const snapshots = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite")).length : 0;
        const hasMalformed = fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()).some(f => f.startsWith("timehero_db.sqlite.malformed_")) : false;
        logEvent("INFO", `Prior installation indicators found: hasLiveBackup=${hasLiveBackup}, hasSnapshots=${snapshots > 0}, hasLogs=${hasLogs}, hasMalformed=${hasMalformed}`);
      } catch (e) {}
    } else {
      logEvent("INFO", "No prior installation indicators found.");
    }
    
    const attemptRecovery = (): boolean => {
      logEvent("INFO", "Attempting automatic recovery from backups and snapshots...");
      let recoverySuccess = false;
      
      // Read timestamped snapshots
      let snapshotFiles: string[] = [];
      try {
        if (fs.existsSync(BACKUP_DIR)) {
          snapshotFiles = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite"))
            .map(f => path.join(BACKUP_DIR, f))
            .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        }
      } catch (e) {
        logEvent("WARNING", "Failed to list snapshots folder.");
      }
      
      const backupOptions = [LIVE_BACKUP_PATH, ...snapshotFiles];
      for (const backupPath of backupOptions) {
        if (fs.existsSync(backupPath)) {
          logEvent("INFO", `Testing backup source: ${path.basename(backupPath)}`);
          try {
            const backupBuffer = fs.readFileSync(backupPath);
            if (backupBuffer.length > 0) {
              const testDb = new SQL.Database(backupBuffer);
              const diag = runStartupDiagnostics(testDb);
              testDb.close();
              
              if (diag.ok) {
                // Recovery source verified! Write to DB_PATH
                fs.writeFileSync(DB_PATH, backupBuffer);
                dbInstance = new SQL.Database(backupBuffer);
                
                dbInstance.run("PRAGMA journal_mode=WAL;");
                dbInstance.run("PRAGMA synchronous=NORMAL;");
                
                logEvent("INFO", `SUCCESSFUL RECOVERY: Restored database from working backup: ${path.basename(backupPath)}`);
                dbState.status = "recovered";
                dbState.isRecoveryMode = false;
                dbState.diagnostics = diag.details;
                recoverySuccess = true;
                break;
              } else {
                logEvent("WARNING", `Backup source ${path.basename(backupPath)} failed integrity check: ${diag.message}`);
              }
            }
          } catch (backupErr: any) {
            logEvent("WARNING", `Failed to read or parse backup ${path.basename(backupPath)}: ${backupErr.message}`);
          }
        }
      }
      return recoverySuccess;
    };
    
    try {
      if (fs.existsSync(DB_PATH)) {
        fileBuffer = fs.readFileSync(DB_PATH);
        logEvent("INFO", `Loaded database file. Size: ${fileBuffer.length} bytes`);
      } else {
        logEvent("INFO", "No existing database file found.");
      }
    } catch (err: any) {
      logEvent("CRITICAL", `Failed to read database file: ${err.message}`);
    }
    
    let needsInitialBackup = false;
    
    if (fileBuffer && fileBuffer.length > 0) {
      try {
        const testDb = new SQL.Database(fileBuffer);
        const diagnostics = runStartupDiagnostics(testDb);
        dbState.diagnostics = diagnostics.details;
        
        if (diagnostics.ok) {
          dbInstance = testDb;
          
          // Configure WAL Mode simulation queries
          dbInstance.run("PRAGMA journal_mode=WAL;");
          dbInstance.run("PRAGMA synchronous=NORMAL;");
          
          logEvent("INFO", "Database startup diagnostics PASSED. Running WAL mode.");
          dbState.status = "healthy";
          dbState.isRecoveryMode = false;
          
          // Trigger backup of verified healthy state
          needsInitialBackup = true;
        } else {
          testDb.close();
          throw new Error(diagnostics.message);
        }
      } catch (err: any) {
        logEvent("CRITICAL", `Corrupted SQLite file detected: ${err.message}`);
        
        // 1. Archive copy of corrupted database for forensics but DO NOT automatically rename or replace DB_PATH yet
        const malformedPath = `${DB_PATH}.malformed_${Date.now()}`;
        try {
          if (fs.existsSync(DB_PATH)) {
            fs.copyFileSync(DB_PATH, malformedPath);
            logEvent("WARNING", `Archived copy of corrupted SQLite file to: ${path.basename(malformedPath)}`);
          }
        } catch (archiveErr: any) {
          logEvent("CRITICAL", `Failed to archive copy of corrupted file: ${archiveErr.message}`);
        }
        
        // 2. Attempt automatic recovery
        const recoverySuccess = attemptRecovery();
        
        if (!recoverySuccess) {
          logEvent("CRITICAL", "Automatic recovery FAILED! Automatically starting with a clean database to restore service.");
          
          if (fs.existsSync(DB_PATH)) {
            try {
              fs.renameSync(DB_PATH, `${DB_PATH}.abandoned_${Date.now()}`);
            } catch (e) {}
          }
          if (fs.existsSync(LIVE_BACKUP_PATH)) {
            try {
              fs.renameSync(LIVE_BACKUP_PATH, `${LIVE_BACKUP_PATH}.abandoned_${Date.now()}`);
            } catch (e) {}
          }
          
          dbInstance = new SQL.Database();
          initAuthDbSchema(dbInstance);
          
          try {
            const data = dbInstance.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
          } catch (writeErr) {
            logEvent("WARNING", `Failed to save fresh DB: ${writeErr}`);
          }
          
          dbState.status = "healthy";
          dbState.isRecoveryMode = false;
        }
      }
    } else {
      // Database file is missing or empty. Is this a fresh install or a recovery failure?
      if (hasPriorInstallation) {
        logEvent("INFO", "Database file is missing, but prior installation markers exist. Attempting automatic recovery...");
        const recoverySuccess = attemptRecovery();
        
        if (!recoverySuccess) {
          logEvent("CRITICAL", "Database file is missing, and automatic recovery FAILED! Automatically starting with a clean database to restore service.");
          
          if (fs.existsSync(LIVE_BACKUP_PATH)) {
            try {
              fs.renameSync(LIVE_BACKUP_PATH, `${LIVE_BACKUP_PATH}.abandoned_${Date.now()}`);
            } catch (e) {}
          }
          
          dbInstance = new SQL.Database();
          initAuthDbSchema(dbInstance);
          
          try {
            const data = dbInstance.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
          } catch (writeErr) {
            logEvent("WARNING", `Failed to save fresh DB: ${writeErr}`);
          }
          
          dbState.status = "healthy";
          dbState.isRecoveryMode = false;
        }
      } else {
        // Clean start: File didn't exist or was empty, and there is no history of any prior installation
        logEvent("INFO", "Starting with a fresh empty database.");
        dbInstance = new SQL.Database();
        dbState.status = "healthy";
        dbState.isRecoveryMode = false;
        initAuthDbSchema(dbInstance);
        needsInitialBackup = true;
      }
    }
    
    if (needsInitialBackup && dbInstance && !dbState.isRecoveryMode) {
      try {
        const buffer = Buffer.from(dbInstance.export());
        createBackupSnapshot(buffer);
      } catch (err: any) {
        logEvent("WARNING", `Initial backup snapshot failed: ${err.message}`);
      }
    }
    
    return dbInstance;
  })();
  
  return dbPromise;
}

export function saveDb() {
  if (!dbInstance) return;
  if (dbState.isRecoveryMode) {
    console.log("Database is in Recovery Mode. Auto-save to production SQLite is BLOCKED to prevent overwriting.");
    return;
  }
  
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tempPath = DB_PATH + ".tmp";
    
    // Safe transactional write
    const fd = fs.openSync(tempPath, "w");
    fs.writeSync(fd, buffer);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    
    fs.renameSync(tempPath, DB_PATH);
    
    // Also save backup snapshot
    createBackupSnapshot(buffer);
  } catch (err: any) {
    console.error("Failed to save database file transactionally:", err);
    logEvent("WARNING", `Transactional write failed: ${err.message}`);
  }
}

export function initAuthDbSchema(db: any): void {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      is_guest INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS recovery_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      delay_days INTEGER NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      priority TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      action_type TEXT,
      action_data TEXT,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      recipient_email TEXT,
      sender_email TEXT,
      subject TEXT NOT NULL,
      provider TEXT,
      provider_message_id TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      request_payload TEXT,
      response_payload TEXT,
      created_at TEXT NOT NULL,
      type TEXT,
      opened_at TEXT,
      clicked_at TEXT,
      sent_at TEXT
    )`
  );

  // Safely add missing columns to email_logs if the table already existed
  const alterColumns = [
    "recipient_email TEXT",
    "sender_email TEXT",
    "provider TEXT",
    "provider_message_id TEXT",
    "error_message TEXT",
    "request_payload TEXT",
    "response_payload TEXT",
    "created_at TEXT",
    "type TEXT",
    "opened_at TEXT",
    "clicked_at TEXT",
    "sent_at TEXT"
  ];
  for (const col of alterColumns) {
    try {
      db.run(`ALTER TABLE email_logs ADD COLUMN ${col}`);
    } catch (e) {
      // Column might already exist
    }
  }

  db.run(
    `CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id TEXT PRIMARY KEY,
      daily_brief INTEGER DEFAULT 1,
      deadline_alerts INTEGER DEFAULT 1,
      weekly_report INTEGER DEFAULT 1,
      ai_coach INTEGER DEFAULT 1,
      future_you INTEGER DEFAULT 1,
      recovery_emails INTEGER DEFAULT 1,
      achievements INTEGER DEFAULT 1,
      marketing_emails INTEGER DEFAULT 1
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS google_calendar_tokens (
      user_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expiry_date INTEGER,
      connected_at TEXT NOT NULL
    )`
  );

  try {
    db.run(`DROP TABLE IF EXISTS google_calendar_events_cache`);
  } catch (err) {
    // Ignore
  }

  db.run(
    `CREATE TABLE IF NOT EXISTS google_calendar_events_cache (
      user_id NOT NULL,
      event_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT,
      meeting_link TEXT,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, event_id)
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS google_calendar_sync_status (
      user_id TEXT PRIMARY KEY,
      last_sync_time TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS google_calendar_preferences (
      user_id TEXT PRIMARY KEY,
      auto_sync INTEGER DEFAULT 1
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS voice_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      transcript TEXT NOT NULL,
      ai_interpretation TEXT,
      execution_result TEXT,
      success INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      export_type TEXT NOT NULL,
      filter_used TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      performed_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, name)
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
}

export async function initAuthDb(): Promise<void> {
  const db = await getDb();
  if (!dbState.isRecoveryMode) {
    initAuthDbSchema(db);
    saveDb();
    console.log("SQLite Auth Database (sql.js) initialized successfully.");
  }
}

export async function saveRecoveryPlan(userId: string, delayDays: number, planJson: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO recovery_plans (user_id, delay_days, plan_json, created_at) VALUES (?, ?, ?, ?)`,
    [userId, delayDays, planJson, now]
  );
  saveDb();
}

export async function getLatestRecoveryPlan(userId: string): Promise<{ id: number; delay_days: number; plan_json: string; created_at: string } | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM recovery_plans WHERE user_id = ? ORDER BY id DESC LIMIT 1`);
  let plan = null;
  stmt.bind([userId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    plan = {
      id: Number(row.id),
      user_id: String(row.user_id),
      delay_days: Number(row.delay_days),
      plan_json: String(row.plan_json),
      created_at: String(row.created_at)
    };
  }
  stmt.free();
  return plan;
}

export async function createUser(name: string, email: string, passwordHash: string): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();
  
  db.run(
    `INSERT INTO users (name, email, password_hash, created_at, last_login) VALUES (?, ?, ?, ?, NULL)`,
    [name, normalizedEmail, passwordHash, now]
  );
  
  // Get last inserted ID before saving (as saveDb/export resets last_insert_rowid)
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  
  let user: User | null = null;
  stmt.bind([normalizedEmail]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    user = {
      id: Number(row.id),
      name: String(row.name),
      email: String(row.email),
      password_hash: String(row.password_hash),
      created_at: String(row.created_at),
      last_login: row.last_login ? String(row.last_login) : null
    };
  }
  
  stmt.free();
  return user;
}

export async function updateUserPassword(email: string, passwordHash: string): Promise<boolean> {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  
  // Verify user exists first
  const stmt = db.prepare(`SELECT id FROM users WHERE email = ?`);
  stmt.bind([normalizedEmail]);
  const hasUser = stmt.step();
  stmt.free();
  
  if (!hasUser) {
    return false;
  }
  
  db.run(
    `UPDATE users SET password_hash = ? WHERE email = ?`,
    [passwordHash, normalizedEmail]
  );
  
  saveDb();
  return true;
}

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)`,
    [userId, tokenHash, expiresAt, now]
  );
  saveDb();
}

export async function getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM password_reset_tokens WHERE token_hash = ?`);
  
  let token: PasswordResetToken | null = null;
  stmt.bind([tokenHash]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    token = {
      id: Number(row.id),
      user_id: Number(row.user_id),
      token_hash: String(row.token_hash),
      expires_at: String(row.expires_at),
      used_at: row.used_at ? String(row.used_at) : null,
      created_at: String(row.created_at)
    };
  }
  stmt.free();
  return token;
}

export async function markPasswordResetTokenUsed(id: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`, [now, id]);
  saveDb();
}

export async function invalidateUserPasswordResetTokens(userId: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(`UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL`, [now, userId]);
  saveDb();
}

export async function deleteSessionsByUserId(userId: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
  saveDb();
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id: string;
  action: string;
  details: string;
  performed_by: string;
  created_at: string;
}

export async function saveTaskHistory(
  taskId: number,
  userId: string,
  action: string,
  details: string,
  performedBy: string = "Manual"
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO task_history (task_id, user_id, action, details, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [taskId, userId, action, details, performedBy, now]
  );
  saveDb();
}

export async function getTaskHistory(taskId: number, userId: string): Promise<TaskHistory[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM task_history WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC`);
  const results: TaskHistory[] = [];
  stmt.bind([taskId, userId]);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: Number(row.id),
      task_id: Number(row.task_id),
      user_id: String(row.user_id),
      action: String(row.action),
      details: row.details ? String(row.details) : "",
      performed_by: String(row.performed_by),
      created_at: String(row.created_at)
    });
  }
  stmt.free();
  return results;
}

export async function getRecentTaskHistory(userId: string, limit: number = 10): Promise<TaskHistory[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM task_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`);
  const results: TaskHistory[] = [];
  stmt.bind([userId, limit]);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: Number(row.id),
      task_id: Number(row.task_id),
      user_id: String(row.user_id),
      action: String(row.action),
      details: row.details ? String(row.details) : "",
      performed_by: String(row.performed_by),
      created_at: String(row.created_at)
    });
  }
  stmt.free();
  return results;
}

export async function logUserActivity(userId: string, activityType: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO user_activity (user_id, activity_type, created_at) VALUES (?, ?, ?)`,
    [userId, activityType, now]
  );
  saveDb();
}

export function getPastDateString(baseDateStr: string, daysAgo: number): string {
  const [year, month, day] = baseDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateVal = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
}

export async function getUserStreak(userId: string, todayStr: string): Promise<number> {
  const db = await getDb();
  
  const stmt = db.prepare(`SELECT DISTINCT substr(created_at, 1, 10) as adate FROM user_activity WHERE user_id = ? ORDER BY adate DESC`);
  stmt.bind([userId]);
  const dates: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    dates.push(String(row.adate));
  }
  stmt.free();
  
  const datesSet = new Set(dates);
  
  const hasToday = datesSet.has(todayStr);
  const yesterdayStr = getPastDateString(todayStr, 1);
  const hasYesterday = datesSet.has(yesterdayStr);
  
  if (!hasToday && !hasYesterday) {
    return 0;
  }
  
  let streak = 0;
  let currentDaysAgo = hasToday ? 0 : 1;
  
  while (true) {
    const checkDate = getPastDateString(todayStr, currentDaysAgo);
    if (datesSet.has(checkDate)) {
      streak++;
      currentDaysAgo++;
    } else {
      break;
    }
  }
  
  return streak;
}

export async function getUserById(id: number): Promise<User | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  
  let user: User | null = null;
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    user = {
      id: Number(row.id),
      name: String(row.name),
      email: String(row.email),
      password_hash: String(row.password_hash),
      created_at: String(row.created_at),
      last_login: row.last_login ? String(row.last_login) : null
    };
  }
  
  stmt.free();
  return user;
}

export async function createSession(userId: string, isGuest: boolean = false): Promise<string> {
  const db = await getDb();
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
  
  db.run(
    `INSERT INTO sessions (token, user_id, is_guest, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [token, userId, isGuest ? 1 : 0, now.toISOString(), expires.toISOString()]
  );
  
  saveDb();
  return token;
}

export async function getSession(token: string): Promise<{ token: string; user_id: string; is_guest: boolean; created_at: string; expires_at: string } | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM sessions WHERE token = ?`);
  
  let session = null;
  stmt.bind([token]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    session = {
      token: String(row.token),
      user_id: String(row.user_id),
      is_guest: Number(row.is_guest) === 1,
      created_at: String(row.created_at),
      expires_at: String(row.expires_at)
    };
  }
  
  stmt.free();
  
  if (session) {
    const expired = new Date() > new Date(session.expires_at);
    if (expired) {
      await deleteSession(token);
      return null;
    }
  }
  
  return session;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
  saveDb();
}

export async function updateLastLogin(id: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  db.run(
    `UPDATE users SET last_login = ? WHERE id = ?`,
    [now, id]
  );
  
  saveDb();

  try {
    db.run(
      `INSERT INTO user_activity (user_id, activity_type, created_at) VALUES (?, ?, ?)`,
      [String(id), "Login", now]
    );
    saveDb();
  } catch (err) {
    console.error("Error logging user login activity:", err);
  }
}

export async function saveNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  priority: string,
  actionType: string | null = null,
  actionData: string | null = null
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO notifications (user_id, title, message, type, priority, is_read, action_type, action_data, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [userId, title, message, type, priority, actionType, actionData, now]
  );
  
  // Get last inserted ID before saving (as saveDb/export resets last_insert_rowid)
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function getNotifications(userId: string): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC`);
  const list: any[] = [];
  stmt.bind([userId]);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: Number(row.id),
      userId: String(row.user_id),
      title: String(row.title),
      message: String(row.message),
      type: String(row.type),
      category: String(row.type),
      priority: String(row.priority),
      isRead: Number(row.is_read) === 1,
      actionType: row.action_type ? String(row.action_type) : null,
      actionData: row.action_data ? String(row.action_data) : null,
      createdAt: String(row.created_at)
    });
  }
  stmt.free();
  return list;
}

export async function markNotificationAsRead(userId: string, id: number): Promise<void> {
  const db = await getDb();
  db.run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
  saveDb();
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = await getDb();
  db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
  saveDb();
}

export async function deleteNotification(userId: string, id: number): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [id, userId]);
  saveDb();
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM notifications WHERE user_id = ?`, [userId]);
  saveDb();
}

export async function saveEmailLog(
  userId: string,
  type: string,
  subject: string,
  status: string,
  recipientEmail: string | null = null,
  senderEmail: string | null = null,
  provider: string | null = null,
  providerMessageId: string | null = null,
  errorMessage: string | null = null,
  requestPayload: string | null = null,
  responsePayload: string | null = null
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO email_logs (
      user_id, type, subject, sent_at, status,
      recipient_email, sender_email, provider, provider_message_id,
      error_message, request_payload, response_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(userId), type, subject, now, status,
      recipientEmail, senderEmail, provider, providerMessageId,
      errorMessage, requestPayload, responsePayload, now
    ]
  );
  
  // Get last inserted ID before saving (as saveDb/export resets last_insert_rowid)
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function updateEmailLogExtended(
  id: number,
  fields: {
    status?: string;
    provider?: string | null;
    senderEmail?: string | null;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    requestPayload?: string | null;
    responsePayload?: string | null;
    openedAt?: string | null;
    clickedAt?: string | null;
  }
): Promise<void> {
  const db = await getDb();
  const updates: string[] = [];
  const params: any[] = [];
  
  if (fields.status !== undefined) {
    updates.push("status = ?");
    params.push(fields.status);
  }
  if (fields.provider !== undefined) {
    updates.push("provider = ?");
    params.push(fields.provider);
  }
  if (fields.senderEmail !== undefined) {
    updates.push("sender_email = ?");
    params.push(fields.senderEmail);
  }
  if (fields.providerMessageId !== undefined) {
    updates.push("provider_message_id = ?");
    params.push(fields.providerMessageId);
  }
  if (fields.errorMessage !== undefined) {
    updates.push("error_message = ?");
    params.push(fields.errorMessage);
  }
  if (fields.requestPayload !== undefined) {
    updates.push("request_payload = ?");
    params.push(fields.requestPayload);
  }
  if (fields.responsePayload !== undefined) {
    updates.push("response_payload = ?");
    params.push(fields.responsePayload);
  }
  if (fields.openedAt !== undefined) {
    updates.push("opened_at = ?");
    params.push(fields.openedAt);
  }
  if (fields.clickedAt !== undefined) {
    updates.push("clicked_at = ?");
    params.push(fields.clickedAt);
  }
  
  if (updates.length > 0) {
    params.push(id);
    db.run(`UPDATE email_logs SET ${updates.join(", ")} WHERE id = ?`, params);
    saveDb();
  }
}

export async function updateEmailLogStatus(
  id: number,
  status: string,
  openedAt: string | null = null,
  clickedAt: string | null = null
): Promise<void> {
  await updateEmailLogExtended(id, {
    status,
    openedAt,
    clickedAt
  });
}

export async function getEmailLogs(userId: string): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM email_logs WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT) ORDER BY id DESC`);
  const list: any[] = [];
  stmt.bind([String(userId)]);
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: Number(row.id),
      userId: String(row.user_id),
      type: row.type ? String(row.type) : "System",
      subject: String(row.subject),
      sentAt: row.sent_at ? String(row.sent_at) : (row.created_at ? String(row.created_at) : new Date().toISOString()),
      openedAt: row.opened_at ? String(row.opened_at) : null,
      clickedAt: row.clicked_at ? String(row.clicked_at) : null,
      status: String(row.status),
      recipientEmail: row.recipient_email ? String(row.recipient_email) : "",
      senderEmail: row.sender_email ? String(row.sender_email) : "",
      provider: row.provider ? String(row.provider) : "",
      providerMessageId: row.provider_message_id ? String(row.provider_message_id) : "",
      errorMessage: row.error_message ? String(row.error_message) : "",
      requestPayload: row.request_payload ? String(row.request_payload) : "",
      responsePayload: row.response_payload ? String(row.response_payload) : "",
      createdAt: row.created_at ? String(row.created_at) : (row.sent_at ? String(row.sent_at) : new Date().toISOString())
    });
  }
  stmt.free();
  return list;
}

export async function getNotificationPreferences(userId: string): Promise<any> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM notification_preferences WHERE user_id = ?`);
  let prefs = null;
  stmt.bind([userId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    prefs = {
      userId: String(row.user_id),
      dailyBrief: Number(row.daily_brief) === 1,
      deadlineAlerts: Number(row.deadline_alerts) === 1,
      weeklyReport: Number(row.weekly_report) === 1,
      aiCoach: Number(row.daily_brief) === 1, // reuse daily brief or distinct
      futureYou: Number(row.future_you) === 1,
      recoveryEmails: Number(row.recovery_emails) === 1,
      achievements: Number(row.achievements) === 1,
      marketingEmails: Number(row.marketing_emails) === 1
    };
  }
  stmt.free();

  if (!prefs) {
    return {
      userId,
      dailyBrief: true,
      deadlineAlerts: true,
      weeklyReport: true,
      aiCoach: true,
      futureYou: true,
      recoveryEmails: true,
      achievements: true,
      marketingEmails: true
    };
  }
  return prefs;
}

export async function saveNotificationPreferences(userId: string, prefs: any): Promise<void> {
  const db = await getDb();
  
  const dailyBrief = prefs.dailyBrief !== undefined ? (prefs.dailyBrief ? 1 : 0) : 1;
  const deadlineAlerts = prefs.deadlineAlerts !== undefined ? (prefs.deadlineAlerts ? 1 : 0) : 1;
  const weeklyReport = prefs.weeklyReport !== undefined ? (prefs.weeklyReport ? 1 : 0) : 1;
  const aiCoach = prefs.aiCoach !== undefined ? (prefs.aiCoach ? 1 : 0) : 1;
  const futureYou = prefs.futureYou !== undefined ? (prefs.futureYou ? 1 : 0) : 1;
  const recoveryEmails = prefs.recoveryEmails !== undefined ? (prefs.recoveryEmails ? 1 : 0) : 1;
  const achievements = prefs.achievements !== undefined ? (prefs.achievements ? 1 : 0) : 1;
  const marketingEmails = prefs.marketingEmails !== undefined ? (prefs.marketingEmails ? 1 : 0) : 1;

  db.run(
    `INSERT OR REPLACE INTO notification_preferences (user_id, daily_brief, deadline_alerts, weekly_report, ai_coach, future_you, recovery_emails, achievements, marketing_emails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, dailyBrief, deadlineAlerts, weeklyReport, aiCoach, futureYou, recoveryEmails, achievements, marketingEmails]
  );
  saveDb();
}

export async function saveGoogleCalendarTokens(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expiry_date?: number }
): Promise<void> {
  const db = await getDb();
  const connectedAt = new Date().toISOString();
  
  // Use SELECT to check if refresh_token already exists and reuse it if not provided in the new tokens block
  let existingRefreshToken: string | null = null;
  const stmt = db.prepare(`SELECT refresh_token FROM google_calendar_tokens WHERE user_id = ?`);
  stmt.bind([userId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    existingRefreshToken = row.refresh_token ? String(row.refresh_token) : null;
  }
  stmt.free();

  const refreshToken = tokens.refresh_token || existingRefreshToken;
  const expiryDate = tokens.expiry_date || null;

  db.run(
    `INSERT OR REPLACE INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date, connected_at) VALUES (?, ?, ?, ?, ?)`,
    [userId, tokens.access_token, refreshToken, expiryDate, connectedAt]
  );
  saveDb();
}

export async function getGoogleCalendarTokens(
  userId: string
): Promise<{ access_token: string; refresh_token?: string; expiry_date?: number; connected_at: string } | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM google_calendar_tokens WHERE user_id = ?`);
  stmt.bind([userId]);
  let tokens = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    tokens = {
      access_token: String(row.access_token),
      refresh_token: row.refresh_token ? String(row.refresh_token) : undefined,
      expiry_date: row.expiry_date ? Number(row.expiry_date) : undefined,
      connected_at: String(row.connected_at),
    };
  }
  stmt.free();
  return tokens;
}

export async function deleteGoogleCalendarTokens(userId: string): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM google_calendar_tokens WHERE user_id = ?`, [userId]);
  db.run(`DELETE FROM google_calendar_events_cache WHERE user_id = ?`, [userId]);
  db.run(`DELETE FROM google_calendar_sync_status WHERE user_id = ?`, [userId]);
  saveDb();
}

export async function saveCachedEvents(userId: string, events: any[]): Promise<void> {
  const db = await getDb();
  // Clear old cache for this user first
  db.run(`DELETE FROM google_calendar_events_cache WHERE user_id = ?`, [userId]);
  
  const now = new Date().toISOString();
  for (const ev of events) {
    db.run(
      `INSERT OR REPLACE INTO google_calendar_events_cache (user_id, event_id, title, description, start_time, end_time, location, meeting_link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        ev.id || String(Math.random()),
        ev.summary || "Untitled Event",
        ev.description || "",
        ev.start?.dateTime || ev.start?.date || "",
        ev.end?.dateTime || ev.end?.date || "",
        ev.location || "",
        ev.hangoutLink || ev.htmlLink || "",
        now
      ]
    );
  }
  saveDb();
}

export async function getCachedEvents(userId: string): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM google_calendar_events_cache WHERE user_id = ? ORDER BY start_time ASC`);
  stmt.bind([userId]);
  const list: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: String(row.event_id),
      summary: String(row.title),
      description: row.description ? String(row.description) : "",
      start: {
        dateTime: String(row.start_time)
      },
      end: {
        dateTime: String(row.end_time)
      },
      location: row.location ? String(row.location) : "",
      hangoutLink: row.meeting_link ? String(row.meeting_link) : "",
    });
  }
  stmt.free();
  return list;
}

export async function saveCalendarSyncTimestamp(userId: string, timestamp: string): Promise<void> {
  const db = await getDb();
  db.run(`INSERT OR REPLACE INTO google_calendar_sync_status (user_id, last_sync_time) VALUES (?, ?)`, [userId, timestamp]);
  saveDb();
}

export async function getCalendarSyncTimestamp(userId: string): Promise<string | null> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT last_sync_time FROM google_calendar_sync_status WHERE user_id = ?`);
  stmt.bind([userId]);
  let timestamp: string | null = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    timestamp = row.last_sync_time ? String(row.last_sync_time) : null;
  }
  stmt.free();
  return timestamp;
}

export async function saveCalendarPreferences(userId: string, prefs: { auto_sync: boolean }): Promise<void> {
  const db = await getDb();
  db.run(`INSERT OR REPLACE INTO google_calendar_preferences (user_id, auto_sync) VALUES (?, ?)`, [userId, prefs.auto_sync ? 1 : 0]);
  saveDb();
}

export async function getCalendarPreferences(userId: string): Promise<{ auto_sync: boolean }> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT auto_sync FROM google_calendar_preferences WHERE user_id = ?`);
  stmt.bind([userId]);
  let autoSync = true;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    autoSync = Number(row.auto_sync) === 1;
  }
  stmt.free();
  return { auto_sync: autoSync };
}

export async function saveVoiceHistory(
  userId: string,
  transcript: string,
  aiInterpretation: string,
  executionResult: string,
  success: number
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO voice_history (user_id, transcript, ai_interpretation, execution_result, success, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, transcript, aiInterpretation, executionResult, success, now]
  );
  
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function getVoiceHistory(userId: string): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM voice_history WHERE user_id = ? ORDER BY id DESC`);
  stmt.bind([userId]);
  const list: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: Number(row.id),
      userId: String(row.user_id),
      transcript: String(row.transcript),
      aiInterpretation: row.ai_interpretation ? String(row.ai_interpretation) : "",
      executionResult: row.execution_result ? String(row.execution_result) : "",
      success: Number(row.success) === 1,
      createdAt: String(row.created_at)
    });
  }
  stmt.free();
  return list;
}

export async function saveExportHistory(
  userId: string,
  exportType: string,
  filterUsed: string,
  fileName: string
): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO export_history (user_id, export_type, filter_used, file_name, created_at) VALUES (?, ?, ?, ?, ?)`,
    [userId, exportType, filterUsed, fileName, now]
  );
  
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function getExportHistory(userId: string): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM export_history WHERE user_id = ? ORDER BY id DESC`);
  stmt.bind([userId]);
  const list: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: Number(row.id),
      userId: String(row.user_id),
      exportType: String(row.export_type),
      filterUsed: String(row.filter_used),
      fileName: String(row.file_name),
      createdAt: String(row.created_at)
    });
  }
  stmt.free();
  return list;
}

export interface CustomCategory {
  id: number;
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCategories(userId: string): Promise<CustomCategory[]> {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM categories WHERE user_id = ? ORDER BY id ASC`);
  stmt.bind([userId]);
  const list: CustomCategory[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    list.push({
      id: Number(row.id),
      userId: String(row.user_id),
      name: String(row.name),
      color: row.color ? String(row.color) : undefined,
      icon: row.icon ? String(row.icon) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    });
  }
  stmt.free();
  return list;
}

export async function createCategory(userId: string, name: string, color?: string, icon?: string): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // Duplicate check
  const checkStmt = db.prepare(`SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = ?`);
  checkStmt.bind([userId, name.toLowerCase()]);
  const exists = checkStmt.step();
  checkStmt.free();
  if (exists) {
    throw new Error("Category name already exists.");
  }

  db.run(
    `INSERT INTO categories (user_id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, color || null, icon || null, now, now]
  );
  
  let insertId = 0;
  const result = db.exec("SELECT last_insert_rowid() as id");
  if (result && result[0] && result[0].values && result[0].values[0]) {
    insertId = Number(result[0].values[0][0]);
  }
  
  saveDb();
  return insertId;
}

export async function updateCategory(userId: string, id: number, name: string, color?: string, icon?: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  
  // Duplicate check for renaming
  const checkStmt = db.prepare(`SELECT id FROM categories WHERE user_id = ? AND LOWER(name) = ? AND id != ?`);
  checkStmt.bind([userId, name.toLowerCase(), id]);
  const exists = checkStmt.step();
  checkStmt.free();
  if (exists) {
    throw new Error("Category name already exists.");
  }

  db.run(
    `UPDATE categories SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    [name, color || null, icon || null, now, id, userId]
  );
  saveDb();
}

export async function deleteCategory(userId: string, id: number): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [id, userId]);
  saveDb();
}
