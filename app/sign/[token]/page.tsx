import type { Metadata } from "next";
import { PublicConsentPage } from "@/components/public-consent-page";

export const metadata: Metadata = { title: "등록 동의서 서명 · 라 실용음악학원" };

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicConsentPage token={token} />;
}
