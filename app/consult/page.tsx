import type { Metadata } from "next";
import { ConsultationWizard } from "@/components/consultation-wizard";

export const metadata: Metadata = {
  title: "상담 카드 작성 · 라 실용음악학원",
};

export default function ConsultationPage() {
  return <ConsultationWizard />;
}
