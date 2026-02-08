# DevFest Backend

Lightweight invoice risk engine and test harness used for the DevFest demo.

## What it is

- Small Express-based backend that accepts invoices, scores them with a rule-based
  engine (and optional ML scorer), and exposes endpoints to mark payments and manage vendors.
- In-memory datastore (for demo) with simple vendor learning when invoices are marked paid.

## Quick start

Prereqs: Node.js 24+.

- Install dependencies:

```bash
npm install
```

- Run locally:

```bash
npm run dev
# or
node server.js
```

Server default: `http://localhost:3001` (see `PORT` env var).

## Configuration

- `PORT` — port to run server (default `3001`).
- `ML_SCORE_URL` — (optional) external ML scoring endpoint (POST JSON). If not set, ML score defaults to 0.
- `ML_API_KEY` — (optional) API key for ML scorer; the app sends it as `x-api-key`.

## API examples

- POST /invoices — submit an invoice

Payload example:

```json
{
  "vendor_name": "Acme Test Co",
  "invoice_number": "INV-100",
  "invoice_date": "2026-02-07",
  "amount_total": 100,
  "tax_id": "TAX-111",
  "iban": "IBAN-111"
}
```

Response includes `invoice_id`, `rule_score`, `ml_score`, `final_score`, and `flags`.

- POST /payments — mark invoice paid

Payload: `{ "invoice_id": "<id returned from POST /invoices>" }`

- GET /vendors — return vendor list and learned baselines

## Tests

- Quick smoke tests are available as a small harness. Run:

```bash
node tests.js
```

This will: submit an invoice, mark it paid, show vendor baselines, and submit duplicate/variation invoices to verify flags such as `IBAN_MISMATCH` and `ALREADY_PAID`.

## Development notes

- Project uses ESM (`"type": "module"` in `package.json`).
- Routes live in the `routes/` folder. Core scoring logic is in `riskEngine.js`.
- Data is in-memory for the demo (`db.js`). Replace with a persistent DB for production.

## Contributing

- Open an issue or PR on the repo. Keep changes focused and add tests for new logic.

## License

MIT — see repository settings for details.

## Repo

This project is pushed to the repository you configured (main branch).
