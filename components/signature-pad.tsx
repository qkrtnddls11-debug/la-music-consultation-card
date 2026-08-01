"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  toDataUrl: () => string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, {
  label: string;
  guideText?: string;
  onInkChange: (hasInk: boolean) => void;
}>(function SignaturePad({ label, guideText, onInkChange }, forwardedRef) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const movedRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (guideText) {
      const fontSize = Math.max(78, Math.min(150, 780 / Math.max(guideText.length, 2)));
      context.save();
      context.fillStyle = "#d8d5d0";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `800 ${fontSize}px Apple SD Gothic Neo, Noto Sans KR, sans-serif`;
      context.fillText(guideText, canvas.width / 2, canvas.height / 2);
      context.restore();
    }
  }

  function clear() {
    drawingRef.current = false;
    movedRef.current = false;
    setHasInk(false);
    onInkChange(false);
    prepareCanvas();
  }

  useEffect(() => {
    prepareCanvas();
    setHasInk(false);
    onInkChange(false);
  // The callback is intentionally excluded so a parent render cannot erase handwriting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideText]);

  useImperativeHandle(forwardedRef, () => ({
    clear,
    toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }));

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 8;
    context.strokeStyle = "#181511";
    drawingRef.current = true;
    movedRef.current = false;
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
    movedRef.current = true;
    if (!hasInk) {
      setHasInk(true);
      onInkChange(true);
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    if (!movedRef.current) {
      const context = event.currentTarget.getContext("2d");
      const current = point(event);
      if (context) {
        context.beginPath();
        context.arc(current.x, current.y, 4, 0, Math.PI * 2);
        context.fillStyle = "#181511";
        context.fill();
      }
      setHasInk(true);
      onInkChange(true);
    }
    drawingRef.current = false;
    movedRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="font-extrabold text-[#2b2723]">{label}</label>
        <button type="button" onClick={clear} className="min-h-12 rounded-xl bg-[#eee9e0] px-4 text-sm font-bold text-[#4a453d]">다시 쓰기</button>
      </div>
      <canvas
        ref={canvasRef}
        width={1200}
        height={360}
        aria-label={label}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        className="h-[180px] w-full touch-none rounded-2xl border-2 border-dashed border-[#bdb6aa] bg-white shadow-inner sm:h-[220px]"
      />
      <p className="mt-2 text-xs font-semibold text-[#8a8378]">손가락, 태블릿 펜, 마우스로 작성할 수 있습니다.{hasInk ? " · 작성됨" : ""}</p>
    </section>
  );
});
