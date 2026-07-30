import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export const useUserPreferences = () => {
  const uid = useStore((s) => s.user?.uid);
  const applyPreferences = useStore((s) => s.applyPreferences);

  useEffect(() => {
    if (!uid) return;
    let active = true;

    getDoc(doc(db, 'users', uid, 'Settings', 'preferences'))
      .then((snap) => {
        if (!active || !snap.exists()) return;
        applyPreferences(snap.data() as { theme?: any; selectedModel?: string });
      })
      .catch((err) => console.error('[prefs] load failed:', err));

    return () => { active = false; };
  }, [uid, applyPreferences]);
};