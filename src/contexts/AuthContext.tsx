// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// --- Interfaces ---
interface Company {
  id: string;
  name: string;
  slug: string;
  fa_default_currency?: string | null;
}

interface UserWithCompany extends User {
  company?: Company;
}

// --- Context Type Definition ---
// Define the shape of the context value
type AuthContextType = {
  user: UserWithCompany | null;
  session: Session | null;
  loadingAuth: boolean;
  loadingCompany: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

// --- Create the Context ---
// Initialize with undefined or a default structure matching AuthContextType
// Using undefined is common to force check in the hook
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Custom Hook ---
// Define and export the hook separately *before* the Provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error check is crucial
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- AuthProvider Component ---
// Export the Provider component as the default or named export
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithCompany | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const { toast } = useToast();
  const isInitialLoad = useRef(true);

  // --- Fetch User's Company Association ---
  const fetchUserCompany = useCallback(
    async (userId: string): Promise<Company | null> => {
      if (!userId) return null;
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select(`company:companies(id, name, slug, fa_default_currency)`)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('AuthContext: Error fetching user company:', error);
          return null;
        }
        if (!data?.company) {
          return null;
        }
        return data.company as Company;
      } catch (error) {
        console.error('AuthContext: Exception fetching user company:', error);
        return null;
      }
    },
    []
  );

  // --- Update User and Company State ---
  const updateUserState = useCallback(
    async (currentSession: Session | null, source: string) => {
      const shouldFetchCompany = !!currentSession?.user;
      setLoadingCompany(shouldFetchCompany);

      let fetchedCompany: Company | null = null;
      let userWithCompany: UserWithCompany | null = null;

      try {
        if (shouldFetchCompany) {
          fetchedCompany = await fetchUserCompany(currentSession!.user!.id);
          userWithCompany = {
            ...currentSession!.user!,
            company: fetchedCompany || undefined,
          };
        } else {
        }
        setUser(userWithCompany);
        setSession(currentSession);

      } catch (error) {
        console.error(`AuthContext: (${source}) Error processing user state update:`, error);
        setUser(currentSession?.user ? { ...currentSession.user, company: undefined } : null);
        setSession(currentSession);
      } finally {
        if (shouldFetchCompany) {
          setLoadingCompany(false);
        }
      }
    },
    [fetchUserCompany]
  );

  // --- Effect for Initial Load & Auth State Changes ---
  useEffect(() => {
    let mounted = true;
    setLoadingAuth(true);
    setLoadingCompany(true);
    isInitialLoad.current = true;

    const setupAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('AuthContext: Error during initial getSession:', error);
        } else {
        }
        await updateUserState(currentSession, 'initialLoad');

      } catch (error) {
        console.error('AuthContext: Unexpected error during setupAuth:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setLoadingCompany(false);
        }
      } finally {
        if (mounted) {
          setLoadingAuth(false);
          isInitialLoad.current = false;
        }
      }
    };

    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (isInitialLoad.current && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
             if (!loadingAuth) isInitialLoad.current = false;
             return;
        }
        if (isInitialLoad.current) isInitialLoad.current = false;

        const isSignificantChange = event === 'SIGNED_IN' || event === 'SIGNED_OUT';
        if (isSignificantChange) setLoadingAuth(true);

        await updateUserState(currentSession, `authStateChange (${event})`);

        if (isSignificantChange) setLoadingAuth(false);

        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: `Welcome ${currentSession?.user?.email || 'back'}!`,
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateUserState, toast]);

  // --- Authentication Actions ---
  const signIn = useCallback(async (email: string, password: string) => {
     try {
       const { error } = await supabase.auth.signInWithPassword({ email, password });
       if (error) throw error;
     } catch (error: any) {
       console.error('AuthContext: Sign in error:', error);
       toast({ title: 'Sign in failed', description: error.message || 'An error occurred.', variant: 'destructive' });
       throw error;
     }
   }, [toast]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, companyName: string) => {
    try {
      const signupOptions = { data: { full_name: fullName, company_name: companyName } };
      const { error } = await supabase.auth.signUp({ email, password, options: signupOptions });
      if (error) throw error;
      toast({ title: 'Account created', description: 'Please check your email to verify.' });
    } catch (error: any) {
      console.error('AuthContext: Sign up error:', error);
      toast({ title: 'Sign up failed', description: error.message || 'An error occurred.', variant: 'destructive' });
      throw error;
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('AuthContext: Sign out error:', error);
      toast({ title: 'Sign out failed', description: error.message || 'An error occurred.', variant: 'destructive' });
      throw error;
    }
  }, [toast]);


  // --- Context Value ---
  const value = React.useMemo(() => ({
    user,
    session,
    loadingAuth,
    loadingCompany,
    signIn,
    signUp,
    signOut,
  }), [user, session, loadingAuth, loadingCompany, signIn, signUp, signOut]);


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Note: useAuth hook is already defined and exported above the provider.