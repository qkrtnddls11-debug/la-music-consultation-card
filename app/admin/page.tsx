import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "상담 관리 · 라 실용음악학원",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; branch?: string | string[]; teacher?: string | string[] }> }) {
  const { tab, branch, teacher } = await searchParams;
  // 주소에 지점이 붙어 있으면 그 지점 고정(지점 선택 없음), 없으면 대표·개발자용으로 지점 선택 가능
  const lockedBranch = typeof branch === "string" && branch.trim() ? branch.trim().slice(0, 60) : undefined;
  // 강사 이름이 붙어 있으면 그 강사에게 배정된 학생만 보이는 강사 모드
  const lockedTeacher = typeof teacher === "string" && teacher.trim() ? teacher.trim().slice(0, 40) : undefined;
  return <AdminDashboard initialView={tab === "reservations" ? "reservations" : "consultations"} lockedBranch={lockedBranch} lockedTeacher={lockedTeacher} />;
}
