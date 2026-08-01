"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AcademyRulesContent, PrivacyTermsContent } from "@/components/consent-document-content";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { isUnder19 } from "@/lib/consent-utils";
import type { ConsentChoice, ConsentRecord, ConsultationRecord } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

function formatPhone(value: string) {
  const raw = value.replace(/\D/g, "").slice(0, 11);
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length === 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}

function ChoiceButtons({ value, onChange, label }: { value: ConsentChoice | ""; onChange: (value: ConsentChoice) => void; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
      {(["동의함", "동의하지 않음"] as ConsentChoice[]).map((choice) => (
        <button key={choice} type="button" aria-pressed={value === choice} onClick={() => onChange(choice)} className={`min-h-12 rounded-xl border-2 px-3 text-sm font-extrabold sm:text-base ${value === choice ? choice === "동의함" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-[#6b6459] bg-[#eee9e0] text-[#2b2723]" : "border-[#d8d2c8] bg-white text-[#6b6459]"}`}>{choice}</button>
      ))}
    </div>
  );
}

export function RegistrationConsentFlow({ consultation, onClose, onComplete }: {
  consultation: ConsultationRecord;
  onClose: () => void;
  onComplete: (consent: ConsentRecord) => void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [rulesRead, setRulesRead] = useState(false);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [requiredAgreed, setRequiredAgreed] = useState(false);
  const [uniqueConsent, setUniqueConsent] = useState<ConsentChoice | "">("");
  const [optionalConsent, setOptionalConsent] = useState<ConsentChoice | "">("");
  const [marketingConsent, setMarketingConsent] = useState<ConsentChoice | "">("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState(consultation.parent_phone || "");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [traceInk, setTraceInk] = useState(false);
  const [signatureInk, setSignatureInk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const traceRef = useRef<SignaturePadHandle>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);
  const minor = useMemo(() => isUnder19(consultation.birth_date), [consultation.birth_date]);
  const signerName = minor ? guardianName.trim() : consultation.name;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function checkRulesScroll(element: HTMLDivElement) {
    if (element.scrollHeight - element.scrollTop - element.clientHeight <= 12) setRulesRead(true);
  }

  function goBack() {
    setError("");
    if (step === 4) setStep(minor ? 3 : 2);
    else if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  }

  function goNext() {
    setError("");
    if (step === 1) setStep(2);
    else if (step === 2) setStep(minor ? 3 : 4);
    else if (step === 3) setStep(4);
  }

  async function submit() {
    if (!traceInk || !signatureInk || !traceRef.current || !signatureRef.current) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultation.id,
          rules_agreed: rulesAgreed,
          required_info_agreed: requiredAgreed,
          unique_identifier_consent: uniqueConsent,
          optional_info_consent: optionalConsent,
          marketing_consent: marketingConsent,
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          guardian_relationship: guardianRelationship,
          name_trace_image: traceRef.current.toDataUrl(),
          signature_image: signatureRef.current.toDataUrl(),
        }),
      });
      const result = await response.json() as ConsentRecord | { error?: string };
      if (!response.ok || !("id" in result)) throw new Error("error" in result && result.error ? result.error : "동의서를 저장하지 못했습니다.");
      onComplete(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "동의서를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const privacyReady = requiredAgreed && uniqueConsent && optionalConsent && marketingConsent;
  const guardianReady = !minor || (guardianName.trim() && [10, 11].includes(guardianPhone.replace(/\D/g, "").length) && guardianRelationship);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#f4f2ee]" role="dialog" aria-modal="true" aria-labelledby="consent-flow-title">
      <header className="sticky top-0 z-10 border-b border-[#ded8cf] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={onClose} className="min-h-12 shrink-0 rounded-xl bg-[#eee9e0] px-4 text-sm font-bold">나가기</button>
          <div className="min-w-0 flex-1">
            <h1 id="consent-flow-title" className="truncate text-lg font-black sm:text-xl">{consultation.name} · 등록 동의서</h1>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5dfd6]"><div className="h-full rounded-full bg-[#e8a23d] transition-[width]" style={{ width: `${step * 25}%` }} /></div>
          </div>
          <span className="shrink-0 text-sm font-extrabold text-[#6b6459]">{step}/4</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 pb-28 sm:p-6 sm:pb-32">
        {step === 1 ? (
          <section>
            <div className="mb-4"><h2 className="text-2xl font-black">1단계 · 학원규칙</h2><p className="mt-1 text-sm font-semibold text-[#6b6459]">전문을 끝까지 내려서 확인해 주세요.</p></div>
            <div tabIndex={0} onScroll={(event) => checkRulesScroll(event.currentTarget)} className="h-[57dvh] min-h-[380px] overflow-y-auto rounded-2xl border border-[#d8d2c8] bg-white p-5 shadow-inner sm:p-7"><AcademyRulesContent /></div>
            {!rulesRead ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">아래 끝까지 스크롤하면 동의할 수 있습니다.</p> : null}
            <label className={`mt-4 flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 font-extrabold ${rulesRead ? "border-[#e8a23d] bg-amber-50" : "border-[#d8d2c8] bg-[#eee9e0] text-[#8a8378]"}`}>
              <input type="checkbox" className="size-6 shrink-0 accent-[#e8a23d]" disabled={!rulesRead} checked={rulesAgreed} onChange={(event) => setRulesAgreed(event.target.checked)} />
              이 모든 사실을 확인하였으며, 위 내용에 맞춰 수강함에 동의합니다.
            </label>
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <div className="mb-4"><h2 className="text-2xl font-black">2단계 · 개인정보 수집·활용</h2><p className="mt-1 text-sm font-semibold text-[#6b6459]">상담 카드에 입력한 정보는 자동으로 표시됩니다.</p></div>
            <div className="rounded-2xl border border-[#d8d2c8] bg-white p-5 sm:p-7"><PrivacyTermsContent consultation={consultation} /></div>
            <div className="mt-4 space-y-3">
              <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#e8a23d] bg-amber-50 p-4 font-extrabold">
                <input type="checkbox" className="size-6 shrink-0 accent-[#e8a23d]" checked={requiredAgreed} onChange={(event) => setRequiredAgreed(event.target.checked)} />필수 정보 수집에 동의합니다. (필수)
              </label>
              <div className="rounded-2xl bg-white p-4"><p className="mb-3 font-extrabold">고유 식별정보 수집</p><ChoiceButtons label="고유 식별정보 수집 동의" value={uniqueConsent} onChange={setUniqueConsent} /></div>
              <div className="rounded-2xl bg-white p-4"><p className="mb-3 font-extrabold">선택 정보 수집</p><ChoiceButtons label="선택 정보 수집 동의" value={optionalConsent} onChange={setOptionalConsent} /></div>
              <div className="rounded-2xl bg-white p-4"><p className="mb-3 font-extrabold">홍보 및 마케팅 용도 이용</p><ChoiceButtons label="홍보 및 마케팅 용도 이용 동의" value={marketingConsent} onChange={setMarketingConsent} /></div>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="rounded-[22px] bg-white p-5 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black">3단계 · 법정대리인 동의</h2>
            <p className="mt-2 rounded-xl bg-violet-50 p-4 font-semibold leading-7 text-violet-900">생년월일 기준 만 19세 미만입니다. 법정대리인이 아래 정보를 입력한 뒤 다음 서명 단계도 직접 진행해 주세요.</p>
            <div className="mt-6 space-y-5">
              <div><label htmlFor="guardian-name" className="mb-2 block font-extrabold">법정대리인 이름</label><input id="guardian-name" value={guardianName} onChange={(event) => setGuardianName(event.target.value.slice(0, 80))} className="min-h-14 w-full rounded-xl border-2 border-[#d8d2c8] px-4 text-lg focus:border-[#e8a23d] focus:outline-none" placeholder="이름 입력" /></div>
              <div><label htmlFor="guardian-phone" className="mb-2 block font-extrabold">법정대리인 연락처</label><input id="guardian-phone" inputMode="numeric" value={formatPhone(guardianPhone)} onChange={(event) => setGuardianPhone(formatPhone(event.target.value))} className="min-h-14 w-full rounded-xl border-2 border-[#d8d2c8] px-4 text-lg focus:border-[#e8a23d] focus:outline-none" placeholder="010-0000-0000" /></div>
              <fieldset><legend className="mb-2 font-extrabold">관계</legend><div className="grid grid-cols-3 gap-2">{["부", "모", "기타"].map((relation) => <button key={relation} type="button" aria-pressed={guardianRelationship === relation} onClick={() => setGuardianRelationship(relation)} className={`min-h-14 rounded-xl border-2 font-extrabold ${guardianRelationship === relation ? "border-[#e8a23d] bg-amber-50" : "border-[#d8d2c8] bg-white"}`}>{relation}</button>)}</div></fieldset>
            </div>
            <p className="mt-6 text-sm font-semibold leading-6 text-[#6b6459]">[법정대리인 동의서] 본인은 미성년자의 법정대리인으로 학원 서비스 이용을 위해 위와 같이 개인정보를 이용하는 데 대하여 동의합니다.</p>
          </section>
        ) : null}

        {step === 4 ? (
          <section>
            <div className="mb-5"><h2 className="text-2xl font-black">4단계 · 이름 따라쓰기와 서명</h2><p className="mt-1 font-semibold text-[#6b6459]">서명자: <strong className="text-[#2b2723]">{signerName || "법정대리인 이름을 입력해 주세요"}</strong> ({minor ? "법정대리인" : "본인"})</p></div>
            <div className="space-y-6 rounded-[22px] bg-white p-5 shadow-sm sm:p-7">
              <SignaturePad ref={traceRef} label="1. 흐린 이름 위에 따라 쓰기" guideText={signerName} onInkChange={setTraceInk} />
              <SignaturePad ref={signatureRef} label="2. 자유 서명(사인)" onInkChange={setSignatureInk} />
              <p className="rounded-xl bg-[#f3eee5] p-4 text-sm font-semibold leading-6 text-[#4a453d]">‘동의 완료’를 누르면 위 전자서명과 선택한 동의 내역이 저장되고 상담 상태가 ‘등록’으로 변경됩니다.</p>
            </div>
          </section>
        ) : null}

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ded8cf] bg-white/95 p-3 backdrop-blur sm:p-4">
        <div className="mx-auto flex max-w-3xl gap-3">
          {step > 1 ? <button type="button" disabled={saving} onClick={goBack} className="min-h-14 w-28 rounded-[14px] bg-[#eee9e0] font-extrabold text-[#4a453d] disabled:opacity-50">이전</button> : null}
          {step < 4 ? <button type="button" disabled={(step === 1 && (!rulesRead || !rulesAgreed)) || (step === 2 && !privacyReady) || (step === 3 && !guardianReady)} onClick={goNext} className="min-h-14 flex-1 rounded-[14px] bg-[#e8a23d] text-lg font-black text-[#2b2723] disabled:bg-[#d8d2c8] disabled:text-[#8a8378]">다음</button> : (
            <button type="button" disabled={saving || !traceInk || !signatureInk || !signerName} onClick={() => void submit()} className="min-h-14 flex-1 rounded-[14px] bg-emerald-700 text-lg font-black text-white disabled:bg-[#d8d2c8] disabled:text-[#8a8378]">{saving ? "안전하게 저장 중…" : "동의 완료 · 등록하기"}</button>
          )}
        </div>
      </footer>
    </div>
  );
}
