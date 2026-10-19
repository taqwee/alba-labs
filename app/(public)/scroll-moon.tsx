"use client";
import { useEffect, useRef } from "react";

export function ScrollMoon({ className }: { className?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let requestRef: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return;

      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      // Calculate mouse position relative to the center of the screen (-1 to 1)
      const x = (clientX / innerWidth - 0.5) * 2;
      const y = (clientY / innerHeight - 0.5) * 2;

      // Apply 3D tilt and slight parallax translation
      const rotateX = -y * 25; // 25 degrees max tilt
      const rotateY = x * 25;
      const translateX = x * 40; // 40px max movement
      const translateY = y * 40;

      // Use requestAnimationFrame for buttery smooth rendering
      cancelAnimationFrame(requestRef);
      requestRef = requestAnimationFrame(() => {
        if (elementRef.current) {
          elementRef.current.style.transform = `perspective(1000px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef);
    };
  }, []);

  return (
    <div className={className} aria-hidden>
      <div
        ref={elementRef}
        className="relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out"
        style={{ willChange: "transform", transformStyle: "preserve-3d" }}
      >
        {/* Outer dashed tech ring that spins slowly */}
        <div className="absolute inset-0 rounded-full border-[1.5px] border-primary/30 border-dashed animate-[spin_25s_linear_infinite]" />
        
        {/* Middle subtle ring */}
        <div className="absolute w-[85%] h-[85%] rounded-full border border-primary/20" />

        {/* Inner Glowing Core */}
        <div 
          className="relative w-[65%] h-[65%] rounded-full bg-primary/10 backdrop-blur-md border border-primary/40 flex items-center justify-center shadow-[0_0_80px_rgba(164,234,46,0.25)]"
          style={{ transform: "translateZ(30px)" }}
        >
          {/* ALBA LABS LOGO */}
          <img 
  src="/alba-logo.svg" 
  alt="Alba Labs Logo" 
  className="w-[60%] h-auto aspect-square object-cover rounded-full drop-shadow-[0_0_15px_rgba(164,234,46,0.8)]"
/>
        </div>

        {/* Floating accent dots */}
        <div 
          className="absolute top-[10%] right-[15%] w-3 h-3 rounded-full bg-text shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" 
          style={{ transform: "translateZ(50px)" }} 
        />
        <div 
          className="absolute bottom-[20%] left-[10%] w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(164,234,46,1)]" 
          style={{ transform: "translateZ(40px)" }} 
        />
      </div>
    </div>
  );
}