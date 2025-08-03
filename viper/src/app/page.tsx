"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";

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

function ThemeToggle({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <button
      aria-label="Toggle light/dark mode"
      className="fixed top-6 right-6 z-[200] bg-background border border-foreground/20 rounded-full p-2 shadow hover:bg-accent hover:text-black transition-colors"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      style={{ fontSize: 28 }}
    >
      {theme === "light" ? <FiMoon size={28} /> : <FiSun size={28} />}
    </button>
  );
}

export default function Home() {
  const [lineConfigs, setLineConfigs] = useState<{ top: number; animationDelay: string }[] | null>(null);
  const [theme, setTheme] = useState("dark");
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showWindowsComing, setShowWindowsComing] = useState(false);

  useEffect(() => {
    setLineConfigs(getLineConfigs(NUM_LINES, TOP_MIN, TOP_MAX));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);

  // First visit welcome logic
  useEffect(() => {
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("viper-welcome");
      if (!seen) {
        setShowWelcome(true);
        setTimeout(() => {
          setWelcomeDone(true);
          localStorage.setItem("viper-welcome", "1");
        }, 2200); // 2.2s for animation
      } else {
        setWelcomeDone(true);
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[var(--background)] overflow-hidden">
      {showWelcome && !welcomeDone && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[var(--background)] transition-all duration-700" style={{animation: 'welcomeUp 2.2s cubic-bezier(.4,0,.2,1) forwards'}}>
          <span className="welcome-cursive text-4xl sm:text-6xl md:text-7xl text-[var(--accent)] drop-shadow-lg text-center select-none">
            Welcome to Viper
          </span>
          <style>{`
            @keyframes welcomeUp {
              0% { opacity: 1; transform: translateY(0); }
              80% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-60vh); }
            }
          `}</style>
        </div>
      )}
      {welcomeDone && (
        <>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <MouseCircle />
          
          {/* Thank You Popup */}
          {showThankYou && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className={`bg-[var(--background)] border border-[var(--accent)] rounded-2xl p-8 mx-4 max-w-md text-center shadow-2xl transform transition-all duration-300 ${showThankYou ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">Thank You!</h3>
                <p className="text-[var(--foreground)]/80 mb-6">Make sure to Unzip!</p>
                <button
                  onClick={() => setShowThankYou(false)}
                  className="px-6 py-3 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          )}

          {/* Windows Coming Soon Popup */}
          {showWindowsComing && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className={`bg-[var(--background)] border border-[var(--accent)] rounded-2xl p-8 mx-4 max-w-md text-center shadow-2xl transform transition-all duration-300 ${showWindowsComing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                <h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">Coming Soon!</h3>
                <p className="text-[var(--foreground)]/80 mb-6">Windows version will be released when I get back to my Windows computer.</p>
                <button
                  onClick={() => setShowWindowsComing(false)}
                  className="px-6 py-3 bg-[var(--accent)] text-black font-bold rounded-xl hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          )}
          <div className="absolute inset-0 z-0 pointer-events-none" style={{background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.10) 0%, var(--background) 60%)'}} />
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
            <div className="flex flex-col items-center justify-center mb-6 sm:mb-10">
              <Image 
                src={theme === "light" ? "/transparentlight.png" : "/transparentdark.png"}
                alt="Viper logo" 
                width={480} 
                height={480} 
                className="opacity-95 w-48 h-48 sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px] lg:w-[480px] lg:h-[480px]"
                style={{ maxWidth: '90vw', filter: 'drop-shadow(0 0 64px #22c55e88)' }} 
                priority
              />
            </div>
            <h1 className="viper-glow text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-[var(--foreground)] drop-shadow-lg mb-3 sm:mb-4 text-center" style={{ fontFamily: 'Inter, Arial Black, Arial, sans-serif', letterSpacing: '-0.04em' }}>
              Viper
            </h1>
            <p className="text-lg sm:text-2xl md:text-3xl text-[var(--foreground)] max-w-xs sm:max-w-2xl text-center font-medium mb-4 sm:mb-6">
              AI-powered Verilog editor for rapid FPGA bitstream generation.
            </p>
            <p className="text-base sm:text-xl md:text-2xl text-[var(--foreground)]/70 max-w-xs sm:max-w-2xl text-center font-normal mb-6 sm:mb-8 underline decoration-[3px] decoration-[var(--accent)] underline-offset-8">
              FPGAs should be for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-2 w-full max-w-xs sm:max-w-none items-center justify-center">
              <a
                href="/Viper Desktop-darwin-arm64-1.0.0.zip"
                download="Viper Desktop-darwin-arm64-1.0.0.zip"
                onClick={() => setShowThankYou(true)}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-colors transform hover:scale-105 active:scale-100 duration-150 w-full sm:w-auto
                  ${theme === "light"
                    ? "bg-[var(--foreground)] text-white hover:bg-[var(--accent)] hover:text-white"
                    : "bg-[var(--foreground)] text-black hover:bg-[var(--accent)] hover:text-black"}
                `}
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.7 15.6c-.1-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.7-3.1.7-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.3-.7 2.6-.7s1.5.7 2.6.7c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0-.1-2.1-.8-2.1-3.2zm-2-6c.6-.7 1-1.7.9-2.7-.9.1-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.5 1 .1 2-.5 2.6-1.1z" fill={theme === "light" ? "#fff" : "#111"}/>
                </svg>
                Apple Silicon
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowWindowsComing(true);
                }}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-colors transform hover:scale-105 active:scale-100 duration-150 w-full sm:w-auto
                  ${theme === "light"
                    ? "bg-[var(--foreground)] text-white hover:bg-[var(--accent)] hover:text-white"
                    : "bg-[var(--foreground)] text-black hover:bg-[var(--accent)] hover:text-black"}
                `}
              >
                <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="10" height="9" fill="#0078D4"/>
                  <rect x="2" y="15" width="10" height="9" fill="#0078D4"/>
                  <rect x="14" y="4" width="12" height="9" fill="#0078D4"/>
                  <rect x="14" y="15" width="12" height="9" fill="#0078D4"/>
                </svg>
                Windows 11
              </a>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
