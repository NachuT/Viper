"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const NUM_LINES = 7;
const TOP_MIN = 10; 
const TOP_MAX = 85; 


function getLineConfigs(num: number, min: number, max: number) {
  const configs = [];
  for (let i = 0; i < num; i++) {
    const base = min + ((max - min) * i) / (num - 1);
    const jitter = (Math.random() - 0.5) * 8; 
    const top = Math.max(min, Math.min(max, base + jitter));
    const initialDelay = Math.random() * 2; 
    const negativeOffset = -Math.random() * 1.2; 
    const animationDelay = Math.random() < 0.5 ? `${initialDelay}s` : `${negativeOffset}s`;
    configs.push({ top, animationDelay });
  }
  return configs;
}


function MouseCircle() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      setPos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        left: pos.x - 16,
        top: pos.y - 16,
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "rgba(34,197,94,0.15)",
        border: "2px solid #22c55e",
        boxShadow: "0 0 16px 4px #22c55e55",
        pointerEvents: "none",
        zIndex: 100,
        transition: "left 0.08s linear, top 0.08s linear"
      }}
    />
  );
}

export default function Home() {

  const [lineConfigs, setLineConfigs] = useState<{ top: number; animationDelay: string }[] | null>(null);
  useEffect(() => {
    setLineConfigs(getLineConfigs(NUM_LINES, TOP_MIN, TOP_MAX));
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
      <MouseCircle />

      <div className="absolute inset-0 z-0 pointer-events-none" style={{background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.10) 0%, rgba(0,0,0,0.95) 60%)'}} />
      {/* Shooting green lines background */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        {lineConfigs &&
          lineConfigs.map((cfg, i) => (
            <div
              key={i}
              className="shoot-line-ltr"
              style={{ top: `${cfg.top}%`, animationDelay: cfg.animationDelay }}
            />
          ))}
      </div>

      <main className="relative z-20 flex flex-col items-center justify-center w-full" style={{ minHeight: '70vh' }}>
        <div className="flex flex-col items-center justify-center mb-10">
          <Image 
            src="/transparentdark.png" 
            alt="Viper transparent dark logo" 
            width={480} 
            height={480} 
            className="opacity-95" 
            style={{ maxWidth: '90vw', filter: 'drop-shadow(0 0 64px #22c55e88)' }} 
            priority
          />
        </div>
        <h1 className="viper-glow text-7xl sm:text-8xl lg:text-9xl font-extrabold tracking-tight text-foreground drop-shadow-lg mb-4 text-center" style={{ fontFamily: 'Inter, Arial Black, Arial, sans-serif', letterSpacing: '-0.04em' }}>
          Viper
        </h1>
        <p className="text-2xl sm:text-3xl text-foreground/90 max-w-2xl text-center font-medium mb-6">
          AI-powered Verilog editor for rapid FPGA bitstream generation.
        </p>
        <p className="text-xl sm:text-2xl text-foreground/70 max-w-2xl text-center font-normal mb-8">
          FPGAs should be for everyone.
        </p>

        <div className="flex flex-row gap-6 mt-2">
          <a href="#" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-black font-bold text-lg shadow-lg hover:bg-[#22c55e] hover:text-white transition-colors">

            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.7 15.6c-.1-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.7-3.1.7-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.3-.7 2.6-.7s1.5.7 2.6.7c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0-.1-2.1-.8-2.1-3.2zm-2-6c.6-.7 1-1.7.9-2.7-.9.1-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.5 1 .1 2-.5 2.6-1.1z" fill="#111"/>
            </svg>
            Apple Silicon
          </a>
          <a href="#" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-black font-bold text-lg shadow-lg hover:bg-[#22c55e] hover:text-white transition-colors">

            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="4" width="10" height="9" fill="#0078D4"/>
              <rect x="2" y="15" width="10" height="9" fill="#0078D4"/>
              <rect x="14" y="4" width="12" height="9" fill="#0078D4"/>
              <rect x="14" y="15" width="12" height="9" fill="#0078D4"/>
            </svg>
            Windows 11
          </a>
        </div>
      </main>
    </div>
  );
}
