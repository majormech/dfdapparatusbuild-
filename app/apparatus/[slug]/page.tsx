import type { Metadata } from "next";
import { ApparatusDetailView } from "@/components/apparatus-detail";
import { startingDetails, slugifyApparatus } from "@/lib/fire-data";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const apparatus = startingDetails.find((entry) => slugifyApparatus(entry.name) === slug);
  return { title: apparatus?.name ?? "Apparatus detail" };
}

export default async function ApparatusDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <ApparatusDetailView slug={slug} />;
}

