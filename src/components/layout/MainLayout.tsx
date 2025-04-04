import React from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

// Helper function for NavLink styling
const getNavLinkClass = ({ isActive }: { isActive: boolean }): string => {
    return `text-sm font-medium transition-colors hover:text-primary ${isActive ? '' : 'text-muted-foreground'
        }`;
};

// Define props interface to accept children
interface MainLayoutProps {
    children?: React.ReactNode; // Optional children prop
}

// Apply the props interface
const MainLayout: React.FC<MainLayoutProps> = () => {
    console.log("MainLayout - Rendering component...");
    const { companySlug } = useParams<{ companySlug: string }>();
    const { signOut, user } = useAuth();

    // Build base paths dynamically using the companySlug
    const poListPath = `/company/${companySlug}/purchase-orders`;
    const newPOPath = `/company/${companySlug}/purchase-orders/new`;
    const settingsPath = '/settings'; // Settings path is fixed

    console.log("MainLayout - About to return JSX...");
    return (
        <div className="min-h-screen w-full">
            <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
                <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
                    <NavLink
                        to={poListPath}
                        className="flex items-center gap-2 text-lg font-semibold md:text-base"
                    >
                        <span className="font-bold">PO Tool</span> {/* Simple Branding */}
                    </NavLink>
                    <NavLink to={poListPath} className={getNavLinkClass} end> {/* 'end' ensures exact match for list */}
                        Purchase Orders
                    </NavLink>
                    <NavLink to={newPOPath} className={getNavLinkClass}>
                        New PO
                    </NavLink>
                    {/* Add other main navigation links here */}
                </nav>
                {/* Mobile Menu Placeholder - Add later if needed */}
                {/* <Sheet> ... </Sheet> */}
                <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
                    {/* Maybe add search bar here later */}
                    <div className="ml-auto flex-1 sm:flex-initial"></div>
                    <NavLink to={settingsPath} className={getNavLinkClass}>
                         Settings
                    </NavLink>
                    <Button variant="ghost" size="icon" onClick={signOut} aria-label="Logout">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>
            {/* Basic main block, no flex sizing */}
            <main className="p-4 md:p-8 bg-muted/40">
                {/* Restore Outlet */}
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout; 