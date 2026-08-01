/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import type { ConsentRequestRecord, ConsultationRecord } from "@/lib/types";

type CreatedRequest = ConsentRequestRecord & { token: string };

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const input = document.createElement("textarea");
    input.value = value; input.style.position = "fixed"; input.style.opacity = "0";
    document.body.appendChild(input); input.select(); const ok = document.execCommand("copy"); input.remove();
    if (!ok) throw new Error("copy failed");
  }
}

export function SignatureLinkDialog({ consultation, onClose, onCreated }: { consultation: ConsultationRecord; onClose: () => void; onCreated: (request: ConsentRequestRecord) => void }) {
  const [created, setCreated] = useState<CreatedRequest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const link = created ? `${window.location.origin}/sign/${created.token}` : "";

  const issue = useCallback(async () => {
    setBusy(true); setError(""); setCopied(false);
    try {
      const response = await fetch("/api/admin/consent-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consultation_id: consultation.id }) });
      const result = await response.json() as CreatedRequest | { error?: string };
      if (!response.ok || !("token" in result)) throw new Error("error" in result && result.error ? result.error : "서명 링크를 만들지 못했습니다.");
      setCreated(result); onCreated(result);
      const url = `${window.location.origin}/sign/${result.token}`;
      setQrDataUrl(await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 280, color: { dark: "#2b2723", light: "#ffffff" } }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "서명 링크를 만들지 못했습니다."); }
    finally { setBusy(false); }
  }, [consultation.id, onCreated]);

  useEffect(() => { const timer = window.setTimeout(() => void issue(), 0); return () => window.clearTimeout(timer); }, [issue]);
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="signature-link-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="w-full max-w-lg rounded-[22px] bg-white p-5 shadow-2xl sm:p-7"><header className="flex items-start justify-between gap-3"><div><h2 id="signature-link-title" className="text-xl font-black">{consultation.name} · 서명 전용 링크</h2><p className="mt-1 text-sm font-semibold text-[#6b6459]">24시간 동안 한 번만 사용할 수 있어요.</p></div><button type="button" onClick={onClose} className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eee9e0] text-xl font-bold" aria-label="닫기">×</button></header>
    {busy ? <p className="py-16 text-center font-bold text-[#6b6459]">안전한 링크와 QR 코드를 만들고 있어요…</p> : null}
    {error ? <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}<button type="button" onClick={() => void issue()} className="mt-3 min-h-12 w-full rounded-xl bg-[#2b2723] text-white">다시 만들기</button></div> : null}
    {created && !busy ? <div className="mt-5"><div className="flex justify-center">{qrDataUrl ? <img src={qrDataUrl} alt={`${consultation.name} 서명 링크 QR 코드`} className="size-[250px] max-w-full rounded-xl border border-[#eee9e0]" /> : null}</div><div className="mt-4 rounded-xl bg-[#f7f4ee] p-3 text-sm"><p className="break-all leading-6">{link}</p><p className="mt-2 font-bold text-[#8a5a12]">만료: {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(created.expires_at))}</p></div><button type="button" onClick={async () => { try { await copyText(link); setCopied(true); } catch { setError("링크를 복사하지 못했습니다."); } }} className="mt-4 min-h-14 w-full rounded-[14px] bg-[#e8a23d] text-base font-black text-[#2b2723]">{copied ? "✓ 링크가 복사되었습니다" : "서명 링크 복사"}</button><button type="button" onClick={() => void issue()} className="mt-3 min-h-12 w-full rounded-xl bg-[#eee9e0] text-sm font-extrabold text-[#4a453d]">기존 링크 무효화 후 재발급</button></div> : null}
  </section></div>;
}
