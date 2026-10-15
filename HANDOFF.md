# SAMS — Working Handoff

Baroda Swim Front membership system. This document is for whoever picks the project up next,
including a cloud session that has only this repository and no access to the working machine.
It records what is verified, what is not, and the traps that have cost real time.

Last updated: 14 October 2026.

---

## 1. What is verified working

Confirmed end to end against real MySQL, real Razorpay (test mode) and real MSG91 — not by
reading code:

- **Registration → approval → payment → activation.** A member registers, an admin approves,
  a Razorpay **Payment Link** is sent over WhatsApp, the member pays, the `payment_link.paid`
  webhook activates the membership and sets the inclusive end date.
- **Invoice.** A numbered PDF is generated with the academy logo and authorised signature and
  delivered over WhatsApp as an attachment.
- **SMS OTP login.** Real SMS from DLT sender `BARSWF`, verified locally against a stored hash,
  issuing a session. Wrong code, replay, expiry, resend cooldown and rate limits all enforced.
- **Member portal.** Overview, membership, batch, payments, attendance, profile and security,
  on real data.

### Not verified
- The webhook has **never fired against a public domain** — only through an ngrok tunnel. This
  is the single biggest untested path and the main reason to deploy.
- Renewal has been fixed to require verified payment but has **not** been run end to end.
- Six test files do not compile (see §5), so batch management, approvals and payments have no
  working automated coverage.

---

## 2. Running it

```sh
npm install
cp .env.example .env      # fill in real values; never commit .env
npm run dev               # http://localhost:3000
npm run build             # production bundle, must pass before deploying
```

`npm run dev` does **not** watch server files. After changing anything under `src/services`,
`src/routes` or `server.ts`, restart it or you will be testing stale code. This has caused
confusion more than once.

Without `DB_HOST` the app silently falls back to a JSON mock database in development. If
queries behave strangely, confirm you are actually on MySQL — production refuses to fall back.

---

## 3. Deploying

The app accepts three credential conventions, so most managed hosts work without remapping:

1. Explicit `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` (highest precedence)
2. A connection URL — `DATABASE_URL` or `MYSQL_URL`
3. `MYSQLHOST` / `MYSQLUSER` / … as injected by managed MySQL add-ons

`railway.json` pins the Docker build and points the platform at `/healthz`, which reports
unhealthy when the database is unreachable.

**Required in production** (startup aborts otherwise): `APP_URL`, `APP_BASE_URL`, database
credentials in any of the forms above, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, an MSG91 auth key, a WhatsApp sender number and namespace, and
`OTP_HASH_SECRET`. Set `REQUIRE_OBJECT_STORAGE=false` unless object storage is configured.
See `.env.example` for the full list.

### After deploying
- Point the Razorpay webhook at `https://YOUR_DOMAIN/api/payments/webhook`.
- Subscribe to `payment.captured`, `payment.failed`, `refund.processed` **and
  `payment_link.paid`**. It is the event the WhatsApp payment-link flow depends on, and
  registration will appear to hang without it.
- Keep Razorpay on **test keys** for any demo.
- Uploads are ephemeral on most hosts. Invoices regenerate on demand from the database, so
  this is survivable, but member photos are not.

---

## 4. Traps in this codebase

Read this section before trusting anything. These are patterns, not one-offs.

### Built but wired to nothing
Working, well-written code that no route or component references. Before building a feature,
check whether it already exists:

- `src/member-dashboard/` — 37 components, unused until October 2026 while members were served
  a 1,917-line legacy file.
- `src/components/MembershipPlanSelector.tsx` — still unused; the correct plan selector.
- `src/services/post-payment-worker.service.ts` — existed but was never started, and called a
  method that had never been written.
- `otp_login_challenges` / `otp_rate_limits` — tables present in the working database, absent
  from `schema.sql` until added back.

### Invented data presented as fact
Repeatedly found and repeatedly removed. Assume more remains:

- A member's dashboard showed a coach derived from their gender, and a stand-in batch with a
  real-looking time for members who had no allocation.
- Attendance showed a percentage computed by dividing by a flat 22 days, with a literal `80`
  when there was no data this month.
- Walk-in intake stored an invented date of birth, blood group, address, email and an
  emergency contact of `+91 99999 88888` — the number staff would have called in an incident.
- The invoice carried a hardcoded GSTIN.

If a value looks plausible but nobody entered it, check where it came from. Prefer an empty
state over a confident guess, particularly for anything medical, financial or safety related.

### Schema drift
`schema.sql` has repeatedly lagged the working database. A fresh database is the only way to
catch this — create an empty one and exercise the flow rather than assuming. The 2026 rate card
and the plan-selection columns were both missing, which would have broken every registration on
a new deployment. Both are now seeded/migrated by `src/config/db.ts` (`OFFICIAL_MEMBERSHIP_PLANS`).

### Pricing
Registration resolves exactly one plan from `plan_category` + `frequency_code` +
`duration_code`. Plans 1–6 are legacy stubs with none of those codes; plans 7–33 are the real
2026 rate card. `PlanRepository.findByName` must never regain its "default to the first plan"
fallback — that silently charged every registration ₹2,500 regardless of what was chosen.

---

## 5. Open items

**Before real members use it**
- Rotate the Razorpay secret that was exposed during development; switch to live keys.
- Set `PUBLIC_BASE_URL` to the real domain — it currently points at a dead ngrok tunnel, so
  invoice links are broken.
- Audit session restore: the frontend may trust `localStorage` when backend verification
  fails. Production should fail closed.
- Member password change calls `/api/staff/update-password`; confirm role separation.

**Launch plan.** Until a launch date is fixed, the system is shown to the client as a
walkthrough of screenshots taken on sample data. Before launch, deploy to production as in
§3 (managed MySQL, real domain, Razorpay live keys) and work through this list.

**Fix before launch (found October 2026)**
- `POST /api/members/pay` (no screen uses it) defaults the amount to ₹120, invents a
  `pay_rzp_…` transaction id, and never sets membership start/end dates. Fix or remove it
  before anything calls it.
- In development, `uploads/mock-database.json` (including password hashes) is served by the
  public `/uploads` route. Production refuses the mock database, but member photos under
  `/uploads` are public too — decide whether they should need a login.
- Walk-in intake (`directRegister`) still falls back to a "General" plan and the cricket
  "Morning Sunrise Batch (A)" when none is given, and to gender "male".
- Staff and coach avatars are stock photos from Unsplash.
- One member-dashboard test still fails (calendar routes do not resolve the member).

**Fixed October 2026:**
- Invoices and receipts were downloadable by anyone counting up the invoice id; they now
  need a staff login, and members fetch only their own.
- The member portal's membership, batch and payment screens now read the stored values.
- An unverified saved session no longer opens a dashboard.
- The reception emergency card showed a made-up dial-able number for every member, blood
  group O+ and a wrong medical reading; registration, walk-in intake, profile edits and the
  database no longer invent medical, blood group, address or emergency values.
- Dashboard revenue, the Reports charts and the staff attendance endpoint now use real data.

**Known broken**
- Six test files do not compile, referencing exports that do not exist:
  `batch-management`, `batch-operations`, `member-approval`, `payment`,
  `payment-success-whatsapp`, `pdf-invoice`. They give false confidence — nothing is actually
  covering those areas.
- `communication_templates` / `sendEventNotification` is misconfigured and silently fails on
  every call. Its 18 seeded SMS templates are not DLT-registered and cannot send in India.

**Not built**
- Nothing writes to the `attendance` table. The member attendance page is complete but has no
  source of data until reception check-in exists.
- Notifications and Help & Support are empty states in the member portal.
- No renewal reminders. The academy wants them 4 days before expiry; the existing template
  says 3.
- Attendance has no percentage because `batches` records no weekday schedule. Add days-of-week
  to `batches` and it becomes computable honestly.

**Design**
- Member portal and staff console share one system (navy chrome, aqua accent, tokens in
  `src/index.css`). Receptionist and coach consoles have not had that pass.

---

## 6. External configuration

Held outside this repository. Values are in `.env`, never committed.

- **DLT (SmartPing):** entity `BARODA SWIM FRONT`, PE ID `1701178878914284671`, sender header
  `BARSWF`, OTP content template `1777179075213426676`. All approved and active.
- **MSG91:** sender `BARSWF` mapped to the DLT template. OTP is sent through `sendhttp` with
  `DLT_TE_ID`, **not** the `/api/v5/otp` product — that endpoint returns success for any input,
  including a bogus template id, and delivers nothing. Do not move back to it.
- **Razorpay:** currently test mode. Registration uses Payment **Links**; renewal uses Orders
  with embedded checkout. They confirm via different webhook events.

Useful for debugging delivery: `POST https://control.msg91.com/api/v5/report/logs/sms` with an
`authkey` header returns delivery status, sender, failure reason and the full message body.
Faster and more truthful than the dashboard.
