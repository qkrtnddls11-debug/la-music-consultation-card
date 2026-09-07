"use client";

import { useEffect, useRef, useState } from "react";

// 체험수업 배정 도우미. 넓은 화면에서는 오른쪽 빈 공간에 붙고, 좁은 화면에서는 아래 버튼으로 접힌다.
// 강사·빈 강의실 계산은 CRM이 하고 여기서는 받아서 보여주기만 한다.
type AssistRange = { from: string; to: string; rooms: string[] };
type AssistHit = { name: string; subject: string; ranges: AssistRange[] };
type AssistAnswer = {
  kind?: string;
  text?: string;
  date?: string;
  weekday?: string;
  subject?: string;
  fromTime?: string;
  toTime?: string;
  closed?: string;
  hits?: AssistHit[];
  unmarked?: string[];
  error?: string;
};
type Message = { role: "user" | "assistant"; text?: string; answer?: AssistAnswer };

const SAMPLES = [
  "이번주 토요일 보컬 체험 가능한 강사",
  "내일 5시에 되는 강사",
  "9월 12일 3시 기타"
];

export function CrmAssistPanel({ branch }: { branch: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch, question: text })
      });
      const data = await response.json() as AssistAnswer;
      setMessages((current) => [...current, { role: "assistant", answer: data }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", answer: { error: "연결에 실패했습니다. 잠시 후 다시 시도해주세요." } }]);
    }
    setBusy(false);
  }

  const body = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-[#e4ded4] px-3.5 py-3">
        <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-900">AI</span>
        <p className="text-sm font-black text-[#4a453d]">체험수업 배정 도우미</p>
        {messages.length > 0 ? (
          <button type="button" onClick={() => setMessages([])} className="ml-auto text-xs font-bold text-[#9a9389]">지우기</button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`text-xs font-bold text-[#9a9389] xl:hidden ${messages.length > 0 ? "ml-2" : "ml-auto"}`}
        >
          닫기
        </button>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3.5">
        {messages.length === 0 ? (
          <>
            <p className="text-sm leading-6 text-[#6b6459]">
              언제 무슨 과목인지 물어보시면 <span className="font-bold text-[#4a453d]">가능한 강사와 빈 강의실</span>을 찾아드립니다.
              답은 CRM 자료로 계산합니다.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => void ask(sample)}
                  className="rounded-lg border border-[#e4ded4] bg-[#faf9f6] px-2.5 py-1.5 text-xs font-bold text-[#6b6459]"
                >
                  {sample}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((message, index) => {
            if (message.role === "user") {
              return (
                <p key={index} className="ml-auto max-w-[92%] rounded-xl bg-[#2b2723] px-3 py-2 text-sm font-bold text-white">
                  {message.text}
                </p>
              );
            }
            const answer = message.answer || {};
            if (answer.error) {
              return <p key={index} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{answer.error}</p>;
            }
            if (answer.kind !== "availability") {
              return (
                <p key={index} className="rounded-xl border border-[#e4ded4] bg-white px-3 py-2 text-sm leading-6 text-[#4a453d]">
                  {answer.text || "답을 받지 못했습니다."}
                </p>
              );
            }
            return (
              <div key={index} className="rounded-xl border border-[#e4ded4] bg-white p-3">
                <p className="text-sm font-black text-[#4a453d]">
                  {(answer.date || "").slice(5).replace("-", "/")}({answer.weekday})
                  {answer.subject ? ` · ${answer.subject}` : ""}
                  {answer.fromTime ? ` · ${answer.fromTime}~${answer.toTime || "마감"}` : " · 종일"}
                </p>
                {answer.closed ? (
                  <p className="mt-1.5 text-sm font-bold text-red-700">이 날은 {answer.closed}입니다.</p>
                ) : (answer.hits || []).length === 0 ? (
                  <p className="mt-1.5 text-sm text-[#6b6459]">가능한 강사가 없습니다.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {(answer.hits || []).map((hit) => (
                      <div key={hit.name} className="rounded-lg bg-[#faf9f6] p-2">
                        <p className="text-sm font-black text-[#4a453d]">
                          {hit.name} <span className="text-xs font-bold text-[#9a9389]">{hit.subject}</span>
                        </p>
                        {hit.ranges.map((range) => (
                          <p key={range.from} className="mt-0.5 text-xs font-bold text-[#6b6459]">
                            {range.from}~{range.to} ·{" "}
                            {range.rooms.length > 0
                              ? `강의실 ${range.rooms.join(", ")}`
                              : <span className="text-red-700">이 시간 내내 비는 방 없음</span>}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {(answer.unmarked || []).length > 0 ? (
                  <p className="mt-2 text-[11px] leading-5 text-[#9a9389]">
                    {(answer.unmarked || []).join(", ")} 강사는 안 되는 시간을 아직 표시하지 않아, 잡힌 수업만 빠진 결과입니다.
                  </p>
                ) : null}
              </div>
            );
          })
        )}
        {busy ? <p className="text-xs font-bold text-[#9a9389]">찾는 중…</p> : null}
      </div>

      <div className="flex gap-2 border-t border-[#e4ded4] p-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(draft);
            }
          }}
          rows={2}
          placeholder="예: 이번주 토요일 보컬 체험 가능한 강사"
          className="min-w-0 flex-1 resize-none rounded-xl border border-[#e4ded4] bg-white px-3 py-2 text-sm text-[#4a453d] outline-none focus:border-[#e8a23d]"
        />
        <button
          type="button"
          onClick={() => void ask(draft)}
          disabled={busy || draft.trim() === ""}
          className="min-h-12 shrink-0 rounded-xl bg-[#e8a23d] px-3.5 text-sm font-extrabold text-[#2b2723] disabled:opacity-50"
        >
          {busy ? "…" : "찾기"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 넓은 화면: 본문 오른쪽 빈 공간에 붙여둔다 */}
      <aside className="fixed right-5 top-24 bottom-5 z-10 hidden w-[340px] flex-col overflow-hidden rounded-[18px] border border-[#e4ded4] bg-white shadow-[0_2px_14px_rgba(0,0,0,0.08)] xl:flex 2xl:w-[380px]">
        {body}
      </aside>

      {/* 좁은 화면: 버튼으로 접어둔다 */}
      {open ? (
        <div className="fixed inset-x-3 bottom-3 top-20 z-30 flex flex-col overflow-hidden rounded-[18px] border border-[#e4ded4] bg-white shadow-2xl xl:hidden">
          {body}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#e8a23d] px-5 py-4 text-sm font-black text-[#2b2723] shadow-2xl xl:hidden"
        >
          <span className="rounded-md bg-[#2b2723]/15 px-1.5 py-0.5 text-[10px] font-black">AI</span>
          체험 배정 도우미
        </button>
      )}
    </>
  );
}
