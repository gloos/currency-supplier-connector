import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';

console.log('Using centralized Supabase client');

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyUser {
  user_id: string;
  company_id: string;
  role: string;
  companies: Company;
}

type CompanyQueryResult = CompanyUser;

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log('Login attempt started for email:', email);

    try {
      console.log('Attempting authentication with Supabase...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Authentication error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
          details: authError
        });
        throw authError;
      }

      console.log('Authentication successful:', {
        userId: authData.user?.id,
        sessionExists: !!authData.session
      });

      if (authData.user) {
        console.log('Starting company user query for user:', authData.user.id);
        
        // Log current session state
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session state:', {
          exists: !!session,
          expiresAt: session?.expires_at,
          tokenExpiry: session?.access_token ? new Date(session.expires_at * 1000).toISOString() : null
        });

        // First try a basic query to verify table access
        console.log('Attempting basic company_users query...');
        const { data: basicData, error: basicError } = await supabase
          .from('company_users')
          .select('company_id')
          .eq('user_id', authData.user.id)
          .single();
          
        if (basicError) {
          console.error('Basic query error:', {
            message: basicError.message,
            code: basicError.code,
            details: basicError.details,
            hint: basicError.hint
          });
          throw basicError;
        }
        
        if (!basicData) {
          console.error('No company user record found for user:', authData.user.id);
          throw new Error('No company user record found');
        }
        
        console.log('Found company_user record:', basicData);
        
        // Now get the company data with a simple join
        console.log('Attempting company data query with join...');
        const { data: companyData, error: companyError } = await supabase
          .from('company_users')
          .select(`
            company_id,
            role,
            companies (
              id,
              name,
              slug
            )
          `)
          .eq('user_id', authData.user.id)
          .single<CompanyQueryResult>();

        if (companyError) {
          console.error('Company query error:', {
            message: companyError.message,
            code: companyError.code,
            details: companyError.details,
            hint: companyError.hint,
            query: 'company_users with companies join'
          });
          throw companyError;
        }

        if (!companyData || !companyData.companies) {
          console.error('No company data found:', {
            companyData,
            userId: authData.user.id
          });
          throw new Error('Could not find company data');
        }

        console.log('Successfully retrieved company data:', {
          companyId: companyData.company_id,
          role: companyData.role,
          companySlug: companyData.companies.slug
        });
        
        console.log('Navigating to:', `/company/${companyData.companies.slug}/purchase-orders`);
        navigate(`/company/${companyData.companies.slug}/purchase-orders`);
        return;
      }
    } catch (error) {
      console.error('Login process error:', {
        error,
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('Login process completed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Sign in to your account
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/auth/register')}
              type="button"
            >
              Don't have an account? Sign up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 