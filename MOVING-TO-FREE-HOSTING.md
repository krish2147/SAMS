# Moving SAMS from Railway to free hosting

Website: **Render** (free web service). Database: **Aiven** (free MySQL, 1 GB).

Free-plan trade-offs: the website sleeps after 15 minutes without visitors and the first
visit after that takes about a minute; Aiven may power the database off after a long
period of no use (it emails first, and it can be switched back on).

## 1. Back up the Railway database (on the Mac, once)
Railway's database only accepts connections from inside Railway, so open it briefly:
1. Railway → SAMS project → **MySQL** → Settings → Networking → **TCP Proxy** → enable for port `3306`.
2. MySQL → Variables → copy **MYSQL_PUBLIC_URL**.
3. In the SAMS folder on the Mac (`git pull` first):
   ```sh
   SOURCE_DATABASE_URL="<paste MYSQL_PUBLIC_URL>" node scripts/db-backup.mjs
   ```
   This makes a `sams-backup-<date>` folder: `backup.json` plus one Excel-readable `.csv`
   per table. Profile photos are left out (add `--keep-photos` to keep them).
4. Copy the folder to Google Drive. Then turn the TCP Proxy off again.

## 2. Create the free database (Aiven)
aiven.io → sign up → Create service → **MySQL** → plan **Free** → nearest region.
When it's running, copy the **Service URI** (`mysql://avnadmin:...@...:port/defaultdb?ssl-mode=REQUIRED`).

## 3. Load the backup into Aiven (on the Mac)
```sh
TARGET_DATABASE_URL="<Aiven Service URI without ?ssl-mode=REQUIRED>" TARGET_DB_SSL=true \
  node scripts/db-restore.mjs ./sams-backup-<date>/backup.json
```
It refuses to write into a database that already has SAMS tables, and checks every
table's row count at the end.

## 4. Create the website (Render)
render.com → sign up with GitHub → **New → Blueprint** → choose `krish2147/SAMS`.
Fill the values it asks for:
- `DATABASE_URL`: the same Aiven URI as step 3 (without `?ssl-mode=REQUIRED`)
- `APP_URL` and `APP_BASE_URL`: `https://sams.onrender.com` (or the address Render shows)
- Razorpay, MSG91, `OTP_HASH_SECRET`, `INVOICE_LINK_SECRET`: copy from Railway → SAMS → Variables
Optional: `INVOICE_GSTIN` (academy's real GSTIN, printed on invoices), WhatsApp via Meta
(`WHATSAPP_PROVIDER=meta`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`).

## 5. Point outside services at the new address
- Razorpay → Settings → Webhooks → change the URL to `https://<new address>/api/payments/webhook`.
- Reinstall the app on phones from the new address.

## 6. Switch Railway off
Only after logging in on the new site and checking members and payments are there.

## What changed in the app for hosts without a permanent disk
- Invoice PDFs are rebuilt from the payment record whenever the file is missing.
- Registration no longer collects member photos (nothing is stored on disk).
- `DB_SSL=true` enables the encrypted connection hosted databases require.
