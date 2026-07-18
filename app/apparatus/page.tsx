import type { Metadata } from "next";
import { ApparatusListView } from "@/components/apparatus-views";

export const metadata: Metadata = { title: "Apparatus registry" };

export default function ApparatusPage() {
  return <ApparatusListView />;
}

