import type { Metadata } from "next";
import { ConsultationWizard } from "@/components/consultation-wizard";
import type { SubmissionSource } from "@/lib/types";

export const metadata: Metadata = {
  title: "상담 카드 작성 · 라 실용음악학원",
};

type ConsultationPageProps = {
  searchParams: Promise<{ src?: string | string[] }>;
};

export default async function ConsultationPage({ searchParams }: ConsultationPageProps) {
  const { src } = await searchParams;
  const submissionSource: SubmissionSource = src === "link" ? "link" : "tablet";
  return <ConsultationWizard submissionSource={submissionSource} />;
}
