// src/pages/Authentication.tsx
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { useTheme } from '../hooks/useTheme';
import {
  Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, Check, X,
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import orcaText from '../assets/text.lottie';
import { useAuthListener } from '@/hooks/useAuthListener';

/* ------------------------------------------------------------------ */
/*  Ambient system — graph + grid + glows live in the background now.  */
/*  The dot-grid colour is driven by a CSS var so it adapts per theme. */
/* ------------------------------------------------------------------ */
const ambientStyles = `
  @keyframes orca-dash   { to { stroke-dashoffset: -240; } }
  @keyframes orca-ping   { 0% { transform: scale(1); opacity: .5; } 70%, 100% { transform: scale(2.7); opacity: 0; } }
  @keyframes orca-grid   { from { background-position: 0 0; } to { background-position: 48px 48px; } }
  @keyframes orca-rise   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes orca-breathe{ 0%, 100% { opacity: .45; transform: translate(-50%, -50%) scale(1); } 50% { opacity: .8; transform: translate(-50%, -50%) scale(1.08); } }
  @keyframes orca-drift  { 0% { transform: translate(0, 0); } 50% { transform: translate(34px, -26px); } 100% { transform: translate(0, 0); } }

  .orca-line   { stroke-dasharray: 6 12; animation: orca-dash 11s linear infinite; }
  .orca-ring   { transform-box: fill-box; transform-origin: center; animation: orca-ping 3.8s cubic-bezier(0,0,.2,1) infinite; }
  .orca-grid   {
    background-image: radial-gradient(circle, var(--orca-dot, rgba(148,163,184,.16)) 1px, transparent 1.5px);
    background-size: 24px 24px;
    animation: orca-grid 28s linear infinite;
  }
  .orca-rise   { animation: orca-rise .7s cubic-bezier(.16,1,.3,1) both; }
  .orca-breathe{ animation: orca-breathe 9s ease-in-out infinite; }
  .orca-drift  { animation: orca-drift 26s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .orca-line, .orca-ring, .orca-grid, .orca-rise, .orca-breathe, .orca-drift { animation: none !important; }
  }
`;

/* A node field spread across a 1440×900 stage so the background mesh
   feels composed on desktop. Tints reuse the app's source-type palette. */
const NODES = [
  { x: 120,  y: 140, ring: 'fill-blue-400/40',     dot: 'fill-blue-400' },
  { x: 320,  y: 520, ring: 'fill-emerald-400/40',  dot: 'fill-emerald-400' },
  { x: 520,  y: 200, ring: 'fill-amber-400/40',    dot: 'fill-amber-400' },
  { x: 700,  y: 680, ring: 'fill-fuchsia-400/40',  dot: 'fill-fuchsia-400' },
  { x: 900,  y: 300, ring: 'fill-blue-400/40',     dot: 'fill-blue-400' },
  { x: 1120, y: 560, ring: 'fill-emerald-400/40',  dot: 'fill-emerald-400' },
  { x: 1300, y: 180, ring: 'fill-amber-400/40',    dot: 'fill-amber-400' },
  { x: 240,  y: 760, ring: 'fill-fuchsia-400/40',  dot: 'fill-fuchsia-400' },
  { x: 760,  y: 120, ring: 'fill-blue-400/40',     dot: 'fill-blue-400' },
  { x: 1040, y: 760, ring: 'fill-amber-400/40',    dot: 'fill-amber-400' },
  { x: 1320, y: 720, ring: 'fill-blue-400/40',     dot: 'fill-blue-400' },
  { x: 560,  y: 460, ring: 'fill-emerald-400/40',  dot: 'fill-emerald-400' },
  { x: 980,  y: 520, ring: 'fill-fuchsia-400/40',  dot: 'fill-fuchsia-400' },
];
const EDGES = [
  [0,1],[0,2],[2,8],[8,4],[4,6],[4,12],[12,5],[5,9],[9,10],
  [5,6],[1,11],[11,3],[3,7],[11,4],[12,9],[3,1],[8,2],
];

/* ------------------------------------------------------------------ */
/*  Full-bleed background scene                                        */
/* ------------------------------------------------------------------ */
const AmbientBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
    {/* slow drifting colour atmosphere */}
    <div className="orca-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/15" />
    <div
      className="orca-drift absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-600/10"
      style={{ animationDelay: '-13s' }}
    />

    {/* panning dot grid (colour via CSS var → theme aware) */}
    <div className="orca-grid absolute inset-0 [--orca-dot:rgba(100,116,139,0.16)] dark:[--orca-dot:rgba(148,163,184,0.14)]" />

    {/* the knowledge graph */}
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          className="orca-line text-slate-400/30 dark:text-slate-500/30"
          x1={NODES[a].x} y1={NODES[a].y}
          x2={NODES[b].x} y2={NODES[b].y}
          stroke="currentColor"
          strokeWidth={1}
          style={{ animationDelay: `${i * 0.5}s` }}
        />
      ))}
      {NODES.map((n, i) => (
        <g key={i}>
          <circle className={`orca-ring ${n.ring}`} cx={n.x} cy={n.y} r={7} style={{ animationDelay: `${i * 0.4}s` }} />
          <circle className={n.dot} cx={n.x} cy={n.y} r={5} />
          <circle className="fill-white dark:fill-slate-950" cx={n.x} cy={n.y} r={2} />
        </g>
      ))}
    </svg>

    {/* breathing halo that cradles the centred card */}
    <div className="orca-breathe absolute left-1/2 top-1/2 h-[34rem] w-[34rem] rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-500/10" />

    {/* vignette: keeps the edges calm and the centre legible */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_32%,rgba(241,245,249,0.78)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_26%,rgba(2,6,23,0.88)_100%)]" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const Authentication = () => {
  useTheme(); // honour the saved preference for when they enter the workspace

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loader, setLoader] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const googleProvider = new GoogleAuthProvider();
  const { isAuthReady } = useAuthListener();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isAuthReady) return null;          // wait for resolution
      if (user) return <Navigate to="/workspace" replace />;
    });
    return () => unsubscribe();
  }, [navigate]);

  const showToast = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 4000);
  };

  const setMode = (mode: boolean) => {
    setIsLoginMode(mode);
    setError('');
  };

  const handleGoogleSignIn = async () => {
    setLoader(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userId = result.user.uid;
      const userName = result.user.displayName || result.user.email?.split('@')[0] || 'User';
      const photoURL = result.user?.photoURL || undefined;
      const userDocRef = doc(db, 'users', userId, 'UserDetails', 'profile');
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        await setDoc(userDocRef, { name: userName, email: result.user.email, photoURL });
        await setDoc(doc(db, 'users', userId, 'UserPreferences', 'settings'), {
          UserDetails: { name: userName, email: result.user.email, photoURL },
          DocAgents: [], URLAgents: [],
        });
      }
      setUser({ uid: userId, name: userName, email: result.user.email || '', profile: result.user?.photoURL || undefined });
      navigate('/workspace');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') showToast(err.message);
    } finally {
      setLoader(false);
    }
  };

  const createAccount = async () => {
    setLoader(true);
    setError('');
    if (password !== confirmPassword) return showToast("Confirm password doesn't match!");
    if (password.length < 4) return showToast('Password length must be at least 4');
    if (username.length > 20) return showToast('Only 20 characters allowed for name');
    try {
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const userId = response.user.uid;
      await setDoc(doc(db, 'users', userId, 'UserDetails', 'profile'), { name: username, email: response.user.email });
      await setDoc(doc(db, 'users', userId, 'UserPreferences', 'settings'), {
        UserDetails: { name: username, email: response.user.email },
        DocAgents: [], URLAgents: [],
      });
      setUser({ uid: userId, name: username, email: response.user.email || '', profile: response.user?.photoURL || undefined });
      navigate('/workspace');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoader(false);
    }
  };

  const authenticate = async () => {
    setLoader(true);
    setError('');
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const userId = response.user.uid;
      const userDetailsSnap = await getDocs(collection(db, 'users', userId, 'UserDetails'));
      let name = '';
      userDetailsSnap.forEach((d) => { name = d.data().name || ''; });
      setUser({ uid: userId, name, email: response.user.email || '', profile: undefined });
      navigate('/workspace');
    } catch (err: any) {
      showToast('Invalid email or password!');
    } finally {
      setLoader(false);
    }
  };

  /* live, input-driven feedback (pure derivations) */
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwScore = (() => {
    let s = 0;
    if (password.length >= 4) s++;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  })();
  const pwMeta = [
    { label: 'Too weak', bar: 'bg-red-500' },
    { label: 'Weak',     bar: 'bg-red-500' },
    { label: 'Fair',     bar: 'bg-amber-500' },
    { label: 'Good',     bar: 'bg-blue-500' },
    { label: 'Strong',   bar: 'bg-emerald-500' },
  ][pwScore];

  const fieldBase =
    'w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-11 pr-11 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500';

  return (
    <div className="relative min-h-dvh overflow-y-auto font-sans text-slate-800 dark:text-slate-100">
      <style>{ambientStyles}</style>
      <AmbientBackground />

      {/* centred stage */}
      <div className="relative z-10 flex min-h-dvh flex-col items-center px-4 py-5">
        {/* brand lockup */}
        <div className="orca-rise w-2xs h-auto flex flex-col items-center gap-3">
          <div className="h-full w-full dark:brightness-0 dark:invert">
            <DotLottieReact src={orcaText} autoplay loop={false} speed={1.0} className="h-full w-full" />
          </div>
          {/* <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Agentic RAG · online
          </span> */}
        </div>

        {/* floating form card */}
        <div
          className="orca-rise w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-7 shadow-[0_24px_70px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-4 dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-[0_24px_70px_-20px_rgba(0,0,0,0.7)]"
          style={{ animationDelay: '90ms' }}
        >
          {/* segmented mode switch */}
          <div className="relative mb-7 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <span
              className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-slate-600"
              style={{ transform: isLoginMode ? 'translateX(0)' : 'translateX(calc(100% + 0.5rem))' }}
            />
            <button
              type="button"
              onClick={() => setMode(true)}
              className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors ${isLoginMode ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode(false)}
              className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors ${!isLoginMode ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              Create account
            </button>
          </div>

          {/* heading */}
          <div className="mb-6">
            <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
              {isLoginMode ? 'Welcome back' : 'Get Started'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {isLoginMode
                ? 'Sign in to pick up your conversations and knowledge base.'
                : 'Create an account to build your first agentic knowledge base.'}
            </p>
          </div>

          {/* error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-300">
              <X size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* credentials */}
          <form
            onSubmit={(e) => { e.preventDefault(); isLoginMode ? authenticate() : createAccount(); }}
            className="space-y-4"
          >
            {!isLoginMode && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
                <div className="group relative">
                  <User size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="How should we call you?"
                    className={fieldBase}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <div className="group relative">
                <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500 dark:text-slate-500" />
                <input
                  type="email"
                  placeholder="you@email.com"
                  className={fieldBase}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {email.length > 0 && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {emailValid ? <Check size={17} className="text-emerald-500" /> : <X size={17} className="text-red-400" />}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="group relative">
                <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  className={fieldBase}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={15}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-blue-500 dark:text-slate-500"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {!isLoginMode && password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < pwScore ? pwMeta.bar : 'bg-slate-200 dark:bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`mt-1.5 text-xs font-medium ${pwMeta.bar.replace('bg-', 'text-')}`}>{pwMeta.label}</p>
                </div>
              )}
            </div>

            {!isLoginMode && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
                <div className="group relative">
                  <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500 dark:text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    className={fieldBase}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    maxLength={15}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-blue-500 dark:text-slate-500"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                  {confirmPassword.length > 0 && (
                    <span className="absolute right-11 top-1/2 -translate-y-1/2 pr-1">
                      {confirmPassword === password ? <Check size={15} className="text-emerald-500" /> : <X size={15} className="text-red-400" />}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loader}
              className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loader ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>{isLoginMode ? 'Sign in' : 'Create account'}</span>
                  <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loader}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <p className="mt-7 text-center text-xs text-slate-400 dark:text-slate-500">
            By continuing you agree to ORCA's terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Authentication;