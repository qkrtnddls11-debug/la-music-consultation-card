import type { Metadata } from "next";
import { ReservationWizard } from "@/components/reservation-wizard";
import type { ReservationSource } from "@/lib/types";

export const metadata: Metadata = { title: "상담 예약 · 라 실용음악학원" };

export default async function ReservationPage({ searchParams }: { searchParams: Promise<{ src?: string | string[] }> }) {
  const { src } = await searchParams;
  const source: ReservationSource = src === "tablet" || src === "crm" ? src : "link";
  return <ReservationWizard source={source} />;
}
