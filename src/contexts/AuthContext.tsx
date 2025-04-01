import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface UserWithCompany extends User {
  company?: Company;
}

type AuthContextType = {
  user: UserWithCompany | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Add Database function types
type Database = {
  public: {
    Functions: {
      get_user_company: {
        Args: { p_user_id: string };
        Returns: Company;
      };
    };
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserWithCompany | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserCompany = async (userId: string) => {
    try {
      console.log('Fetching company data for user:', userId);
      
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          company:companies (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user company:', error);
        return null;
      }

      if (!data?.company) {
        console.log('No company found for user');
        return null;
      }

      const company = data.company as Company;
      console.log('Company data received:', company);
      return company;
    } catch (error) {
      console.error('Exception fetching user company:', error);
      return null;
    }
  };

  const updateUserState = async (currentSession: Session | null) => {
    console.log('Updating user state with session:', currentSession?.user?.id);
    try {
      if (currentSession?.user) {
        const company = await fetchUserCompany(currentSession.user.id);
        const userWithCompany = {
          ...currentSession.user,
          company: company || undefined
        };
        setUser(userWithCompany);
        setSession(currentSession);
        console.log('User state updated with company:', company);
      } else {
        setUser(null);
        setSession(null);
        console.log('User state cleared - no session');
      }
    } catch (error) {
      console.error('Error updating user state:', error);
      if (currentSession?.user) {
        setUser({ ...currentSession.user, company: undefined });
        setSession(currentSession);
      } else {
        setUser(null);
        setSession(null);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const setupAuth = async () => {
      try {
        console.log('Setting up auth...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        if (mounted) {
          await updateUserState(currentSession);
        }
      } catch (error) {
        console.error('Setup auth error:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('Auth setup complete, loading set to false');
        }
      }
    };

    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        if (mounted) {
          await updateUserState(currentSession);
        }
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: `Welcome ${currentSession?.user?.email || 'back'}!`,
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully",
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Attempting sign up for:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully. Please verify your email.",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting sign out');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out failed",
        description: error.message || "An error occurred during sign out",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
