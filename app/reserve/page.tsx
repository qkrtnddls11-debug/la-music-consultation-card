import type { Metadata } from "next";
import { ReservationWizard } from "@/components/reservation-wizard";
import { loadBranchSubjects } from "@/lib/branch-config";
import type { ReservationSource } from "@/lib/types";

export const metadata: Metadata = { title: "상담 예약 · 라 실용음악학원" };

export default async function ReservationPage({ searchParams }: { searchParams: Promise<{ src?: string | string[]; branch?: string | string[] }> }) {
  const { src, branch } = await searchParams;
  const source: ReservationSource = src === "tablet" || src === "crm" ? src : "link";
  const branchName = typeof branch === "string" && branch.trim() ? branch.trim().slice(0, 60) : undefined;
  const subjectOptions = await loadBranchSubjects(branchName);
  return <ReservationWizard source={source} branchName={branchName} subjectOptions={subjectOptions} />;
}
