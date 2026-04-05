"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollFloatProps {
  children: ReactNode;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
  containerClassName?: string;
  textClassName?: string;
  spanClassName?: string;
  /** Play on mount instead of on scroll */
  animateOnMount?: boolean;
  /** Delay before mount animation starts (seconds) */
  mountDelay?: number;
}

export default function ScrollFloat({
  children,
  animationDuration = 1,
  ease = "back.inOut(2)",
  scrollStart = "center bottom+=50%",
  scrollEnd = "bottom bottom-=40%",
  stagger = 0.03,
  containerClassName = "",
  textClassName = "",
  spanClassName = "",
  animateOnMount = false,
  mountDelay = 0.3,
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const spans = el.querySelectorAll<HTMLSpanElement>(".scroll-float-char");
    if (!spans.length) return;

    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(spans, { y: 0, opacity: 1, rotateX: 0 });
      return;
    }

    if (animateOnMount) {
      gsap.fromTo(
        spans,
        { y: 80, opacity: 0, rotateX: -60 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: animationDuration,
          ease,
          stagger,
          delay: mountDelay,
        },
      );
    } else {
      gsap.fromTo(
        spans,
        { y: 80, opacity: 0, rotateX: -60 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: animationDuration,
          ease,
          stagger,
          scrollTrigger: {
            trigger: containerRef.current,
            start: scrollStart,
            end: scrollEnd,
            scrub: true,
          },
        },
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [
    animateOnMount,
    mountDelay,
    animationDuration,
    ease,
    scrollStart,
    scrollEnd,
    stagger,
  ]);

  // Split children text into individual character spans
  // Handles mixed children (strings + elements like <span>USC</span>)
  const renderChars = (nodes: ReactNode): ReactNode[] => {
    const result: ReactNode[] = [];
    let charIndex = 0;

    const processNode = (node: ReactNode) => {
      if (typeof node === "string") {
        node.split("").forEach((char) => {
          result.push(
            <span
              key={charIndex}
              className={`scroll-float-char inline-block ${spanClassName}`}
              style={{ display: "inline-block", perspective: "800px" }}
            >
              {char === " " ? "\u00A0" : char}
            </span>,
          );
          charIndex++;
        });
      } else if (node && typeof node === "object" && "props" in node) {
        // It's a React element (e.g. <span style={...}>USC</span>)
        const el = node as React.ReactElement<{
          children?: ReactNode;
          className?: string;
          style?: React.CSSProperties;
        }>;
        const text =
          typeof el.props.children === "string" ? el.props.children : "";
        const { children: _children, ...restProps } = el.props;
        text.split("").forEach((char: string) => {
          result.push(
            <span
              key={charIndex}
              {...restProps}
              className={`scroll-float-char inline-block ${el.props.className || ""} ${spanClassName}`}
              style={{
                ...el.props.style,
                display: "inline-block",
                perspective: "800px",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>,
          );
          charIndex++;
        });
      }
    };

    if (Array.isArray(nodes)) {
      nodes.forEach(processNode);
    } else {
      processNode(nodes);
    }

    return result;
  };

  return (
    <div ref={containerRef} className={containerClassName}>
      <div ref={textRef} className={textClassName}>
        {renderChars(children)}
      </div>
    </div>
  );
}
