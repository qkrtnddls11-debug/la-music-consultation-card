"use client";

import { useEffect, useState } from "react";
import { RegistrationConsentFlow } from "@/components/registration-consent-flow";
import type { ConsentConsultation } from "@/lib/types";

export function PublicConsentPage({ token }: { token: string }) {
  const [consultation, setConsultation] = useState<ConsentConsultation | null>(null);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sign/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { consultation?: ConsentConsultation; error?: string };
        if (!response.ok || !result.consultation) throw new Error(result.error || "서명 링크를 열지 못했습니다.");
        if (!cancelled) setConsultation(result.consultation);
      })
      .catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "서명 링크를 열지 못했습니다."); });
    return () => { cancelled = true; };
  }, [token]);

  if (complete) return <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-5"><section className="w-full max-w-lg rounded-[22px] bg-white p-8 text-center shadow-sm"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-600 text-4xl font-black text-white">✓</div><h1 className="mt-6 text-2xl font-black">동의와 서명이 완료되었습니다</h1><p className="mt-3 font-semibold leading-7 text-[#6b6459]">이 링크는 이제 사용할 수 없습니다.<br />안전하게 창을 닫아 주세요.</p></section></main>;
  if (error) return <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-5"><section className="w-full max-w-lg rounded-[22px] bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black">서명 링크를 사용할 수 없습니다</h1><p className="mt-4 break-keep font-semibold leading-7 text-red-700">{error}</p><p className="mt-4 text-sm text-[#6b6459]">학원에 새 링크를 요청해 주세요.</p></section></main>;
  if (!consultation) return <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee]"><p className="font-bold text-[#6b6459]">안전한 서명 링크를 확인하고 있어요…</p></main>;
  return <RegistrationConsentFlow consultation={consultation} submitUrl={`/api/sign/${encodeURIComponent(token)}`} publicLink onClose={() => window.close()} onComplete={() => setComplete(true)} />;
}
