'use client';

import { useMemo } from 'react';
import { useFirebase } from '@/firebase/provider';
import { SHARED_USER_ID } from '@/lib/shared-user';
import { Firestore } from 'firebase/firestore';

/**
 * A hook to provide a stable reference to the firestore instance
 * and the shared user ID for anonymous users.
 *
 * This is crucial for performance, as it prevents components from
 * re-running Firestore queries on every render.
 */
export function useSharedUser(): { firestore: Firestore | null; sharedUserId: string | null } {
  const { user, firestore } = useFirebase();

  // We memoize the result to ensure the object reference is stable across re-renders
  // as long as the user's authentication state or the firestore instance doesn't change.
  const sharedUserData = useMemo(() => {
    if (user?.isAnonymous) {
      return { firestore, sharedUserId: SHARED_USER_ID };
    }
    // For non-anonymous users, you might return their actual UID or null if not applicable
    return { firestore, sharedUserId: user?.uid ?? null };
  }, [user, firestore]);

  return sharedUserData;
}
