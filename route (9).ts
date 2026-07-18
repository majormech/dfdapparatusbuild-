# DFD Apparatus Inventory

A responsive fire apparatus inventory application for organizing equipment by apparatus and compartment. Every unit has a dedicated page with compartment-level item management, status tracking, and move controls.

## Included

- Dashboard cards and fleet metrics
- Search and filters by station, apparatus type, and equipment type
- Dedicated URLs such as `/apparatus/engine-1`
- Engine, Engine With Walkway, Truck, Truck 1, and blank/custom templates
- Add, edit, move, and delete flows for apparatus, compartments, and inventory
- Cloudflare D1 persistence with generated Drizzle migration
- Text-safe equipment IDs and serial numbers that preserve leading zeroes
- Responsive sidebar, tables, cards, and touch-friendly controls

## Local development

Install dependencies, run the development server, and open the printed local URL. The local Cloudflare runtime creates and seeds the D1 schema on first access.

## Deployment

The project uses the bundled vinext Cloudflare Worker build and the logical `DB` binding declared in `.openai/hosting.json`.

