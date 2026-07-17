 # DFD Apparatus Inventory

A React + Vite + TypeScript web app for building and managing fire department apparatus inventory by compartment. The app is designed for Cloudflare Pages, a Cloudflare Worker API, and a Cloudflare D1 database.

## Features

- Dashboard cards for all apparatus with compartment and item counts.
- Apparatus list table with station, type, status, and count columns.
- Apparatus detail pages for managing unlimited compartments and inventory items.
- Engine, Engine With Walkway, Truck, Truck 1, and blank/custom apparatus templates.
- D1 schema and seed migrations for DFD starting apparatus and compartment templates.
- Worker API routes for apparatus, compartments, inventory item CRUD, and moving items between compartments.

## Development

```bash
npm install
npm run dev
npm run build
```

## Cloudflare D1

Create a D1 database, update `wrangler.toml` with the real database ID, and apply migrations:

```bash
npx wrangler d1 migrations apply dfd-apparatus-inventory --local
npx wrangler d1 migrations apply dfd-apparatus-inventory --remote
```

Equipment IDs and serial numbers are stored as `TEXT` to preserve leading zeroes.
