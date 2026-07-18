"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";

type AuditLog = {
  id: number;
  action: string;
  actor: string;
  itemName: string;
  apparatusName: string;
  compartmentName: string;
  details: string;
  createdAt: string;
};

export function AdminLogsView() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/logs?search=${encodeURIComponent(search)}`)
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data: { logs?: AuditLog[] }) => { if (active) setLogs(data.logs ?? []); })
        .catch(() => { if (active) setLogs([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  return (
    <div className="page-wrap">
      <PageHeader eyebrow="Administration" title="Inventory activity" description="Review who added, edited, moved, or deleted inventory and download the complete department inventory." action={<a className="button button-primary" href="/api/export">Download master CSV</a>} />
      <section className="admin-toolbar"><label className="search-field admin-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search person, department ID, item, or location…" aria-label="Search inventory logs" /></label><span className="record-count">{loading ? "Loading logs…" : `${logs.length} log entries`}</span></section>
      <section className="admin-log-panel"><div className="apparatus-table-wrap"><table className="apparatus-table admin-log-table"><thead><tr><th>Date and time</th><th>Person / ID</th><th>Action</th><th>Item</th><th>Location</th><th>Details</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td data-label="Date and time">{new Date(`${log.createdAt}Z`).toLocaleString()}</td><td data-label="Person / ID"><strong>{log.actor}</strong></td><td data-label="Action"><span className="audit-action">{log.action}</span></td><td data-label="Item">{log.itemName}</td><td data-label="Location">{log.apparatusName}<small>{log.compartmentName}</small></td><td data-label="Details">{log.details || "—"}</td></tr>)}</tbody></table></div>{!logs.length && !loading && <div className="empty-state"><span>⌕</span><h3>No logs found</h3><p>Try another person, department ID, item, or location.</p></div>}</section>
    </div>
  );
}
