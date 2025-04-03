// src/components/layout/navbar.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  FileText,
  Home, // Keep Home if you intend to have a separate dashboard later
  Plus,
  Settings,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  Building // Added for potential company display
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext"; // Make sure this is imported
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// NavLink component remains the same
const NavLink = ({
  to,
  children,
  icon,
  onClick,
  disabled = false // Added optional disabled prop
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean; // Added optional disabled prop
}) => {
  const location = useLocation();
  // Active state should only apply if not disabled and path matches
  const isActive = !disabled && location.pathname === to;

  const linkClasses = cn(
    "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200",
    isActive
      ? "bg-accent text-accent-foreground font-medium" // Make active link stand out more
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
    disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground" // Style disabled links
  );

  // Prevent navigation if disabled
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
          e.preventDefault();
          // Optional: Show a toast or message explaining why it's disabled
          // toast({ title: "Action Unavailable", description: "Company setup required." });
      } else if (onClick) {
          onClick();
      }
  }

  return (
    <Link
      to={disabled ? '#' : to} // Use '#' or current path if disabled
      className={linkClasses}
      onClick={handleClick}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined} // Improve accessibility
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};


const Navbar = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loadingAuth, loadingCompany } = useAuth(); // Get user and loading states
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    closeMenu(); // Close menu on sign out
    await signOut();
    navigate('/auth'); // Navigate after sign out completes
  };

  // --- Dynamic Nav Item Construction ---
  const companySlug = user?.company?.slug;
  const companyName = user?.company?.name; // Get company name for display

  // Determine paths based on company slug availability
  const baseCompanyPath = companySlug ? `/company/${companySlug}` : null;
  const purchaseOrdersPath = baseCompanyPath ? `${baseCompanyPath}/purchase-orders` : null;
  const createPoPath = purchaseOrdersPath ? `${purchaseOrdersPath}/new` : null;
  // Decide fallback/disabled state
  const isCompanyFeatureDisabled = !companySlug || loadingAuth || loadingCompany;

  // Define navigation items dynamically
  const navItems = [
    // Example: Dashboard link (adjust as needed)
    // If your main dashboard IS the purchase order list, you might remove this
    // Or link it conditionally
    // {
    //   to: baseCompanyPath || '/', // Link to company base or root if no company
    //   label: "Dashboard",
    //   icon: <Home size={18} />,
    //   disabled: isCompanyFeatureDisabled && baseCompanyPath === null // Disable if no company path
    // },
    {
      to: createPoPath || '#', // Use '#' or another fallback if disabled
      label: "New PO",
      icon: <Plus size={18} />,
      disabled: isCompanyFeatureDisabled // Disable if no slug or loading
    },
    {
      to: purchaseOrdersPath || '#', // Use '#' or another fallback if disabled
      label: "Purchase Orders",
      icon: <FileText size={18} />,
      disabled: isCompanyFeatureDisabled // Disable if no slug or loading
    },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings size={18} />,
      disabled: loadingAuth // Disable settings only if auth is still loading? Or never disable?
    },
  ];
  // --- End Dynamic Nav Item Construction ---


  const renderAuthButton = () => {
    if (loadingAuth) {
        return <Button variant="ghost" size="icon" className="rounded-full animate-pulse bg-muted" disabled><User size={18} /></Button>; // Placeholder while loading
    }
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    {companyName && (
                        <p className="text-xs leading-none text-muted-foreground flex items-center pt-1">
                            <Building size={12} className="mr-1"/> {companyName}
                        </p>
                    )}
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/auth">
          <LogIn size={18} className="mr-2" />
          Log in
        </Link>
      </Button>
    );
  };

  // --- JSX Rendering ---
  // Mobile Nav
  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-30 flex items-center justify-between py-4 px-4 sm:px-6 bg-background/80 backdrop-blur-lg border-b">
          {/* Consider a simpler brand link or icon for mobile */}
          <Link to={baseCompanyPath || '/'} className="font-display text-lg font-semibold flex items-center">
             {/* Optional: Add logo */} PO Tool
          </Link>
          <div className="flex items-center gap-2">
            {renderAuthButton()}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </header>

        {/* Mobile Menu Panel */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-20 bg-background/95 backdrop-blur-sm animate-fade-in pt-16">
            {/* Adjusted padding and animation */}
            <nav className="flex flex-col gap-2 p-4 animate-slide-down">
              {navItems.map((item) => (
                <NavLink
                  key={item.label} // Use label as key if 'to' can be '#'
                  to={item.to}
                  icon={item.icon}
                  onClick={closeMenu} // Close menu on any item click
                  disabled={item.disabled}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </>
    );
  }

  // Desktop Nav
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-lg border-b">
      {/* Brand/Home Link */}
       <Link to={baseCompanyPath || '/'} className="font-display text-lg font-semibold flex items-center gap-2">
         {/* Optional: Add logo/icon */}
         {companyName ? companyName : "PO Tool"}
       </Link>

      {/* Desktop Navigation Links & Auth */}
      <div className="flex items-center h-full">
        <nav className="flex items-center gap-1 h-full">
          {navItems.map((item) => (
             <NavLink
                key={item.label} // Use label as key
                to={item.to}
                icon={item.icon}
                // No onClick needed to close menu here
                disabled={item.disabled}
                // Add tooltip for disabled items?
             >
               {item.label}
             </NavLink>
          ))}
        </nav>
         <div className="ml-4">{renderAuthButton()}</div>
      </div>
    </header>
  );
};

export default Navbar;