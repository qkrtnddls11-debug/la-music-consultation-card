import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "상담 관리 · 라 실용음악학원",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  return <AdminDashboard initialView={tab === "reservations" ? "reservations" : "consultations"} />;
}
