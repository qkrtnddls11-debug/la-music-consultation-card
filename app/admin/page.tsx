import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "상담 관리 · 라 실용음악학원",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
