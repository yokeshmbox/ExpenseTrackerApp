
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, BrainCircuit, CheckCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useSharedUser } from '@/firebase/auth/use-shared-user';
import { updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { getPersonalizedFinancialAdvice, PersonalizedFinancialAdviceOutput } from '@/ai/flows/personalized-financial-advice';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Transaction } from '@/types';

function ProfileSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || 'Yokesh R');
  const [isSaving, setIsSaving] = useState(false);

  // Since all users are guests, we don't allow profile updates for now.
  // This can be expanded later if you add other sign-in methods.
  const isGuest = user?.isAnonymous;

  const handleSave = async () => {
    if (!user || isGuest) return;
    setIsSaving(true);
    try {
      await updateProfile(user, { displayName });
      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update your profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Manage your account information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isGuest}
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving || isGuest || !displayName} className="w-full sm:w-auto">
          Save Changes
        </Button>
         {isGuest && (
          <p className="text-sm text-muted-foreground">
            Profile editing is disabled for guest accounts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FinancialAdvisor() {
  const { firestore, sharedUserId } = useSharedUser();
  const [advice, setAdvice] = useState<PersonalizedFinancialAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const transactionsQuery = useMemoFirebase(
    () => (sharedUserId ? query(collection(firestore, 'users', sharedUserId, 'transactions')) : null),
    [firestore, sharedUserId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const { monthlyIncome, spendingByCategory } = useMemo(() => {
    if (!transactions) return { monthlyIncome: 0, spendingByCategory: {} };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    const spending: { [key: string]: number } = {};

    transactions.forEach((t) => {
      const transactionDate = new Date(t.date);
      if (transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          spending[t.category] = (spending[t.category] || 0) + t.amount;
        }
      }
    });
    return { monthlyIncome: income, spendingByCategory: spending };
  }, [transactions]);

  const handleGetAdvice = async () => {
    setIsLoading(true);
    setAdvice(null);
    try {
      const result = await getPersonalizedFinancialAdvice({
        income: monthlyIncome,
        spendingByCategory: spendingByCategory,
      });
      setAdvice(result);
    } catch (error) {
      console.error('Error getting financial advice:', error);
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Could not generate financial advice at this time.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          AI Financial Advisor
        </CardTitle>
        <CardDescription>
          Get personalized advice based on your spending habits for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGetAdvice} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Generating Advice...' : 'Get Personalized Advice'}
        </Button>
        {isLoading && (
          <div className="space-y-2 pt-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
        {advice && (
          <div className="pt-4 space-y-4">
            <p className="font-semibold text-foreground italic border-l-4 border-primary pl-4">
                {advice.summary}
            </p>
            <ul className="space-y-2">
                {advice.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                    </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and application settings.
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSettings />
        <FinancialAdvisor />
      </div>
    </div>
  );
}
