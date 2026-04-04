"use client";

import { useState, useEffect, useCallback, Children, ReactNode } from "react";

/* ─── Card child component ─── */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/* ─── CardSwap container ─── */
interface CardSwapProps {
  children: ReactNode;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
}

export default function CardSwap({
  children,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = true,
}: CardSwapProps) {
  const cards = Children.toArray(children);
  const [stack, setStack] = useState(() => cards.map((_, i) => i));
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const sendToBack = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setStack((prev) => {
        const next = [...prev];
        const top = next.shift()!;
        next.push(top);
        return next;
      });
      setDragX(0);
      setIsAnimating(false);
    }, 400);
  }, [isAnimating]);

  // Auto-swap timer
  useEffect(() => {
    if (delay <= 0 || isPaused) return;
    const timer = setInterval(sendToBack, delay);
    return () => clearInterval(timer);
  }, [delay, isPaused, sendToBack]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragX) > 80) {
      sendToBack();
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
    >
      {[...stack].reverse().map((cardIndex) => {
        const depth = stack.indexOf(cardIndex);
        const isTop = depth === 0;
        const visible = depth < 4;
        if (!visible) return null;

        const rotations = [0, -3, 2.5, -1.5];
        const rotation = rotations[depth] || 0;
        const scale = 1 - depth * 0.035;
        const yOffset = depth * verticalDistance * 0.15;
        const xOffset = depth * cardDistance * 0.12;

        const swipingOut = isTop && isAnimating;
        const activeRotation = isTop && !isAnimating ? dragX * 0.06 : rotation;
        const activeX = isTop && !isAnimating ? dragX : xOffset;

        return (
          <div
            key={cardIndex}
            className={`absolute inset-0 rounded-2xl overflow-hidden shadow-xl ${isTop ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{
              transform: swipingOut
                ? `translateX(${dragX >= 0 ? 500 : -500}px) rotate(${dragX >= 0 ? 25 : -25}deg) scale(${scale})`
                : `translateX(${activeX}px) translateY(${yOffset}px) rotate(${activeRotation}deg) scale(${scale})`,
              transition: isDragging && isTop
                ? "none"
                : swipingOut
                  ? "transform 0.4s ease-in"
                  : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: cards.length - depth,
              opacity: depth >= 3 ? 0.5 : 1,
              touchAction: "none",
            }}
            onPointerDown={isTop ? handlePointerDown : undefined}
            onPointerMove={isTop ? handlePointerMove : undefined}
            onPointerUp={isTop ? handlePointerUp : undefined}
          >
            {cards[cardIndex]}
          </div>
        );
      })}
    </div>
  );
}
