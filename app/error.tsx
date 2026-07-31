"use client";

export default function GlobalRouteError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-6">
      <section className="w-full max-w-lg rounded-[20px] bg-white p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.07)]">
        <p className="text-4xl" aria-hidden="true">🙏</p>
        <h1 className="mt-4 text-2xl font-extrabold">화면을 불러오지 못했어요</h1>
        <p className="mt-2 text-[#6b6459]">잠시 후 아래 버튼을 눌러 다시 시작해 주세요.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-14 w-full rounded-[14px] bg-[#e8a23d] px-5 text-lg font-extrabold text-[#2b2723]"
        >
          다시 시작
        </button>
      </section>
    </main>
  );
}
