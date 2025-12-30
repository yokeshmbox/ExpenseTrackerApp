
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  BarChart,
  LayoutDashboard,
  PanelLeft,
  Settings,
  Target,
  FileText,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Suspense, useState, ReactNode, useEffect }from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/mandates', label: 'Mandates', icon: FileText },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/reports', label: 'Reports', icon: BarChart },
];


function PageLoadingFallback() {
  return (
    <div className="flex size-full items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your page...</p>
        </div>
    </div>
  )
}


function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();

    const handleClick = () => {
        if (onLinkClick) {
            onLinkClick();
        }
    }

    return (
      <nav className="flex flex-col h-full">
        <div className="flex h-14 lg:h-[60px] items-center px-6 border-b bg-gradient-to-br from-primary/5 to-transparent">
            <Logo />
        </div>
        <div className="flex-1 py-4">
            <ul className="grid items-start px-3 gap-1">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <li key={item.href}>
                            <Link 
                                href={item.href} 
                                onClick={handleClick} 
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                                    isActive 
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-all duration-200",
                                    isActive 
                                        ? "bg-primary-foreground/20" 
                                        : "bg-transparent group-hover:bg-muted-foreground/10"
                                )}>
                                    <item.icon className="h-4 w-4" strokeWidth={2.5} />
                                </div>
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
        <div className="border-t bg-gradient-to-br from-transparent to-primary/5 p-3">
             <Link 
                href="/settings" 
                onClick={handleClick} 
                className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    pathname.startsWith('/settings') 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
            >
                <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-200",
                    pathname.startsWith('/settings') 
                        ? "bg-primary-foreground/20" 
                        : "bg-transparent group-hover:bg-muted-foreground/10"
                )}>
                    <Settings className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <span className="font-medium text-sm">Settings</span>
            </Link>
        </div>
      </nav>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-muted/40">
                <div className="flex flex-col items-center gap-4">
                    <Logo />
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading account...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
            <div className="hidden border-r bg-muted/40 md:block">
                <SidebarNav />
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <PanelLeft className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col p-0">
                             <SheetTitle className='sr-only'>Main Menu</SheetTitle>
                             <SheetDescription className="sr-only">A list of navigation links for the app.</SheetDescription>
                             <SidebarNav onLinkClick={() => setOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <div className="flex-1">
                        {/* Header content can go here if needed */}
                    </div>
                    <UserNav />
                </header>
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                    <Suspense fallback={<PageLoadingFallback />}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
