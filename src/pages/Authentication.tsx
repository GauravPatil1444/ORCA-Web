// src/pages/Authentication.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Authentication = () => {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/workspace');
    });
    return () => unsubscribe();
  }, [navigate]);

  const showToast = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 4000);
  };

  const handleGoogleSignIn = async () => {
    setLoader(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userId = result.user.uid;
      const userName = result.user.displayName || result.user.email?.split('@')[0] || 'User';
      const photoURL = result.user?.photoURL || undefined; 

      // Check if user profile already exists
      const userDocRef = doc(db, "users", userId, "UserDetails", "profile");
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          name: userName, email: result.user.email, photoURL: photoURL
        });
        await setDoc(doc(db, "users", userId, "UserPreferences", "settings"), {
          UserDetails: { name: userName, email: result.user.email, photoURL: photoURL },
          DocAgents: [], URLAgents: []
        });
      }

      setUser({ uid: userId, name: userName, email: result.user.email || '', profile: result.user?.photoURL || undefined });
      navigate('/workspace');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast(err.message);
      }
    } finally {
      setLoader(false);
    }
  };

  const createAccount = async () => {
    setLoader(true);
    setError('');
    if (password !== confirmPassword) return showToast("Confirm password doesn't match!");
    if (password.length < 4) return showToast("Password length must be at least 4");
    if (username.length > 20) return showToast("Only 20 characters allowed for name");

    try {
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const userId = response.user.uid;

      await setDoc(doc(db, "users", userId, "UserDetails", "profile"), {
        name: username, email: response.user.email,
      });
      await setDoc(doc(db, "users", userId, "UserPreferences", "settings"), {
        UserDetails: { name: username, email: response.user.email },
        DocAgents: [], URLAgents: []
      });

      setUser({ uid: userId, name: username, email: response.user.email || '', profile: response.user?.photoURL || undefined});
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

      const userDetailsSnap = await getDocs(collection(db, "users", userId, "UserDetails"));
      let name = "";
      userDetailsSnap.forEach((doc) => { name = doc.data().name || ""; });

      setUser({ uid: userId, name, email: response.user.email || '', profile: undefined });
      navigate('/workspace');
    } catch (err: any) {
      showToast("Invalid email or password!");
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isLoginMode ? 'Login to access your Orca workspace' : 'Join Orca to start your agentic journey'}
          </p>
        </div>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="w-full flex flex-col gap-4">
          {!isLoginMode && (
            <input
              type="text"
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
            />
          )}

          <input
            type="email"
            placeholder="Enter email"
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={15}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isLoginMode && (
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder-slate-400 transition-all pr-12"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                maxLength={15}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button
            disabled={loader}
            onClick={isLoginMode ? authenticate : createAccount}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {loader ? <Loader2 className="animate-spin" size={20} /> : <span>{isLoginMode ? 'Login' : 'Create Account'}</span>}
          </button>
        </div>

        <div className="relative flex items-center w-full">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 px-4 text-slate-400 text-sm font-medium">OR</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loader}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-70"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="text-center text-slate-600">
          <span>{isLoginMode ? "Don't have an account? " : "Already have an account? "}</span>
          <button
            onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
            className="text-blue-600 font-semibold hover:underline focus:outline-none"
          >
            {isLoginMode ? 'Create now' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Authentication;