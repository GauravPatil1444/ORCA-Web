// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthListener } from '../hooks/useAuthListener';
import { useStore } from '../store/useStore';

interface Props {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  // 1. ALL HOOKS FIRST — unconditional, fixed order, every render.
  const { isAuthReady } = useAuthListener();
  const user = useStore((s) => s.user);

  // 2. While Firebase is replaying the stored session, show a lightweight
  //    branded loader — NOT the full intro splash (that plays only at "/").
  //    Crucially we do NOT redirect here: redirecting on a transient null
  //    user is exactly what causes the refresh bounce / "lost auth" loop.
  if (!isAuthReady) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
        <style>{`
          @keyframes orca-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }
          @keyframes orca-ping  { 0% { transform: scale(1); opacity: .6; } 70%,100% { transform: scale(2.4); opacity: 0; } }
          .orca-slide { animation: orca-slide 1.15s cubic-bezier(.4,0,.2,1) infinite; }
          .orca-ping  { transform-box: fill-box; transform-origin: center; animation: orca-ping 2.4s ease-out infinite; }
          @media (prefers-reduced-motion: reduce) { .orca-slide, .orca-ping { animation: none; } }
        `}</style>

        {/* faint panning grid so the wait matches the rest of the app */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70 [--orca-dot:rgba(100,116,139,0.16)] dark:[--orca-dot:rgba(148,163,184,0.12)]"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--orca-dot) 1px, transparent 1.4px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="orca-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
            <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text font-['Orbitron'] text-lg font-extrabold tracking-[0.22em] text-transparent dark:from-blue-400 dark:via-cyan-300 dark:to-teal-300">
              ORCA
            </span>
          </div>

          {/* indeterminate bar */}
          <div className="h-[3px] w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="orca-slide h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400" />
          </div>

          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Restoring session
          </p>
        </div>
      </div>
    );
  }

  // 3. Auth has answered and there is no session → only NOW is it safe to send
  //    them to login. (A logged-in user never reaches this branch on refresh.)
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // 4. Resolved + authenticated → render the protected tree.
  return <>{children}</>;
};

export default ProtectedRoute;