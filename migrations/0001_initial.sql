CREATE TABLE IF NOT EXISTS apparatus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  station_number TEXT,
  is_reserve INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS compartments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apparatus_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  compartment_type TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apparatus_id) REFERENCES apparatus(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apparatus_id INTEGER,
  compartment_id INTEGER,
  name TEXT NOT NULL,
  equipment_type TEXT,
  equipment_id TEXT,
  serial_number TEXT,
  quantity INTEGER DEFAULT 1,
  make TEXT,
  model TEXT,
  description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'In Service',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (apparatus_id) REFERENCES apparatus(id) ON DELETE SET NULL,
  FOREIGN KEY (compartment_id) REFERENCES compartments(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS compartment_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  apparatus_type TEXT NOT NULL,
  name TEXT NOT NULL,
  compartment_type TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_compartments_apparatus ON compartments(apparatus_id);
CREATE INDEX IF NOT EXISTS idx_items_apparatus ON inventory_items(apparatus_id);
CREATE INDEX IF NOT EXISTS idx_items_compartment ON inventory_items(compartment_id);
