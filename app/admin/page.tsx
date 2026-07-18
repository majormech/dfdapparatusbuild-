import type { Metadata } from "next";
import { AdminLogsView } from "@/components/admin-logs";

export const metadata: Metadata = { title: "Administration" };

export default function AdminPage() {
  return <AdminLogsView />;
}
