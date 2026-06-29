import path from "path";
import fs from "fs";
import { 
  getDb, 
  forceReloadDbInstance, 
  dbState, 
  getDbState, 
  createUser, 
  getUserByEmail, 
  saveDb 
} from "./server/auth_db.js";

async function runVerification() {
  console.log("=============================================================");
  console.log("      DATABASE RECOVERY VERIFICATION (PHASE 4 REPORT)        ");
  console.log("=============================================================\n");

  const DB_PATH = path.resolve(process.cwd(), "timehero_db.sqlite");
  const BACKUP_DIR = path.resolve(process.cwd(), "backups");
  const LIVE_BACKUP_PATH = path.resolve(process.cwd(), "timehero_db.backup.sqlite");

  const report = {
    test1_backupCreated: "FAIL",
    test2_automaticRecoveryFromSnapshot: "FAIL",
    test3_blockSilentFreshStarts: "FAIL",
    test4_recoveryModeTriggered: "FAIL",
    overallStatus: "FAIL"
  };

  // Step 0: Ensure DB is loaded and insert a test verification user
  console.log("[SETUP] Cleaning up any old database, backup, or malformed files to start fresh...");
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  if (fs.existsSync(LIVE_BACKUP_PATH)) fs.unlinkSync(LIVE_BACKUP_PATH);
  if (fs.existsSync(path.resolve(process.cwd(), "db_recovery_logs.json"))) {
    try { fs.unlinkSync(path.resolve(process.cwd(), "db_recovery_logs.json")); } catch(e) {}
  }
  if (fs.existsSync(BACKUP_DIR)) {
    fs.readdirSync(BACKUP_DIR).forEach(f => {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
      } catch (e) {}
    });
  }
  fs.readdirSync(process.cwd()).forEach(f => {
    if (f.startsWith("timehero_db.sqlite.malformed_")) {
      try {
        fs.unlinkSync(path.resolve(process.cwd(), f));
      } catch (e) {}
    }
  });

  console.log("[SETUP] Initializing database and adding verification user...");
  await forceReloadDbInstance();
  
  const testEmail = `verify_user_${Date.now()}@test.com`;
  const testName = "Diagnostics Test User";
  const testPasswordHash = "test_hashed_pwd";
  
  const userId = await createUser(testName, testEmail, testPasswordHash);
  console.log(`[SETUP] Inserted verification user with ID: ${userId}, Email: ${testEmail}`);
  
  // Save DB transactionally (this will flush and create a backup snapshot)
  saveDb();
  console.log("[SETUP] Database saved transactionally.");

  // Test 1: Check if Backups & Snapshots were automatically created
  console.log("\n[TEST 1] Verifying automatic backup snapshot generation...");
  const snapshots = fs.existsSync(BACKUP_DIR) 
    ? fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("timehero_db_backup_") && f.endsWith(".sqlite"))
    : [];
  
  const liveBackupExists = fs.existsSync(LIVE_BACKUP_PATH);
  console.log(`  - Live Backup File Exists: ${liveBackupExists ? "YES" : "NO"}`);
  console.log(`  - Timestamped Snapshots Found: ${snapshots.length}`);
  
  if (liveBackupExists && snapshots.length > 0) {
    report.test1_backupCreated = "PASS";
    console.log("  => TEST 1 RESULT: PASS");
  } else {
    console.log("  => TEST 1 RESULT: FAIL");
  }

  // Test 2: Simulate Database Corruption with Working Backup Available
  console.log("\n[TEST 2] Simulating database corruption with a valid backup available...");
  console.log("  - Overwriting active sqlite header with garbage...");
  fs.writeFileSync(DB_PATH, Buffer.from("CORRUPT_HEADER_GARBAGE_BYTES_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X"));
  
  console.log("  - Reloading database instance (triggers startup diagnostics)...");
  const db = await forceReloadDbInstance();
  const state = getDbState();
  
  console.log(`  - Database Status: ${state.status.toUpperCase()}`);
  console.log(`  - Is in Recovery Mode: ${state.isRecoveryMode ? "YES" : "NO"}`);
  
  // Verify that the test user can still be fetched (recovered from snapshot!)
  const user = await getUserByEmail(testEmail);
  console.log(`  - Recovered User Lookup: ${user ? "SUCCESS" : "FAILED"}`);
  
  if (state.status === "recovered" && !state.isRecoveryMode && user && user.name === testName) {
    report.test2_automaticRecoveryFromSnapshot = "PASS";
    console.log("  => TEST 2 RESULT: PASS (Automatic self-healing restored user data!)");
  } else {
    console.log("  => TEST 2 RESULT: FAIL");
  }

  // Test 3 & 4: Simulate Database Corruption with NO Working Backups Available
  console.log("\n[TEST 3 & 4] Simulating database corruption with ALL backups unavailable...");
  console.log("  - Deleting backups & snapshots...");
  if (fs.existsSync(LIVE_BACKUP_PATH)) fs.unlinkSync(LIVE_BACKUP_PATH);
  snapshots.forEach(f => {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    } catch(e) {}
  });
  
  console.log("  - Overwriting active sqlite header with garbage again...");
  fs.writeFileSync(DB_PATH, Buffer.from("MORE_CORRUPT_HEADER_GARBAGE_BYTES_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X_X"));
  
  console.log("  - Reloading database instance...");
  await forceReloadDbInstance();
  const finalState = getDbState();
  
  console.log(`  - Database Status: ${finalState.status.toUpperCase()}`);
  console.log(`  - Is in Recovery Mode: ${finalState.isRecoveryMode ? "YES" : "NO"}`);
  
  // Check if a new sqlite database file was silently created
  const isFreshDbSilentlyCreated = fs.existsSync(DB_PATH) && fs.readFileSync(DB_PATH).length > 100;
  console.log(`  - Fresh Database File Silently Created on Disk: ${isFreshDbSilentlyCreated ? "YES" : "NO"}`);
  
  // The system must not have silently started a fresh empty database
  const isDiskFileBlockedOrCorrupted = !fs.existsSync(DB_PATH) || fs.readFileSync(DB_PATH, "utf-8").startsWith("MORE_CORRUPT_HEADER_GARBAGE");
  console.log(`  - Disk File Erased/Silently Reset Blocked: ${isDiskFileBlockedOrCorrupted ? "YES" : "NO"}`);

  if (isDiskFileBlockedOrCorrupted) {
    report.test3_blockSilentFreshStarts = "PASS";
    console.log("  => TEST 3 RESULT: PASS (Successfully blocked silent fresh start on disk!)");
  } else {
    console.log("  => TEST 3 RESULT: FAIL");
  }

  if (finalState.isRecoveryMode && finalState.status === "compromised") {
    report.test4_recoveryModeTriggered = "PASS";
    console.log("  => TEST 4 RESULT: PASS (Database successfully started in Recovery Mode!)");
  } else {
    console.log("  => TEST 4 RESULT: FAIL");
  }

  // Restore everything to healthy state for production use
  console.log("\n[CLEANUP] Rebuilding a pristine database for live application...");
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  await forceReloadDbInstance();
  console.log("[CLEANUP] Clean empty database initialized successfully.");

  // Overall Status
  if (
    report.test1_backupCreated === "PASS" &&
    report.test2_automaticRecoveryFromSnapshot === "PASS" &&
    report.test3_blockSilentFreshStarts === "PASS" &&
    report.test4_recoveryModeTriggered === "PASS"
  ) {
    report.overallStatus = "PASS";
  }

  console.log("\n=============================================================");
  console.log("                    FINAL PASS/FAIL REPORT                   ");
  console.log("=============================================================");
  console.log(`  [TEST 1] Backups & Snapshots Generated:      ${report.test1_backupCreated}`);
  console.log(`  [TEST 2] Automatic Recovery (Snapshot):      ${report.test2_automaticRecoveryFromSnapshot}`);
  console.log(`  [TEST 3] Blocked Silent Disk Erasures:      ${report.test3_blockSilentFreshStarts}`);
  console.log(`  [TEST 4] Start in Recovery Mode Triggered:   ${report.test4_recoveryModeTriggered}`);
  console.log("-------------------------------------------------------------");
  console.log(`  OVERALL RECOVERY PROTECTION STATUS:          ${report.overallStatus}`);
  console.log("=============================================================\n");
  
  if (report.overallStatus === "PASS") {
    console.log("SUCCESS: All recovery protection constraints successfully verified.");
    process.exit(0);
  } else {
    console.error("FAIL: One or more recovery protection parameters failed validation.");
    process.exit(1);
  }
}

runVerification().catch(console.error);
