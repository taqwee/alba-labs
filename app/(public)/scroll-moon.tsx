"use client";
import { useEffect, useRef, useState } from "react";

export function ScrollMoon({ className }: { className?: string }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let requestRef: number;

    // --- 1. MOUSE MOVEMENT (For Desktop) ---
    const handleMouseMove = (e: MouseEvent) => {
      if (!elementRef.current) return;
      const { clientX, clientY } = e;
      const x = (clientX / window.innerWidth - 0.5) * 2;
      const y = (clientY / window.innerHeight - 0.5) * 2;
      applyTransform(x, y);
    };

    // --- 2. GYROSCOPE MOVEMENT (For Mobile) ---
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (!elementRef.current) return;
      
      // gamma is left/right tilt (-90 to 90 degrees)
      // beta is front/back tilt (-180 to 180 degrees)
      const { beta, gamma } = e;
      
      // Constrain angles so the logo doesn't flip entirely backwards
      const constrainedGamma = Math.max(-45, Math.min(45, gamma || 0)); 
      const constrainedBeta = Math.max(0, Math.min(90, beta || 45)) - 45; 

      const x = constrainedGamma / 45;
      const y = constrainedBeta / 45;
      applyTransform(x, y);
    };

    // Shared transform logic for both mouse and gyroscope
    const applyTransform = (x: number, y: number) => {
      const rotateX = -y * 25;
      const rotateY = x * 25;
      const translateX = x * 40;
      const translateY = y * 40;

      cancelAnimationFrame(requestRef);
      requestRef = requestAnimationFrame(() => {
        if (elementRef.current) {
          elementRef.current.style.transform = `perspective(1000px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
      cancelAnimationFrame(requestRef);
    };
  }, []);

  // --- 3. APPLE iOS SECURITY OVERRIDE ---
  // Modern iPhones block gyroscope access until the user specifically taps the screen
  const requestGyroAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') setGyroEnabled(true);
      } catch (error) {
        console.error("Gyroscope access denied", error);
      }
    }
  };

  return (
    <div 
      className={`cursor-pointer ${className}`} 
      aria-hidden 
      onClick={requestGyroAccess} // Tap anywhere on the graphic to enable iOS gyro
    >
      <div
        ref={elementRef}
        className="relative w-full aspect-square max-w-[400px] md:max-w-full md:h-full mx-auto flex items-center justify-center transition-transform duration-100 ease-out"
        style={{ willChange: "transform", transformStyle: "preserve-3d" }}
      >
        {/* Outer dashed tech ring */}
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
        <div className="absolute top-[10%] right-[15%] w-3 h-3 rounded-full bg-text shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" style={{ transform: "translateZ(50px)" }} />
        <div className="absolute bottom-[20%] left-[10%] w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(164,234,46,1)]" style={{ transform: "translateZ(40px)" }} />
      </div>
    </div>
  );
}