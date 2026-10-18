#!/usr/bin/env node
// Copies every table of a SAMS MySQL database into a backup folder:
//   backup.json  - everything, used by db-restore.mjs to load a new database
//   <table>.csv  - the same rows, readable in Excel / Google Sheets
//
// Usage:  SOURCE_DATABASE_URL="mysql://user:pass@host:port/db" node scripts/db-backup.mjs [--keep-photos]
// Profile photos are left out unless --keep-photos is given.
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const url = process.env.SOURCE_DATABASE_URL;
if (!url) {
  console.error("Set SOURCE_DATABASE_URL to the database you want to back up.");
  process.exit(1);
}
const keepPhotos = process.argv.includes("--keep-photos");
// Login sessions and one-time-code records are temporary; nobody needs them after a move.
const SKIP_ROWS = new Set(["user_sessions", "otp_login_challenges", "otp_rate_limits"]);
const PHOTO_COLUMNS = { members: ["photoUrl"], users: ["photo_url"] };

const conn = await mysql.createConnection({
  uri: url,
  dateStrings: true, // keep dates exactly as stored, so they restore unchanged
  ssl: process.env.SOURCE_DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});
await conn.query("SET time_zone = '+00:00'");

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const outDir = path.resolve(`sams-backup-${stamp}`);
fs.mkdirSync(outDir, { recursive: true });

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = Buffer.isBuffer(v) ? `[${v.length} bytes]` : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const [tableRows] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
const tables = tableRows.map((r) => Object.values(r)[0]);
const backup = { createdAt: new Date().toISOString(), photosIncluded: keepPhotos, tables: [] };

for (const table of tables) {
  const [[create]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  let rows = [];
  if (!SKIP_ROWS.has(table)) {
    [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  }
  if (!keepPhotos && PHOTO_COLUMNS[table]) {
    for (const row of rows) for (const col of PHOTO_COLUMNS[table]) if (col in row) row[col] = null;
  }
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const jsonRows = rows.map((row) =>
    columns.map((c) => (Buffer.isBuffer(row[c]) ? { __b64: row[c].toString("base64") } : row[c]))
  );
  backup.tables.push({ name: table, createSql: create["Create Table"], columns, rows: jsonRows });

  if (rows.length) {
    const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n");
    fs.writeFileSync(path.join(outDir, `${table}.csv`), "﻿" + csv);
  }
  console.log(`  ${table.padEnd(28)} ${String(rows.length).padStart(6)} rows`);
}

fs.writeFileSync(path.join(outDir, "backup.json"), JSON.stringify(backup));
await conn.end();
console.log(`\nBackup saved in: ${outDir}`);
console.log("Keep this folder safe (e.g. Google Drive). It contains members' personal details.");
