// src/hooks/useAuthListener.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useStore } from '../store/useStore';

export const useAuthListener = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const setUser = useStore((s) => s.setUser);

  useEffect(() => {
    // onAuthStateChanged fires ONCE on init with the restored user (or null).
    // That single fire is the gate — nothing routes until it resolves.
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          // Fetch display name from Firestore (same logic you already have)
          const userDetailsSnap = await getDocs(
            collection(db, 'users', fbUser.uid, 'UserDetails')
          );
          let name = '';
          let profile: string | undefined;
          userDetailsSnap.forEach((d) => {
            const data = d.data();
            name = data.name || '';
            profile = data.photoURL || data.profile || undefined;
          });

          setUser({
            uid: fbUser.uid,
            name: name || fbUser.displayName || 'User',
            email: fbUser.email || '',
            profile: profile || fbUser.photoURL || undefined,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[auth] profile fetch failed:', err);
        // Even if the Firestore read fails, still populate from Firebase Auth
        if (fbUser) {
          setUser({
            uid: fbUser.uid,
            name: fbUser.displayName || 'User',
            email: fbUser.email || '',
            profile: fbUser.photoURL || undefined,
          });
        } else {
          setUser(null);
        }
      } finally {

        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  return { isAuthReady };
};