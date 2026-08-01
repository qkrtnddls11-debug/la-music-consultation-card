"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AcademyRulesContent, PrivacyTermsContent } from "@/components/consent-document-content";
import type { ConsentRecord, ConsultationRecord } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function ConsentChoiceRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#e5dfd6] py-3"><dt className="font-bold text-[#6b6459]">{label}</dt><dd className="font-extrabold text-[#2b2723]">{value}</dd></div>;
}

export function ConsentDetailModal({ consentId, consultation, onClose }: {
  consentId: string;
  consultation: ConsultationRecord;
  onClose: () => void;
}) {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    document.body.style.overflow = "hidden";
    async function load() {
      try {
        const response = await fetch(`/api/admin/consents/${consentId}`, { cache: "no-store" });
        const result = await response.json() as ConsentRecord | { error?: string };
        if (!response.ok || !("id" in result)) throw new Error("error" in result && result.error ? result.error : "동의서를 불러오지 못했습니다.");
        if (!cancelled) setConsent(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "동의서를 불러오지 못했습니다.");
      }
    }
    void load();
    return () => { cancelled = true; document.body.style.overflow = ""; };
  }, [consentId]);

  return (
    <div className="consent-modal fixed inset-0 z-[75] overflow-y-auto bg-black/55 p-0 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="consent-detail-title">
      <article className="consent-print-root mx-auto min-h-dvh w-full max-w-4xl bg-white shadow-2xl sm:min-h-0 sm:rounded-[22px]">
        <header className="consent-print-hide sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e5dfd6] bg-white/95 px-4 py-3 backdrop-blur sm:rounded-t-[22px] sm:px-6">
          <div><h2 id="consent-detail-title" className="text-lg font-black sm:text-xl">{consultation.name} · 등록 동의서</h2><p className="mt-0.5 text-xs font-semibold text-[#8a8378]">교육청 점검용 인쇄·PDF 저장 가능</p></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="min-h-12 rounded-xl bg-[#e8a23d] px-4 text-sm font-extrabold">인쇄 / PDF 저장</button>
            <button type="button" onClick={onClose} aria-label="동의서 닫기" className="flex size-12 items-center justify-center rounded-xl bg-[#eee9e0] text-xl font-black">×</button>
          </div>
        </header>

        <div className="p-5 sm:p-8">
          {error ? <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700" role="alert">{error}</p> : null}
          {!consent && !error ? <p className="py-20 text-center font-bold text-[#6b6459]">동의서를 불러오고 있어요…</p> : null}
          {consent ? (
            <div className="space-y-10">
              <section className="rounded-2xl border border-[#d8d2c8] p-5 sm:p-7">
                <h3 className="mb-4 text-xl font-black">동의 및 서명 기록</h3>
                <dl>
                  <ConsentChoiceRow label="학원규칙 확인" value={consent.rules_agreed ? "동의함" : "미동의"} />
                  <ConsentChoiceRow label="필수 정보 수집" value={consent.required_info_agreed ? "동의함" : "미동의"} />
                  <ConsentChoiceRow label="고유 식별정보 수집" value={consent.unique_identifier_consent} />
                  <ConsentChoiceRow label="선택 정보 수집" value={consent.optional_info_consent} />
                  <ConsentChoiceRow label="홍보 및 마케팅 이용" value={consent.marketing_consent} />
                  <ConsentChoiceRow label="서명자" value={`${consent.signer_name} (${consent.signer_role})`} />
                  <ConsentChoiceRow label="동의 일시" value={formatDate(consent.agreed_at)} />
                </dl>
                {consent.is_minor ? (
                  <div className="mt-5 rounded-xl bg-violet-50 p-4 leading-7 text-violet-950">
                    <p className="font-extrabold">법정대리인 정보</p>
                    <p>{consent.guardian_name} · {consent.guardian_relationship} · {consent.guardian_phone}</p>
                  </div>
                ) : null}
                <div className="mt-6 grid gap-5">
                  <div><p className="mb-2 font-extrabold">이름 따라쓰기</p>{consent.name_trace_url ? <Image unoptimized src={consent.name_trace_url} alt={`${consent.signer_name} 이름 따라쓰기`} width={1200} height={360} className="h-auto w-full rounded-xl border border-[#d8d2c8]" /> : null}</div>
                  <div><p className="mb-2 font-extrabold">자유 서명</p>{consent.signature_url ? <Image unoptimized src={consent.signature_url} alt={`${consent.signer_name} 서명`} width={1200} height={360} className="h-auto w-full rounded-xl border border-[#d8d2c8]" /> : null}</div>
                </div>
              </section>

              <section className="consent-document-page rounded-2xl border border-[#d8d2c8] p-5 sm:p-8"><AcademyRulesContent /></section>
              <section className="consent-document-page rounded-2xl border border-[#d8d2c8] p-5 sm:p-8"><PrivacyTermsContent consultation={consultation} /></section>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
