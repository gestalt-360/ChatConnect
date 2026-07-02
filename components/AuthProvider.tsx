'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { doc, setDoc } from 'firebase/firestore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Save/update user profile in firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Unknown User',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`,
          lastSeen: Date.now(),
        }, { merge: true });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
