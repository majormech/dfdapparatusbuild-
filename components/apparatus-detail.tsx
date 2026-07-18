"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  compartmentTypes,
  equipmentTypes,
  itemStatuses,
  slugifyApparatus,
  startingDetails,
  type Apparatus,
  type ApparatusDetail,
  type Compartment,
  type InventoryItem,
} from "@/lib/fire-data";

type ModalState =
  | { kind: "compartment"; value?: Compartment }
  | { kind: "item"; compartmentId?: number; value?: InventoryItem }
  | { kind: "move"; value: InventoryItem }
  | { kind: "apparatus" }
  | null;

export function ApparatusDetailView({ slug }: { slug: string }) {
  const fallback = startingDetails.find((entry) => slugifyApparatus(entry.name) === slug) ?? null;
  const [detail, setDetail] = useState<ApparatusDetail | null>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");

  const loadDetail = useCallback(async (knownId?: number) => {
    try {
      let id = knownId;
      if (!id) {
        const listResponse = await fetch("/api/apparatus");
        const listData = await listResponse.json() as { apparatus?: Apparatus[] };
        id = listData.apparatus?.find((entry) => slugifyApparatus(entry.name) === slug)?.id;
      }
      if (!id) throw new Error("Apparatus not found.");
      const response = await fetch(`/api/apparatus/${id}`);
      const data = await response.json() as { apparatus?: ApparatusDetail; error?: string };
      if (!response.ok || !data.apparatus) throw new Error(data.error || "Unable to load apparatus.");
      setDetail(data.apparatus);
      setError("");
    } catch (caught) {
      if (!fallback) setError(caught instanceof Error ? caught.message : "Unable to load apparatus.");
    } finally {
      setLoading(false);
    }
  }, [fallback, slug]);

  useEffect(() => { window.queueMicrotask(() => { void loadDetail(fallback?.id); }); }, [fallback?.id, loadDetail]);
  useEffect(() => {
    if (!loading && new URLSearchParams(window.location.search).get("edit") === "1") window.queueMicrotask(() => setModal({ kind: "apparatus" }));
  }, [loading]);

  const filteredItems = useMemo(() => detail?.items.filter((item) => {
    const query = `${item.name} ${item.equipmentType} ${item.equipmentId} ${item.serialNumber}`.toLowerCase();
    return query.includes(search.toLowerCase()) && (!equipmentType || item.equipmentType === equipmentType);
  }) ?? [], [detail?.items, equipmentType, search]);

  async function mutate(url: string, method: string, payload?: unknown, message = "Inventory updated") {
    if (!detail) return;
    const response = await fetch(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Unable to save this change.");
    await loadDetail(detail.id);
    setModal(null);
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  if (error && !detail) return <div className="page-wrap"><div className="not-found-panel"><span>404</span><h1>Apparatus not found</h1><p>{error}</p><Link className="button button-primary" href="/apparatus">Back to apparatus</Link></div></div>;
  if (!detail) return <div className="page-wrap"><div className="loading-panel">Loading apparatus record…</div></div>;

  const nonServiceItems = detail.items.filter((item) => item.status !== "In Service").length;

  return (
    <div className="page-wrap detail-page">
      <div className="breadcrumbs"><Link href="/apparatus">Apparatus</Link><span>/</span><strong>{detail.name}</strong>{loading && <small>Syncing…</small>}</div>

      <header className="unit-hero">
        <div className="hero-unit-mark">{detail.type.startsWith("Truck") ? "T" : detail.type === "Engine" ? "E" : detail.type === "Rescue" ? "R" : "B"}</div>
        <div className="unit-identity"><p>STATION {detail.stationNumber} · {detail.type.toUpperCase()}</p><h1>{detail.name}</h1><div><span className="inline-status"><span className="status-dot" />{detail.isReserve ? "Reserve" : detail.status}</span>{detail.isReserve && <span className="reserve-tag">RESERVE UNIT</span>}</div></div>
        <div className="unit-hero-actions"><button className="button button-secondary" onClick={() => setModal({ kind: "apparatus" })}>Edit details</button><button className="button button-primary" onClick={() => setModal({ kind: "item", compartmentId: detail.compartments[0]?.id })}>+ Add item</button></div>
        <div className="hero-stats"><div><strong>{detail.compartmentCount}</strong><span>Compartments</span></div><div><strong>{detail.itemCount}</strong><span>Inventory units</span></div><div className={nonServiceItems ? "stat-alert" : ""}><strong>{nonServiceItems}</strong><span>Need attention</span></div></div>
      </header>

      <div className="detail-toolbar">
        <label className="search-field detail-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items, IDs, or serials…" aria-label="Search inventory" /></label>
        <label className="select-field"><span>Equipment</span><select value={equipmentType} onChange={(event) => setEquipmentType(event.target.value)}><option value="">All equipment types</option>{equipmentTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <button className="button button-secondary" onClick={() => setModal({ kind: "compartment" })}>+ Compartment</button>
        <a className="button button-secondary" href={`/api/apparatus/${detail.id}/export`}>Download CSV</a>
      </div>

      <div className="detail-layout">
        <aside className="compartment-index">
          <p className="eyebrow">Compartment index</p>
          <nav>{detail.compartments.map((compartment) => {
            const count = detail.items.filter((item) => item.compartmentId === compartment.id).reduce((sum, item) => sum + item.quantity, 0);
            return <a key={compartment.id} href={`#compartment-${compartment.id}`}><span>{String(compartment.sortOrder).padStart(2, "0")}</span><b>{compartment.name}</b><em>{count}</em></a>;
          })}</nav>
          <button className="index-add" onClick={() => setModal({ kind: "compartment" })}>+ Add compartment</button>
          <div className="first-due-note"><strong>FIRST DUE READY</strong><p>Consistent compartment names and text-based equipment IDs preserve clean future exports.</p></div>
        </aside>

        <section className="compartment-stack">
          <div className="stack-heading"><div><p className="eyebrow">Inventory by location</p><h2>{detail.compartments.length} compartments</h2></div><span>{filteredItems.reduce((sum, item) => sum + item.quantity, 0)} units shown</span></div>
          {detail.compartments.map((compartment) => {
            const allItems = detail.items.filter((item) => item.compartmentId === compartment.id);
            const items = filteredItems.filter((item) => item.compartmentId === compartment.id);
            return (
              <CompartmentCard
                key={compartment.id}
                compartment={compartment}
                items={items}
                totalItemCount={allItems.length}
                filtersActive={Boolean(search || equipmentType)}
                onAdd={() => setModal({ kind: "item", compartmentId: compartment.id })}
                onEdit={() => setModal({ kind: "compartment", value: compartment })}
                onDelete={async () => {
                  if (!window.confirm(`Delete ${compartment.name}? This cannot be undone.`)) return;
                  try { await mutate(`/api/compartments/${compartment.id}`, "DELETE", undefined, "Compartment deleted"); }
                  catch (caught) { setToast(caught instanceof Error ? caught.message : "Unable to delete compartment."); }
                }}
                onEditItem={(item) => setModal({ kind: "item", value: item })}
                onMoveItem={(item) => setModal({ kind: "move", value: item })}
                onDeleteItem={async (item) => {
                  if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
                  const enteredBy = window.prompt("Enter your name or department ID to record this deletion:")?.trim();
                  if (!enteredBy) return;
                  try { await mutate(`/api/items/${item.id}`, "DELETE", { enteredBy }, "Inventory item deleted"); }
                  catch (caught) { setToast(caught instanceof Error ? caught.message : "Unable to delete item."); }
                }}
              />
            );
          })}
          {!detail.compartments.length && <div className="empty-compartments"><span>+</span><h2>Build this apparatus layout</h2><p>Add the first compartment, then begin assigning equipment.</p><button className="button button-primary" onClick={() => setModal({ kind: "compartment" })}>Add first compartment</button></div>}
        </section>
      </div>

      {modal && <Modal title={modalTitle(modal)} onClose={() => setModal(null)}>
        {modal.kind === "compartment" && <CompartmentForm apparatusId={detail.id} value={modal.value} nextSort={detail.compartments.length + 1} onSave={mutate} />}
        {modal.kind === "item" && <ItemForm apparatus={detail} value={modal.value} compartmentId={modal.compartmentId} onSave={mutate} />}
        {modal.kind === "move" && <MoveForm apparatus={detail} item={modal.value} onSave={mutate} />}
        {modal.kind === "apparatus" && <ApparatusForm apparatus={detail} onSave={mutate} onDeleted={() => { window.location.href = "/apparatus"; }} />}
      </Modal>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function modalTitle(modal: Exclude<ModalState, null>) {
  if (modal.kind === "compartment") return modal.value ? "Edit compartment" : "Add compartment";
  if (modal.kind === "item") return modal.value ? "Edit inventory item" : "Add inventory item";
  if (modal.kind === "move") return "Move inventory item";
  return "Edit apparatus details";
}

function CompartmentCard({ compartment, items, totalItemCount, filtersActive, onAdd, onEdit, onDelete, onEditItem, onMoveItem, onDeleteItem }: {
  compartment: Compartment; items: InventoryItem[]; totalItemCount: number; filtersActive: boolean;
  onAdd: () => void; onEdit: () => void; onDelete: () => void;
  onEditItem: (item: InventoryItem) => void; onMoveItem: (item: InventoryItem) => void; onDeleteItem: (item: InventoryItem) => void;
}) {
  return (
    <article className="compartment-card" id={`compartment-${compartment.id}`}>
      <header className="compartment-header">
        <span className="compartment-number">{String(compartment.sortOrder).padStart(2, "0")}</span>
        <div><p>{compartment.compartmentType}</p><h3>{compartment.name}</h3>{compartment.notes && <small>{compartment.notes}</small>}</div>
        <div className="compartment-actions"><button className="text-button" onClick={onEdit}>Edit</button><button className="danger-link" onClick={onDelete}>Delete</button><button className="button button-small" onClick={onAdd}>+ Add item</button></div>
      </header>
      {items.length ? <div className="inventory-list">{items.map((item) => <div className="inventory-row" key={item.id}>
        <div className="item-main"><span className={`item-status-marker status-${item.status.toLowerCase().replace(/\s/g, "-")}`} /><div><strong>{item.name}</strong><small>{item.make} {item.model}</small></div></div>
        <div className="item-type"><span>{item.equipmentType}</span><small>Qty {item.quantity}</small></div>
        <div className="item-ids"><span>ID <b>{item.equipmentId || "—"}</b></span><span>S/N <b>{item.serialNumber || "—"}</b></span></div>
        <div className="item-state"><span className={item.status === "In Service" ? "state-chip" : "state-chip state-warning"}>{item.status}</span></div>
        <div className="item-actions"><button onClick={() => onEditItem(item)}>Edit</button><button onClick={() => onMoveItem(item)}>Move</button><button className="danger-link" onClick={() => onDeleteItem(item)}>Delete</button></div>
      </div>)}</div> : <div className="empty-compartment"><p>{filtersActive && totalItemCount ? "No items in this compartment match the active filters." : "No equipment assigned to this compartment."}</p><button onClick={onAdd}>+ Add item</button></div>}
    </article>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><p className="eyebrow">Inventory control</p><h2 id="modal-title">{title}</h2></div><button className="modal-close" aria-label="Close" onClick={onClose}>×</button></header>{children}</section></div>;
}

function CompartmentForm({ apparatusId, value, nextSort, onSave }: { apparatusId: number; value?: Compartment; nextSort: number; onSave: (url: string, method: string, payload?: unknown, message?: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await onSave(value ? `/api/compartments/${value.id}` : `/api/apparatus/${apparatusId}/compartments`, value ? "PUT" : "POST", payload, value ? "Compartment updated" : "Compartment added"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save compartment."); setSaving(false); }
  }
  return <form className="modal-form" onSubmit={submit}><div className="form-grid">
    <label className="field field-wide"><span>Compartment name</span><input name="name" required defaultValue={value?.name} placeholder="Example: Driver Side 2" /></label>
    <label className="field"><span>Compartment type</span><select name="compartmentType" defaultValue={value?.compartmentType ?? "Other"}>{compartmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
    <label className="field"><span>Sort order</span><input name="sortOrder" type="number" min="0" defaultValue={value?.sortOrder ?? nextSort} /></label>
    <label className="field field-wide"><span>Notes</span><textarea name="notes" rows={3} defaultValue={value?.notes} placeholder="Mounting details, access notes, or inspection reminders" /></label>
  </div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save compartment"}</button></div></form>;
}

function ItemForm({ apparatus, value, compartmentId, onSave }: { apparatus: ApparatusDetail; value?: InventoryItem; compartmentId?: number; onSave: (url: string, method: string, payload?: unknown, message?: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), apparatusId: apparatus.id };
    try { await onSave(value ? `/api/items/${value.id}` : "/api/items", value ? "PUT" : "POST", payload, value ? "Inventory item updated" : "Inventory item added"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save inventory item."); setSaving(false); }
  }
  return <form className="modal-form" onSubmit={submit}><div className="required-fields-note"><strong>Required fields</strong><p>Name of person entering the item, Item Name, Quantity, and Assigned Compartment must be completed. All other fields are optional, but please add the make, model, serial number, or Equipment ID when the item has one.</p></div><div className="form-grid three-column">
    <label className="field field-wide"><span>Name or department ID <b className="required-tag">Required</b></span><input name="enteredBy" required autoComplete="name" placeholder="Person entering this item" /></label>
    <label className="field field-span-2"><span>Item name <b className="required-tag">Required</b></span><input name="name" required defaultValue={value?.name} placeholder="Example: Halligan Bar" /><small className="item-entry-note">Do not add hoses. All hose inventory has already been entered.</small></label>
    <label className="field"><span>Quantity <b className="required-tag">Required</b></span><input name="quantity" type="number" min="1" required defaultValue={value?.quantity ?? 1} /></label>
    <label className="field"><span>Equipment type</span><select name="equipmentType" defaultValue={value?.equipmentType ?? "Other"}>{equipmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
    <BarcodeField name="equipmentId" label="Equipment ID" defaultValue={value?.equipmentId} />
    <BarcodeField name="serialNumber" label="Serial number" defaultValue={value?.serialNumber} />
    <label className="field"><span>Make</span><input name="make" defaultValue={value?.make} /></label>
    <label className="field"><span>Model</span><input name="model" defaultValue={value?.model} /></label>
    <label className="field"><span>Status</span><select name="status" defaultValue={value?.status ?? "In Service"}>{itemStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    <label className="field field-wide"><span>Assigned compartment <b className="required-tag">Required</b></span><select name="compartmentId" required defaultValue={value?.compartmentId ?? compartmentId}>{apparatus.compartments.map((compartment) => <option key={compartment.id} value={compartment.id}>{String(compartment.sortOrder).padStart(2, "0")} · {compartment.name}</option>)}</select></label>
    <label className="field field-wide"><span>Description <small>250 characters maximum</small></span><textarea name="description" rows={2} maxLength={250} defaultValue={value?.description} /></label>
    <label className="field field-wide"><span>Notes <small>250 characters maximum</small></span><textarea name="notes" rows={2} maxLength={250} defaultValue={value?.notes} /></label>
  </div><p className="text-storage-note">Equipment ID and serial number are optional. Enter or scan them when applicable.</p>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save inventory item"}</button></div></form>;
}

type BarcodeDetectorConstructor = new () => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>> };

function BarcodeField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  function releaseCamera() {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => () => releaseCamera(), []);

  function stopScanner() {
    releaseCamera();
    setScanning(false);
  }

  async function startScanner() {
    setError("");
    const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera barcode scanning is not supported in this browser. Enter the value or use a connected scanner.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const video = videoRef.current;
      if (!video) throw new Error("Scanner camera is unavailable.");
      video.srcObject = stream;
      await video.play();
      const detector = new Detector();
      const scan = async () => {
        if (!streamRef.current) return;
        try {
          const [result] = await detector.detect(video);
          if (result?.rawValue) {
            if (inputRef.current) inputRef.current.value = result.rawValue;
            stopScanner();
            inputRef.current?.focus();
            return;
          }
        } catch { /* Keep scanning while the camera initializes. */ }
        frameRef.current = window.requestAnimationFrame(() => { void scan(); });
      };
      frameRef.current = window.requestAnimationFrame(() => { void scan(); });
    } catch (caught) {
      releaseCamera();
      setScanning(false);
      setError(caught instanceof Error ? caught.message : "Unable to open the camera scanner.");
    }
  }

  return <label className="field"><span>{label}</span><div className="scan-input"><input ref={inputRef} name={name} defaultValue={defaultValue} inputMode="text" placeholder="If applicable" /><button type="button" onClick={() => { void startScanner(); }}>Scan</button></div>{error && <small className="scan-error">{error}</small>}{scanning && <div className="scanner-backdrop"><div className="scanner-panel"><strong>Scan {label}</strong><video ref={videoRef} playsInline muted /><p>Center the barcode in the camera view.</p><button type="button" className="button button-secondary" onClick={stopScanner}>Cancel scanner</button></div></div>}</label>;
}

function MoveForm({ apparatus, item, onSave }: { apparatus: ApparatusDetail; item: InventoryItem; onSave: (url: string, method: string, payload?: unknown, message?: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await onSave(`/api/items/${item.id}/move`, "POST", payload, `${item.name} moved`); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to move item."); setSaving(false); }
  }
  const current = apparatus.compartments.find((entry) => entry.id === item.compartmentId);
  return <form className="modal-form" onSubmit={submit}><div className="move-summary"><span className="mini-unit">↗</span><div><strong>{item.name}</strong><small>Currently in {current?.name ?? "Unassigned"}</small></div></div><div className="form-grid"><label className="field field-wide"><span>Name or department ID <b className="required-tag">Required</b></span><input name="enteredBy" required placeholder="Person making this change" /></label><label className="field field-wide"><span>Move to compartment</span><select name="compartmentId" required defaultValue={item.compartmentId}>{apparatus.compartments.map((compartment) => <option key={compartment.id} value={compartment.id}>{String(compartment.sortOrder).padStart(2, "0")} · {compartment.name}</option>)}</select></label></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="button button-primary" disabled={saving}>{saving ? "Moving…" : "Move item"}</button></div></form>;
}

function ApparatusForm({ apparatus, onSave, onDeleted }: { apparatus: ApparatusDetail; onSave: (url: string, method: string, payload?: unknown, message?: string) => Promise<void>; onDeleted: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { ...Object.fromEntries(form.entries()), isReserve: form.get("isReserve") === "on" };
    try {
      await onSave(`/api/apparatus/${apparatus.id}`, "PUT", payload, "Apparatus details updated");
      if (String(payload.name) !== apparatus.name) window.location.href = `/apparatus/${slugifyApparatus(String(payload.name))}`;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save apparatus."); setSaving(false); }
  }
  async function remove() {
    if (!window.confirm(`Delete ${apparatus.name} and all of its compartments and inventory? This cannot be undone.`)) return;
    const response = await fetch(`/api/apparatus/${apparatus.id}`, { method: "DELETE" });
    if (response.ok) onDeleted(); else setError("Unable to delete apparatus.");
  }
  return <form className="modal-form" onSubmit={submit}><div className="form-grid">
    <label className="field field-wide"><span>Apparatus name</span><input name="name" required defaultValue={apparatus.name} /></label>
    <label className="field"><span>Type</span><select name="type" defaultValue={apparatus.type}><option>Engine</option><option>Truck</option><option>Truck 1</option><option>Rescue</option><option>Command</option><option>Specialty</option><option>Storage</option></select></label>
    <label className="field"><span>Station number</span><input name="stationNumber" defaultValue={apparatus.stationNumber} /></label>
    <label className="field"><span>Status</span><select name="status" defaultValue={apparatus.status}><option>Active</option><option>Out of Service</option><option>Retired</option></select></label>
    <label className="check-field"><input type="checkbox" name="isReserve" defaultChecked={apparatus.isReserve} /><span><strong>Reserve apparatus</strong><small>Available for reserve assignment</small></span></label>
    <label className="field field-wide"><span>Notes</span><textarea name="notes" rows={3} defaultValue={apparatus.notes} /></label>
  </div>{error && <div className="form-error">{error}</div>}<div className="modal-actions modal-actions-split"><button type="button" className="danger-button" onClick={remove}>Delete apparatus</button><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Save details"}</button></div></form>;
}
