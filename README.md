# DFD Apparatus Inventory

A responsive fire apparatus inventory application for organizing equipment by apparatus and compartment. Every unit has a dedicated page with compartment-level item management, status tracking, and move controls.

## Included

- Dashboard cards and fleet metrics
- Search and filters by station, apparatus type, and equipment type
- Dedicated URLs such as `/apparatus/engine-1`
- Engine, Engine With Walkway, Truck, Truck 1, and blank/custom templates
- Add, edit, move, and delete flows for apparatus, compartments, and inventory
- Cloudflare D1 persistence with automatic schema creation and seed/import data
- Text-safe equipment IDs and serial numbers that preserve leading zeroes
- Responsive sidebar, tables, cards, and touch-friendly controls

## Local development

```bash
npm install
npm run dev
```

The local Cloudflare runtime creates and seeds the D1 schema on first access.

## Cloudflare Workers deployment

This is a full-stack vinext application and must be deployed as a **Cloudflare Worker**, not as a static Cloudflare Pages project. A Pages deployment can display static HTML, but it cannot provide the vinext server router, API routes, or D1-backed actions used by this application.

The `wrangler.jsonc` file declares a D1 binding named `DB`. Wrangler 4.92 can automatically provision the D1 database during the first deployment. The application creates its tables and imports the included starting inventory on the first request.

### Deploy from a local terminal

```bash
npm install
npx wrangler login
npm run deploy
```

### Deploy with Cloudflare Workers Builds

Connect the GitHub repository from **Workers & Pages → Create application → Import a repository** and create a **Worker**, not a Pages project.

Use:

- Worker name: `dfd-apparatus-inventory`
- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npm run deploy:ci`
- Node version: `22.13.0` or newer

The Worker name in Cloudflare must match the `name` value in `wrangler.jsonc`.

The old root `index.html` static mockup has been removed so Cloudflare Pages cannot accidentally publish it as the application.
