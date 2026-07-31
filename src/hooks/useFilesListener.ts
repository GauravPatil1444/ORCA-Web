// src/hooks/useFilesListener.ts
import { useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useStore, type FileItem } from '../store/useStore';

export const useFilesListener = () => {
  const uid = useStore((s) => s.user?.uid);
  const setFiles = useStore((s) => s.setFiles);

  useEffect(() => {
    if (!uid) return;

    const unsubscribe = onSnapshot(
      collection(db, 'users', uid, 'Files'),
      (snapshot) => {
        const mapped = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Untitled',
            category: data.category || 'pdf_standard',
            uploaded_at: data.uploaded_at || new Date().toISOString(),
            base_url: data.base_url,
            excluded_css_classes: data.excluded_css_classes,
          } as FileItem;
        });
        setFiles(mapped);
      },
      (err) => console.error('[files] listener failed:', err)
    );

    return () => unsubscribe();
  }, [uid, setFiles]);
};