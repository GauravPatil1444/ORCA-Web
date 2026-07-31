// src/pages/SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import orcaText from '../assets/text.lottie';
import { useAuthListener } from '../hooks/useAuthListener';

/* Ambient knowledge-graph — same motif as the auth screen & workspace,
   so the intro reads as the same product, not a separate loading page. */
const NODES = [
  { x: 90,  y: 120, c: '#60a5fa' },
  { x: 250, y: 70,  c: '#34d399' },
  { x: 410, y: 150, c: '#fbbf24' },
  { x: 150, y: 280, c: '#e879f9' },
  { x: 330, y: 320, c: '#22d3ee' },
  { x: 470, y: 250, c: '#60a5fa' },
  { x: 60,  y: 410, c: '#34d399' },
  { x: 240, y: 440, c: '#fbbf24' },
  { x: 430, y: 420, c: '#e879f9' },
];
const EDGES = [[0,1],[1,2],[0,3],[3,4],[2,5],[4,5],[3,6],[6,7],[7,4],[4,8],[7,8]];

const ambientCss = `
  @keyframes orca-dash   { to { stroke-dashoffset: -240; } }
  @keyframes orca-ping   { 0% { transform: scale(1); opacity: .5; } 70%,100% { transform: scale(2.7); opacity: 0; } }
  @keyframes orca-grid   { from { background-position: 0 0; } to { background-position: 48px 48px; } }
  @keyframes orca-breathe{ 0%,100% { opacity: .4; transform: translate(-50%,-50%) scale(1); } 50% { opacity: .75; transform: translate(-50%,-50%) scale(1.1); } }
  @keyframes orca-drift  { 0% { transform: translate(0,0); } 50% { transform: translate(28px,-22px); } 100% { transform: translate(0,0); } }
  @keyframes orca-rise   { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .orca-line   { stroke-dasharray: 6 12; animation: orca-dash 11s linear infinite; }
  .orca-ring   { transform-box: fill-box; transform-origin: center; animation: orca-ping 3.8s cubic-bezier(0,0,.2,1) infinite; }
  .orca-grid   { background-image: radial-gradient(circle, var(--orca-dot, rgba(148,163,184,.16)) 1px, transparent 1.5px); background-size: 24px 24px; animation: orca-grid 28s linear infinite; }
  .orca-breathe{ animation: orca-breathe 9s ease-in-out infinite; }
  .orca-drift  { animation: orca-drift 26s ease-in-out infinite; }
  .orca-rise   { animation: orca-rise .7s cubic-bezier(.16,1,.3,1) both; }
  @media (prefers-reduced-motion: reduce) {
    .orca-line,.orca-ring,.orca-grid,.orca-breathe,.orca-drift,.orca-rise { animation: none !important; }
  }
`;

const SplashScreen = () => {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const { isAuthReady } = useAuthListener();

  const [showText, setShowText] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const hasNavigated = useRef(false);

  // Staged reveal + hard fallback so we never get stuck if the lottie
  // onAnimationEnd never fires (cached asset / decode hiccup).
  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 2500);
    const navTimer = setTimeout(() => setIsFinished(true), 5500);
    return () => { clearTimeout(textTimer); clearTimeout(navTimer); };
  }, []);

  // Determinate progress: eases toward ~88% while we wait, snaps to 100%
  // the moment both the animation and the auth check have resolved.
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p < 88 ? p + (88 - p) * 0.06 + 0.5 : p));
    }, 90);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (isFinished && isAuthReady) setProgress(100);
  }, [isFinished, isAuthReady]);

  // One-shot, loop-safe routing — now with a cinematic exit instead of a cut.
  useEffect(() => {
    if (hasNavigated.current) return;
    if (isFinished && isAuthReady) {
      hasNavigated.current = true;
      setLeaving(true);
      const t = setTimeout(
        () => navigate(user ? '/workspace' : '/auth', { replace: true }),
        520,
      );
      return () => clearTimeout(t);
    }
  }, [isFinished, isAuthReady, user, navigate]);

  return (
    <div
      className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden
        bg-gradient-to-br from-slate-50 via-white to-slate-100
        dark:from-slate-950 dark:via-slate-900 dark:to-blue-950
        transition-all duration-500 ease-out
        ${leaving ? 'scale-[1.04] opacity-0 blur-[3px]' : 'scale-100 opacity-100 blur-0'}`}
    >
      <style>{ambientCss}</style>

      {/* drifting colour atmosphere */}
      <div className="orca-drift pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/15" />
      <div className="orca-drift pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-600/10" style={{ animationDelay: '-13s' }} />

      {/* panning dot grid (theme-aware via CSS var) */}
      <div className="orca-grid pointer-events-none absolute inset-0 [--orca-dot:rgba(100,116,139,0.18)] dark:[--orca-dot:rgba(148,163,184,0.14)]" />

      {/* the knowledge graph */}
      <svg viewBox="0 0 540 520" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full text-slate-300/70 dark:text-slate-600/60">
        {EDGES.map(([a, b], i) => (
          <line key={i} className="orca-line" x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="currentColor" strokeWidth={1} style={{ animationDelay: `${i * 0.5}s` }} />
        ))}
        {NODES.map((n, i) => (
          <g key={i}>
            <circle className="orca-ring" cx={n.x} cy={n.y} r={7} fill={n.c} style={{ animationDelay: `${i * 0.4}s`, opacity: 0.4 }} />
            <circle cx={n.x} cy={n.y} r={4.5} fill={n.c} />
            <circle cx={n.x} cy={n.y} r={1.8} className="fill-white dark:fill-slate-950" />
          </g>
        ))}
      </svg>

      {/* breathing halo behind the wordmark */}
      <div className="orca-breathe pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-500/10" />

      {/* top: live status pill */}
      <div className="orca-rise absolute inset-x-0 top-7 flex justify-center px-4" style={{ animationDelay: '120ms' }}>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/60 px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-slate-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </span>
      </div>

      {/* center: brand animation + display/body type pairing */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className={`h-24 w-72 transition-all duration-700 ease-out sm:h-28 sm:w-80 ${showText ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
          {showText && (
            <DotLottieReact
              src={orcaText}
              autoplay
              loop={false}
              speed={1.0}
              className="h-full w-full dark:brightness-0 dark:invert"
              onAnimationEnd={() => setIsFinished(true)}
            />
          )}
        </div>

        <p className="orca-rise mt-6 font-['Orbitron'] text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-400 dark:text-slate-500" style={{ animationDelay: '300ms' }}>
          Retrieval · Reasoning · Response
        </p>
        <h1 className="orca-rise mt-3 max-w-md text-2xl font-bold leading-snug tracking-tight text-slate-800 dark:text-slate-100 sm:text-[1.7rem]" style={{ animationDelay: '380ms' }}>
          One workspace for every document, every page, every answer.
        </h1>
      </div>

      {/* bottom: determinate progress + caption */}
      <div className="orca-rise absolute inset-x-0 bottom-9 flex flex-col items-center gap-3 px-6" style={{ animationDelay: '460ms' }}>
        <div className="h-[3px] w-60 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80 sm:w-72">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <div className="flex w-60 items-center justify-between sm:w-72">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {isFinished && isAuthReady ? 'Opening workspace' : 'Preparing your knowledge base'}
          </span>
          <span className="font-['Orbitron'] text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;