import type { Metadata } from "next";
import { StationDetailView } from "@/components/apparatus-views";

type PageProps = { params: Promise<{ station: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { station } = await params;
  return { title: station === "unassigned" ? "Unassigned units" : `Station ${station}` };
}

export default async function StationPage({ params }: PageProps) {
  const { station } = await params;
  return <StationDetailView station={station} />;
}
