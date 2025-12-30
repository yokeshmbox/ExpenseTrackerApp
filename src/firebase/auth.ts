
'use client';

import {
  Auth,
  signInAnonymously,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { getSdks, setDocumentNonBlocking } from '.';
import { SHARED_USER_ID } from '@/lib/shared-user';

/**
 * Initiates an anonymous sign-in and creates a user record in Firestore.
 */
export async function handleAnonymousSignIn(auth: Auth) {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    if (user) {
      const { firestore } = getSdks(auth.app);
      
      // Ensure the SHARED user document exists.
      const userRef = doc(firestore, 'users', SHARED_USER_ID);
      setDocumentNonBlocking(userRef, {
        id: SHARED_USER_ID,
        firstName: 'Yokesh',
        lastName: 'R',
        email: 'yokesh.r@example.com'
      }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error("Error during anonymous sign-in: ", error);
    throw error;
  }
}

export async function handleSignOut(auth: Auth | null) {
    if (!auth) return;
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
  }
}
