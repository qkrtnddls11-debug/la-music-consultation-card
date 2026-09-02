"use client";

import { useEffect, useRef, useState } from "react";

type DocumentState = { hasCustom: boolean; name: string | null; version: string } | null;

// 지점별 학원규칙 동의서 파일 교체 (서명·동의 절차는 시스템 고정)
export function RulesDocumentDialog({ onClose, branchName }: { onClose: () => void; branchName?: string }) {
  const [ruleDoc, setRuleDoc] = useState<DocumentState>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const response = await fetch(`/api/branch-documents?branch=${encodeURIComponent(branchName || "")}`, { cache: "no-store" });
      if (!response.ok) return;
      setRuleDoc(await response.json());
    } catch { /* 조회 실패 시 기본판 안내 유지 */ }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refresh(); }, [branchName]);

  async function upload(file: File) {
    setBusy(true); setNote("");
    try {
      // 파일은 서버를 거치지 않고 저장소로 직행한다 (서버 경유는 4.5MB에서 잘려 폰 사진이 실패).
      const signResponse = await fetch("/api/admin/branch-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign", branch: branchName || "", fileName: file.name, fileType: file.type, fileSize: file.size })
      });
      const signData = await signResponse.json().catch(() => ({})) as { error?: string; path?: string; signedUrl?: string };
      if (!signResponse.ok || !signData.path || !signData.signedUrl) throw new Error(signData.error || "업로드를 준비하지 못했습니다.");

      const putResponse = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
      if (!putResponse.ok) throw new Error("파일을 저장소에 올리지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");

      const commitResponse = await fetch("/api/admin/branch-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", branch: branchName || "", path: signData.path, fileName: file.name, fileType: file.type })
      });
      const commitData = await commitResponse.json().catch(() => ({})) as { error?: string };
      if (!commitResponse.ok) throw new Error(commitData.error || "업로드 기록을 저장하지 못했습니다.");

      setNote("업로드되었습니다. 이제 이 파일로 동의를 받습니다.");
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "올리지 못했습니다.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function resetToDefault() {
    if (!window.confirm("올린 파일을 지우고 기본 학원규칙으로 되돌릴까요?")) return;
    setBusy(true); setNote("");
    try {
      const response = await fetch(`/api/admin/branch-documents?branch=${encodeURIComponent(branchName || "")}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "되돌리지 못했습니다.");
      setNote("기본 학원규칙으로 되돌렸습니다.");
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "되돌리지 못했습니다.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="rules-doc-title"
      onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="w-full max-w-md rounded-[22px] bg-white p-5 shadow-2xl sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rules-doc-title" className="text-xl font-extrabold">학원규칙 동의서 서식</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#7d756a]">지점 규칙 파일을 올리면 그 파일로 동의를 받습니다. 서명·개인정보 동의 절차는 그대로예요.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eee9e0] text-xl font-bold">×</button>
        </header>

        <div className={`mt-5 rounded-[14px] p-3.5 text-sm ${ruleDoc?.hasCustom ? "bg-emerald-50 text-emerald-900" : "bg-[#f7f4ee] text-[#5f584e]"}`}>
          <p className="font-bold">{ruleDoc?.hasCustom ? "현재: 업로드한 지점 서식" : "현재: 기본 학원규칙(우리 버전)"}</p>
          {ruleDoc?.hasCustom ? <p className="mt-1 break-all">{ruleDoc.name} · {ruleDoc.version}</p> : <p className="mt-1">파일을 올리지 않으면 기본판이 사용됩니다.</p>}
        </div>

        <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />

        <div className="mt-5 grid gap-3">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="min-h-14 rounded-[14px] bg-[#e8a23d] px-4 text-base font-extrabold text-[#2b2723] disabled:opacity-60">
            {busy ? "처리 중…" : ruleDoc?.hasCustom ? "다른 파일로 교체" : "규칙 파일 올리기 (PDF·이미지)"}
          </button>
          {ruleDoc?.hasCustom ? (
            <button type="button" disabled={busy} onClick={() => void resetToDefault()} className="min-h-14 rounded-[14px] bg-[#eee9e0] px-4 text-base font-extrabold text-[#3f3a33] disabled:opacity-60">기본 학원규칙으로 되돌리기</button>
          ) : null}
        </div>

        {note ? <p className="mt-4 text-center text-sm font-bold text-[#4a453d]">{note}</p> : null}
        <p className="mt-3 text-center text-xs text-[#9a9389]">PDF·PNG·JPG · 최대 10MB</p>
      </section>
    </div>
  );
}
