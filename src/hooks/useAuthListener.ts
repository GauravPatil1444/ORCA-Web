// src/hooks/useAuthListener.ts
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { useStore, type FileItem } from '../store/useStore';

export const useAuthListener = () => {
  const setUser = useStore((state) => state.setUser);
  const setFiles = useStore((state) => state.setFiles);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userId = firebaseUser.uid;
          
          // 1. Fetch User Details
          const userDetailsSnap = await getDocs(collection(db, "users", userId, "UserDetails"));
          let name = "";
          userDetailsSnap.forEach((doc) => { 
            const data = doc.data();
            name = data.name || ""; 
          });

          setUser({ 
            uid: userId, 
            name, 
            email: firebaseUser.email || '' 
          });

          // 2. Fetch User Files (Knowledge Base Registry)
          const filesSnap = await getDocs(collection(db, "users", userId, "Files"));
          const userFiles: FileItem[] = filesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as FileItem[];
          
          // Hydrate the Zustand store so the KB Modal populates instantly
          setFiles(userFiles);

        } catch (error) {
          console.error("Error fetching user profile or files:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setFiles([]); // Clear files on logout
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setFiles]);

  return { isAuthReady };
};