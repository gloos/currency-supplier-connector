
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Home, 
  Plus, 
  Settings, 
  Menu, 
  X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const NavLink = ({ 
  to, 
  children, 
  icon, 
  onClick 
}: { 
  to: string; 
  children: React.ReactNode; 
  icon: React.ReactNode;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200",
        isActive 
          ? "bg-accent text-accent-foreground" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};

const Navbar = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const navItems = [
    { to: "/", label: "Dashboard", icon: <Home size={18} /> },
    { to: "/create-po", label: "New Purchase Order", icon: <Plus size={18} /> },
    { to: "/purchase-orders", label: "Purchase Orders", icon: <FileText size={18} /> },
    { to: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-30 flex items-center justify-between py-4 px-6 bg-background/80 backdrop-blur-lg border-b">
          <Link to="/" className="font-display text-lg font-semibold">PO System</Link>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </header>

        {isMenuOpen && (
          <div className="fixed inset-0 z-20 bg-background/95 backdrop-blur-sm animate-fade-in pt-16">
            <nav className="flex flex-col gap-2 p-6 animate-slide-down">
              {navItems.map((item) => (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  icon={item.icon}
                  onClick={closeMenu}
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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between py-4 px-6 bg-background/80 backdrop-blur-lg border-b">
      <Link to="/" className="font-display text-lg font-semibold">PO System</Link>
      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to} 
            icon={item.icon}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};

export default Navbar;
