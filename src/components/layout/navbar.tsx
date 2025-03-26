
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Home, 
  Plus, 
  Settings, 
  Menu, 
  X,
  LogIn,
  LogOut,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: <Home size={18} /> },
    { to: "/create-po", label: "New Purchase Order", icon: <Plus size={18} /> },
    { to: "/purchase-orders", label: "Purchase Orders", icon: <FileText size={18} /> },
    { to: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  const renderAuthButton = () => {
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
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

  if (isMobile) {
    return (
      <>
        <header className="sticky top-0 z-30 flex items-center justify-between py-4 px-6 bg-background/80 backdrop-blur-lg border-b">
          <Link to="/" className="font-display text-lg font-semibold">PO System</Link>
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
      <div className="flex items-center">
        <nav className="flex items-center gap-1 mr-4">
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
        {renderAuthButton()}
      </div>
    </header>
  );
};

export default Navbar;
