// src/pages/SplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
// import orcaLogo from "../assets/orca.lottie";
import orcaText from "../assets/text.lottie";
import { useAuthListener } from '../hooks/useAuthListener';

const SplashScreen = () => {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [showTextAnimation, setShowTextAnimation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { isAuthReady } = useAuthListener();

  const hasNavigated = useRef(false);

  useEffect(() => {
    // 1. Trigger the secondary "text" animation after 2.5 seconds
    const textTimer = setTimeout(() => {
      setShowTextAnimation(true);
    }, 2500);

    // 2. Fallback timeout to guarantee navigation happens (5.5s total)
    const navTimer = setTimeout(() => {
      setIsFinished(true);
    }, 5500);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(navTimer);
    };
  }, []);


  useEffect(() => {
    // Only ever route once. Any later dep change (user ref, re-render) is ignored.
    if (hasNavigated.current) return;

    if (isFinished && isAuthReady) {
      hasNavigated.current = true;
      navigate(user ? '/workspace' : '/auth', { replace: true });
    }
  }, [isFinished, isAuthReady, user, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Main Orca Logo Animation */}
      {/* <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center z-10">
        <DotLottieReact
          src={orcaLogo} // Place your .lottie or .json file in the /public/animations folder
          autoplay
          loop={false}
          speed={1.2}
          className="w-full h-full"
        />
      </div> */}

      {/* Secondary Text Animation (Fades in sequentially) */}
      <div 
        className={`mt-8 w-max h-max transition-all duration-1000 ease-out z-10 ${
          showTextAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {showTextAnimation && (
          <DotLottieReact
            src={orcaText}
            autoplay
            loop={false}
            speed={1.0}
            className="w-3xs h-auto"
            onAnimationEnd={() => setIsFinished(true)}
          />
        )}
      </div>

      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none animate-pulse" />
    </div>
  );
};

export default SplashScreen;