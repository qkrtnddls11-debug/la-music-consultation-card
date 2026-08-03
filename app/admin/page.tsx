import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "상담 관리 · 라 실용음악학원",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; branch?: string | string[] }> }) {
  const { tab, branch } = await searchParams;
  // 주소에 지점이 붙어 있으면 그 지점 고정(지점 선택 없음), 없으면 대표·개발자용으로 지점 선택 가능
  const lockedBranch = typeof branch === "string" && branch.trim() ? branch.trim().slice(0, 60) : undefined;
  return <AdminDashboard initialView={tab === "reservations" ? "reservations" : "consultations"} lockedBranch={lockedBranch} />;
}
