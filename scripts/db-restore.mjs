#!/usr/bin/env node
// Loads a backup made by db-backup.mjs into a new, empty MySQL database.
//
// Usage:
//   TARGET_DATABASE_URL="mysql://user:pass@host:port/db" TARGET_DB_SSL=true \
//     node scripts/db-restore.mjs ./sams-backup-XXXX/backup.json
// Optional: TARGET_DB_CA_FILE=./ca.pem to pin the provider's certificate.
// Refuses to touch a database that already has SAMS tables, unless --replace is given.
import fs from "fs";
import mysql from "mysql2/promise";

const url = process.env.TARGET_DATABASE_URL;
const file = process.argv.find((a) => a.endsWith(".json"));
if (!url || !file) {
  console.error("Usage: TARGET_DATABASE_URL=... node scripts/db-restore.mjs <path-to-backup.json> [--replace]");
  process.exit(1);
}
const replace = process.argv.includes("--replace");
const backup = JSON.parse(fs.readFileSync(file, "utf8"));

const ssl = process.env.TARGET_DB_CA_FILE
  ? { ca: fs.readFileSync(process.env.TARGET_DB_CA_FILE, "utf8"), rejectUnauthorized: true }
  : process.env.TARGET_DB_SSL === "true" ? { rejectUnauthorized: true } : undefined;
const conn = await mysql.createConnection({ uri: url, ssl, dateStrings: true });
await conn.query("SET time_zone = '+00:00'");

const [existing] = await conn.query("SHOW TABLES");
const existingNames = new Set(existing.map((r) => Object.values(r)[0]));
const clash = backup.tables.filter((t) => existingNames.has(t.name)).map((t) => t.name);
if (clash.length && !replace) {
  console.error(`The target database already has tables: ${clash.join(", ")}.`);
  console.error("Nothing was changed. Use an empty database, or add --replace to overwrite them.");
  process.exit(1);
}

await conn.query("SET FOREIGN_KEY_CHECKS = 0");
try {
  for (const t of backup.tables) {
    if (replace) await conn.query(`DROP TABLE IF EXISTS \`${t.name}\``);
    await conn.query(t.createSql);
  }
  for (const t of backup.tables) {
    if (!t.rows.length) { console.log(`  ${t.name.padEnd(28)}      0 rows`); continue; }
    const cols = t.columns.map((c) => `\`${c}\``).join(", ");
    for (let i = 0; i < t.rows.length; i += 200) {
      const chunk = t.rows.slice(i, i + 200).map((row) =>
        row.map((v) => (v && typeof v === "object" && "__b64" in v ? Buffer.from(v.__b64, "base64") : v))
      );
      await conn.query(`INSERT INTO \`${t.name}\` (${cols}) VALUES ?`, [chunk]);
    }
    console.log(`  ${t.name.padEnd(28)} ${String(t.rows.length).padStart(6)} rows`);
  }
} finally {
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");
}

// Check the copy: every table must hold exactly the rows that were backed up.
let ok = true;
for (const t of backup.tables) {
  const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t.name}\``);
  if (Number(n) !== t.rows.length) { ok = false; console.error(`  MISMATCH ${t.name}: expected ${t.rows.length}, found ${n}`); }
}
await conn.end();
console.log(ok ? "\nRestore complete. Every table matches the backup." : "\nRestore finished with mismatches (see above).");
process.exit(ok ? 0 : 1);
