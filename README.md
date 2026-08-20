# Swimming Academy Membership System (SAMS)

SAMS is a React and Express membership application backed by MySQL. New registrations enter admin approval, approval creates a server-priced Razorpay order, and its checkout URL is sent through WhatsApp.

## Run Locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure the required integrations.
3. Run `npm run dev`.

In development, the app can use its local JSON database when MySQL is unavailable. Production never falls back to that database.

## Production requirements

- Node.js service using `npm run build` and `npm start`
- MySQL database with automated backups
- Persistent volume mounted at the path configured by `UPLOAD_DIR`
- Public HTTPS URL assigned to both `APP_URL` and `APP_BASE_URL`
- Razorpay webhook URL: `https://YOUR_DOMAIN/api/webhook/razorpay`
- Razorpay events: `payment.captured`, `payment.failed`, and `refund.processed`

The first startup against an empty production database requires `INITIAL_ADMIN_EMAIL` and an `INITIAL_ADMIN_PASSWORD` of at least 12 characters. Remove those bootstrap values after the administrator has been created.

## DigitalOcean deployment

The selected production target is DigitalOcean in the Bangalore region:

1. Create a Managed MySQL 8 cluster in `blr1` with automated backups.
2. Create a private Spaces bucket in `blr1` for member photos and invoices.
3. Copy `deploy/digitalocean-app.yaml.example`, replace the GitHub repository and MySQL cluster placeholders, and create the App Platform app from that spec.
4. Add the Razorpay, MSG91, Spaces, SMTP, and initial-administrator values from `.env.example` as encrypted runtime variables in App Platform.
5. Deploy with one `apps-s-1vcpu-1gb` instance for the pilot. After load testing, set `instance_count: 2` for production redundancy.
6. Set the Razorpay webhook to `https://YOUR_DOMAIN/api/webhook/razorpay` and subscribe to `payment.captured`, `payment.failed`, and `refund.processed`.

App Platform database variables use DigitalOcean bindable references, so database credentials are not committed to the repository. Spaces objects are served through the app's `/uploads` route; local development continues to use the `UPLOAD_DIR` fallback.

## Verification

```sh
npm run lint
npm run build
```
