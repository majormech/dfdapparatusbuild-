"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { slugifyApparatus, startingApparatus, templateDefinitions, type Apparatus } from "@/lib/fire-data";

function useApparatus() {
  const [apparatus, setApparatus] = useState(startingApparatus);
  const [syncing, setSyncing] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/apparatus")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { apparatus: Apparatus[] }) => { if (active && data.apparatus?.length) setApparatus(data.apparatus); })
      .catch(() => undefined)
      .finally(() => { if (active) setSyncing(false); });
    return () => { active = false; };
  }, []);
  return { apparatus, syncing };
}

function ApparatusFilters({ search, setSearch, station, setStation, type, setType, apparatus }: {
  search: string; setSearch: (value: string) => void; station: string; setStation: (value: string) => void;
  type: string; setType: (value: string) => void; apparatus: Apparatus[];
}) {
  const stations = Array.from(new Set(apparatus.map((entry) => entry.stationNumber).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  const types = Array.from(new Set(apparatus.map((entry) => entry.type))).sort();
  return (
    <div className="filter-bar">
      <label className="search-field"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apparatus…" aria-label="Search apparatus" /></label>
      <label className="select-field"><span>Station</span><select value={station} onChange={(event) => setStation(event.target.value)}><option value="">All stations</option>{stations.map((value) => <option key={value} value={value}>Station {value}</option>)}</select></label>
      <label className="select-field"><span>Type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{types.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
  );
}

function useFilters(apparatus: Apparatus[]) {
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("");
  const [type, setType] = useState("");
  const filtered = useMemo(() => apparatus.filter((entry) => {
    const matchesSearch = `${entry.name} ${entry.type} ${entry.stationNumber}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!station || entry.stationNumber === station) && (!type || entry.type === type);
  }), [apparatus, search, station, type]);
  return { search, setSearch, station, setStation, type, setType, filtered };
}

export function DashboardView() {
  const { apparatus, syncing } = useApparatus();
  const totalItems = apparatus.reduce((sum, entry) => sum + entry.itemCount, 0);
  const stationGroups = useMemo(() => {
    const grouped = new Map<string, Apparatus[]>();
    for (const entry of apparatus) {
      const key = entry.stationNumber || "unassigned";
      grouped.set(key, [...(grouped.get(key) ?? []), entry]);
    }
    return [...grouped.entries()].sort(([left], [right]) => {
      if (left === "unassigned") return 1;
      if (right === "unassigned") return -1;
      return Number(left) - Number(right);
    });
  }, [apparatus]);
  const stationCount = stationGroups.filter(([station]) => station !== "unassigned").length;

  return (
    <div className="page-wrap">
      <div className="command-banner">
        <div><span className="banner-kicker">DFD · EQUIPMENT CONTROL</span><h1>Shift-ready inventory,<br />from cab to rear bay.</h1><p>Know what is on every apparatus, where it is stored, and whether it is ready to respond.</p></div>
        <div className="banner-stamp"><span>STATUS</span><strong>OPERATIONAL</strong><small>{stationCount} STATIONS ORGANIZED</small></div>
      </div>

      <section className="metric-grid" aria-label="Inventory overview">
        <Metric label="Stations" value={stationCount} detail="Station inventory hubs" tone="red" />
        <Metric label="Apparatus" value={apparatus.length} detail="Active and reserve units" />
        <Metric label="Inventory units" value={totalItems} detail="Across all active records" />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Department overview</p><h2>Stations</h2></div><div className="section-actions"><span className="sync-note">{syncing ? "Syncing records…" : "Records current"}</span><Link className="button button-secondary" href="/apparatus">All apparatus</Link><Link className="button button-primary" href="/apparatus/new">+ Add apparatus</Link></div></div>
        <div className="station-grid">{stationGroups.map(([station, units]) => <StationCard key={station} station={station} apparatus={units} />)}</div>
        {!stationGroups.length && <EmptyState />}
      </section>
    </div>
  );
}

function Metric({ label, value, detail, tone = "navy" }: { label: string; value: number | string; detail: string; tone?: string }) {
  return <article className={`metric-card metric-${tone}`}><span className="metric-notch" /><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function StationCard({ station, apparatus }: { station: string; apparatus: Apparatus[] }) {
  const isUnassigned = station === "unassigned";
  const inventoryCount = apparatus.reduce((sum, entry) => sum + entry.itemCount, 0);
  const compartmentCount = apparatus.reduce((sum, entry) => sum + entry.compartmentCount, 0);
  return (
    <Link className="station-card" href={`/stations/${station}`}>
      <div className="station-card-top"><span className="station-number">{isUnassigned ? "—" : station.padStart(2, "0")}</span><span className="station-open">View station <b>→</b></span></div>
      <div className="station-card-body"><p>{isUnassigned ? "Department fleet" : "DFD station"}</p><h3>{isUnassigned ? "Unassigned units" : `Station ${station}`}</h3><span>{isUnassigned ? "Units awaiting a station assignment" : `${apparatus.length} apparatus assigned`}</span></div>
      <div className="station-units">{apparatus.slice(0, 5).map((entry) => <span key={entry.id}>{entry.name}</span>)}{apparatus.length > 5 && <span>+{apparatus.length - 5} more</span>}</div>
      <div className="station-counts"><div><strong>{apparatus.length}</strong><span>Apparatus</span></div><div><strong>{compartmentCount}</strong><span>Compartments</span></div><div><strong>{inventoryCount}</strong><span>Inventory</span></div></div>
    </Link>
  );
}

function ApparatusCard({ apparatus, showEdit = false }: { apparatus: Apparatus; showEdit?: boolean }) {
  return (
    <article className="apparatus-card">
      <div className="apparatus-card-top"><div className={`unit-badge unit-${apparatus.type.toLowerCase().replace(/\s/g, "-")}`}>{apparatus.type.startsWith("Truck") ? "T" : apparatus.type === "Engine" ? "E" : apparatus.type === "Rescue" ? "R" : "B"}</div><div className="card-status"><span className="status-dot" />{apparatus.isReserve ? "Reserve" : "In service"}</div></div>
      <div className="apparatus-card-body"><p className="card-station">{apparatus.stationNumber ? `STATION ${apparatus.stationNumber}` : "STATION UNASSIGNED"}</p><h3>{apparatus.name}</h3><span className="type-pill">{apparatus.type}</span></div>
      <div className="apparatus-counts"><div><strong>{apparatus.compartmentCount}</strong><span>Compartments</span></div><div><strong>{apparatus.itemCount}</strong><span>Inventory units</span></div></div>
      {showEdit ? <div className="card-actions"><Link href={`/apparatus/${slugifyApparatus(apparatus.name)}?edit=1`} className="text-button">Edit apparatus</Link><Link href={`/apparatus/${slugifyApparatus(apparatus.name)}`} className="button button-small">Open →</Link></div> : <Link href={`/apparatus/${slugifyApparatus(apparatus.name)}`} className="card-link">Open apparatus <span>→</span></Link>}
    </article>
  );
}

export function StationDetailView({ station }: { station: string }) {
  const { apparatus, syncing } = useApparatus();
  const isUnassigned = station === "unassigned";
  const units = apparatus.filter((entry) => isUnassigned ? !entry.stationNumber : entry.stationNumber === station);
  const compartmentCount = units.reduce((sum, entry) => sum + entry.compartmentCount, 0);
  const inventoryCount = units.reduce((sum, entry) => sum + entry.itemCount, 0);
  const title = isUnassigned ? "Unassigned units" : `Station ${station}`;

  return (
    <div className="page-wrap">
      <div className="breadcrumbs"><Link href="/">Dashboard</Link><span>/</span><strong>{title}</strong><small>{syncing ? "Syncing records…" : "Records current"}</small></div>
      <PageHeader eyebrow="Station apparatus" title={title} description={isUnassigned ? "Assign these units to a station or open one to manage its inventory." : `Open or edit any apparatus currently assigned to Station ${station}.`} action={<Link className="button button-primary" href="/apparatus/new">+ Add apparatus</Link>} />
      <section className="station-summary" aria-label={`${title} overview`}><Metric label="Apparatus" value={units.length} detail="Assigned units" tone="red" /><Metric label="Compartments" value={compartmentCount} detail="Mapped locations" /><Metric label="Inventory units" value={inventoryCount} detail="Across this station" /></section>
      <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Assigned fleet</p><h2>Apparatus</h2></div><Link className="button button-secondary" href="/apparatus">Open full registry</Link></div><div className="apparatus-grid">{units.map((entry) => <ApparatusCard key={entry.id} apparatus={entry} showEdit />)}</div>{!units.length && !syncing && <EmptyState />}</section>
    </div>
  );
}

export function ApparatusListView() {
  const { apparatus, syncing } = useApparatus();
  const filters = useFilters(apparatus);
  return (
    <div className="page-wrap">
      <PageHeader eyebrow="Fleet records" title="Apparatus registry" description="A complete, station-by-station view of DFD apparatus and their assigned inventory." action={<Link className="button button-primary" href="/apparatus/new">+ Add apparatus</Link>} />
      <section className="table-panel">
        <div className="table-toolbar"><ApparatusFilters {...filters} apparatus={apparatus} /><span className="record-count">{filters.filtered.length} records {syncing && "· syncing"}</span></div>
        <div className="apparatus-table-wrap">
          <table className="apparatus-table">
            <thead><tr><th>Apparatus</th><th>Type</th><th>Station</th><th>Status</th><th>Compartments</th><th>Items</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{filters.filtered.map((entry) => <tr key={entry.id}>
              <td data-label="Apparatus"><Link className="unit-name" href={`/apparatus/${slugifyApparatus(entry.name)}`}><span className="mini-unit">{entry.type.startsWith("Truck") ? "T" : entry.type === "Engine" ? "E" : entry.type === "Rescue" ? "R" : "B"}</span><strong>{entry.name}</strong></Link></td>
              <td data-label="Type"><span className="type-pill">{entry.type}</span></td>
              <td data-label="Station">Station {entry.stationNumber}</td>
              <td data-label="Status"><span className="inline-status"><span className="status-dot" />{entry.isReserve ? "Reserve" : entry.status}</span></td>
              <td data-label="Compartments"><strong>{entry.compartmentCount}</strong></td>
              <td data-label="Items"><strong>{entry.itemCount}</strong></td>
              <td className="row-actions"><Link className="text-button" href={`/apparatus/${slugifyApparatus(entry.name)}?edit=1`}>Edit</Link><Link className="button button-small" href={`/apparatus/${slugifyApparatus(entry.name)}`}>Open →</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!filters.filtered.length && <EmptyState />}
      </section>
    </div>
  );
}

function EmptyState() {
  return <div className="empty-state"><span>⌕</span><h3>No apparatus found</h3><p>Try clearing a filter or searching for another unit.</p></div>;
}

export function NewApparatusView() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("Engine");
  const [type, setType] = useState("Engine");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/apparatus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, isReserve: form.get("isReserve") === "on" }) });
      const data = await response.json() as { apparatus?: Apparatus; error?: string };
      if (!response.ok || !data.apparatus) throw new Error(data.error || "Unable to create apparatus.");
      window.location.href = `/apparatus/${slugifyApparatus(data.apparatus.name)}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create apparatus.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-wrap narrow-page">
      <PageHeader eyebrow="Fleet setup" title="Add apparatus" description="Create the unit record and its standard compartments in one step." />
      <form className="form-panel" onSubmit={submit}>
        <div className="form-section-title"><span>01</span><div><h2>Unit details</h2><p>Use the full apparatus name exactly as it should appear in First Due.</p></div></div>
        <div className="form-grid">
          <label className="field field-wide"><span>Apparatus name</span><input name="name" required placeholder="Example: Engine 2" /></label>
          <label className="field"><span>Apparatus type</span><select name="type" value={type} onChange={(event) => setType(event.target.value)}><option>Engine</option><option>Truck</option><option>Truck 1</option><option>Rescue</option><option>Command</option><option>Specialty</option><option>Storage</option></select></label>
          <label className="field"><span>Station number</span><input name="stationNumber" required inputMode="numeric" placeholder="1" /></label>
          <label className="field field-wide"><span>Notes</span><textarea name="notes" rows={3} placeholder="Optional operational notes" /></label>
          <label className="check-field field-wide"><input type="checkbox" name="isReserve" /><span><strong>Reserve apparatus</strong><small>Mark this unit as available for reserve assignment.</small></span></label>
        </div>

        <div className="form-section-title"><span>02</span><div><h2>Compartment template</h2><p>Choose a starting layout. Every compartment can be changed later.</p></div></div>
        <div className="template-grid">
          {Object.entries(templateDefinitions).map(([name, compartments]) => <label key={name} className={template === name ? "template-option template-selected" : "template-option"}><input type="radio" name="template" value={name} checked={template === name} onChange={() => { setTemplate(name); if (name === "Truck 1") setType("Truck 1"); else if (name.startsWith("Truck")) setType("Truck"); else if (name.startsWith("Engine")) setType("Engine"); }} /><span className="template-radio" /><strong>{name}</strong><small>{compartments.length ? `${compartments.length} standard compartments` : "Start with no compartments"}</small></label>)}
        </div>
        {templateDefinitions[template].length > 0 && <div className="template-preview"><p>COMPARTMENTS TO CREATE</p><div>{templateDefinitions[template].map((name, index) => <span key={name}><b>{String(index + 1).padStart(2, "0")}</b>{name}</span>)}</div></div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions"><Link className="button button-secondary" href="/apparatus">Cancel</Link><button className="button button-primary button-large" disabled={submitting}>{submitting ? "Creating apparatus…" : "Create apparatus →"}</button></div>
      </form>
    </div>
  );
}
