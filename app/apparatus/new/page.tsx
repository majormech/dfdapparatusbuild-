import type { Metadata } from "next";
import { NewApparatusView } from "@/components/apparatus-views";

export const metadata: Metadata = { title: "Add apparatus" };

export default function NewApparatusPage() {
  return <NewApparatusView />;
}

