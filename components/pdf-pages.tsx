"use client";

import { useEffect, useRef, useState } from "react";

// PDF를 페이지 그림으로 변환해 전부 이어서 보여준다 (인쇄·PDF 저장 시에도 전 페이지 포함).
// pdf.js를 CDN에서 불러오며, 실패하면 iframe으로 대체한다.
export function PdfPages({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const pdfjsWindow = window as unknown as { pdfjsLib?: any };
        if (!pdfjsWindow.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("pdfjs load failed"));
            document.head.appendChild(script);
          });
        }
        const pdfjs = (window as unknown as { pdfjsLib: any }).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdf = await pdfjs.getDocument({ url }).promise;
        const container = containerRef.current;
        if (!container || cancelled) return;
        container.innerHTML = "";
        const width = container.clientWidth || 720;
        const scaleBoost = Math.min(window.devicePixelRatio || 1, 2);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = (width / baseViewport.width) * scaleBoost;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = "12px";
          const context = canvas.getContext("2d");
          if (!context) continue;
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setFailed(true); setLoading(false); }
      }
    }
    void render();
    return () => { cancelled = true; };
  }, [url]);

  if (failed) {
    return <iframe src={url} title="문서" className="h-[70vh] w-full rounded-xl" />;
  }
  return (
    <div>
      {loading ? <p className="p-6 text-center text-sm font-bold text-[#8a8378]">문서를 불러오는 중...</p> : null}
      <div ref={containerRef} />
    </div>
  );
}
