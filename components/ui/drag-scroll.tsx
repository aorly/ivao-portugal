"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export function DragScroll({ className, children }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const momentumFrame = useRef<number | null>(null);

  const stopMomentum = () => {
    if (momentumFrame.current !== null) {
      cancelAnimationFrame(momentumFrame.current);
      momentumFrame.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = containerRef.current;
    if (!target) return;
    stopMomentum();
    target.setPointerCapture(event.pointerId);
    dragStartX.current = event.clientX;
    dragStartScroll.current = target.scrollLeft;
    lastX.current = event.clientX;
    lastTime.current = performance.now();
    velocity.current = 0;
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const target = containerRef.current;
    if (!target) return;
    const delta = event.clientX - dragStartX.current;
    target.scrollLeft = dragStartScroll.current - delta;
    const now = performance.now();
    const dt = Math.max(16, now - lastTime.current);
    const dx = event.clientX - lastX.current;
    velocity.current = dx / dt;
    lastX.current = event.clientX;
    lastTime.current = now;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = containerRef.current;
    if (target) {
      target.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
    const startMomentum = () => {
      const container = containerRef.current;
      if (!container) return;
      const friction = 0.95;
      velocity.current *= friction;
      if (Math.abs(velocity.current) < 0.02) {
        stopMomentum();
        return;
      }
      container.scrollLeft -= velocity.current * 16;
      momentumFrame.current = requestAnimationFrame(startMomentum);
    };
    if (Math.abs(velocity.current) > 0.02) {
      momentumFrame.current = requestAnimationFrame(startMomentum);
    }
  };

  useEffect(() => stopMomentum, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ userSelect: isDragging ? "none" : "auto" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {children}
    </div>
  );
}
