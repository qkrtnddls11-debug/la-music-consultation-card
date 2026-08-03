"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "link" | "message" | "error";

export function buildConsultationMessage(link: string) {
  return `원활한 상담 진행을 위해 아래 링크에서 상담 예약 정보를 작성해 주시면 감사하겠습니다^^

${link}

작성해 주시면 확인 후 빠르게 일정 잡아드릴게요!
최대한 맞춰드리려고 하지만, 선생님 스케줄에 따라 조정이 필요할 수도 있는 점 양해 부탁드립니다. 감사합니다!`;
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("clipboard copy failed");
  }
}

export function ConsultationLinkDialog({ onClose, branchName }: { onClose: () => void; branchName?: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const branchQuery = branchName ? `&branch=${encodeURIComponent(branchName)}` : "";
  const link = typeof window === "undefined"
    ? `/reserve?src=link${branchQuery}`
    : `${window.location.origin}/reserve?src=link${branchQuery}`;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function copy(kind: "link" | "message") {
    setCopyState("idle");
    try {
      await writeClipboard(kind === "link" ? link : buildConsultationMessage(link));
      setCopyState(kind);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-link-title"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}
    >
      <section className="w-full max-w-md rounded-[22px] bg-white p-5 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="consultation-link-title" className="text-xl font-extrabold">상담 링크 보내기</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#7d756a]">카톡이나 문자에 붙여넣을 내용을 선택해 주세요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="상담 링크 팝업 닫기" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eee9e0] text-xl font-bold">×</button>
        </header>

        <div className="mt-5 rounded-[14px] bg-[#f7f4ee] p-3.5 text-sm text-[#5f584e]">
          <p className="font-bold">보내지는 상담 주소</p>
          <p className="mt-1 break-all leading-relaxed">{link}</p>
        </div>

        <div className="mt-5 grid gap-3">
          <button type="button" onClick={() => void copy("link")} className="min-h-14 rounded-[14px] bg-[#eee9e0] px-4 text-base font-extrabold text-[#3f3a33] active:scale-[0.99]">링크만 복사</button>
          <button type="button" onClick={() => void copy("message")} className="min-h-14 rounded-[14px] bg-[#e8a23d] px-4 text-base font-extrabold text-[#2b2723] shadow-[0_4px_14px_rgba(232,162,61,0.28)] active:scale-[0.99]">안내문 + 링크 복사</button>
        </div>

        <div className="mt-4 min-h-6 text-center text-sm font-bold" role="status" aria-live="polite">
          {copyState === "link" || copyState === "message" ? <span className="text-emerald-700">✓ 복사되었습니다</span> : null}
          {copyState === "error" ? <span className="text-red-700">복사하지 못했습니다. 다시 눌러 주세요.</span> : null}
        </div>
      </section>
    </div>
  );
}
