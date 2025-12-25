
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useFirebase, handleAnonymousSignIn } from '@/firebase';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { auth, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSignIn = async () => {
    if (!auth) return;
    setIsProcessing(true);
    try {
      await handleAnonymousSignIn(auth);
      // The onAuthStateChanged listener in the provider will handle the redirect
    } catch (error: any) {
      console.error("Anonymous sign in error", error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to sign in.' });
      setIsProcessing(false);
    }
  };
  
  if (isUserLoading || user) { // Also wait if user object exists, since redirect is imminent
      return (
          <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
              <div className="flex flex-col items-center gap-4">
                  <Logo />
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
          </div>
      )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Logo />
            </div>
          <CardTitle>Welcome to Personal Expense Tracker</CardTitle>
          <CardDescription>Sign in to manage your finances.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button onClick={onSignIn} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <User className="mr-2 h-4 w-4" />
                )}
                Enter as Guest
              </Button>
        </CardContent>
      </Card>
    </div>
  );
}
