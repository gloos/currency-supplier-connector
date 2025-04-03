import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import BlurCard from '@/components/ui/blur-card';

const AuthPage = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [companyName, setCompanyName] = useState('');

  // If user is already logged in, redirect to home
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoggingIn(true);
      await signIn(loginEmail, loginPassword);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Trim inputs
    const trimmedEmail = signupEmail.trim();
    const trimmedName = signupName.trim();
    const trimmedCompanyName = companyName.trim();

    if (!trimmedEmail || !signupPassword || !trimmedName || !trimmedCompanyName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Full Name, Email, Password, Company Name).",
        variant: "destructive",
      });
      return;
    }
     if (signupPassword.length < 6) {
         toast({
             title: "Weak Password",
             description: "Password must be at least 6 characters long.",
             variant: "destructive",
         });
         return;
     }

    // **** ADDED DEBUG LOG from previous step (already here, just confirming) ****
    console.log('DEBUG: Calling context signUp with:', {
        email: trimmedEmail,
        fullName: trimmedName,
        companyName: trimmedCompanyName
    });
    // ***************************************************************************

    try {
      setIsSigningUp(true);
      // Call the modified signUp from context, passing companyName
      await signUp(trimmedEmail, signupPassword, trimmedName, trimmedCompanyName);

      // Success toast is handled within the context signUp function now
      // toast({ ... }); // No need for success toast here anymore

      // Optional: Navigate to login or show a specific message
      // setActiveTab('login'); // Switch to login tab?
      // Or clear form:
      // setSignupEmail(''); setSignupPassword(''); setSignupName(''); setCompanyName('');

    } catch (error) {
      // Error toast is handled within the context signUp function
      console.error('Signup error (in AuthPage component):', error);
      // No need for error toast here anymore unless you want component-specific handling
    } finally {
      setIsSigningUp(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <BlurCard className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSigningUp}>
                    {isSigningUp ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </BlurCard>
    </div>
  );
};

export default AuthPage;
