
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import BlurCard from "@/components/ui/blur-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { freeAgentApi } from "@/utils/freeagent-api";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Interface for preferences table
interface PreferencesTable {
  id: number;
  auto_create_bills: boolean;
  default_currency: string;
  created_at: string | null;
  updated_at: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [freeAgentClientId, setFreeAgentClientId] = useState("");
  const [freeAgentClientSecret, setFreeAgentClientSecret] = useState("");
  const [autoCreateBills, setAutoCreateBills] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [isConnected, setIsConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check for OAuth code in URL
  useEffect(() => {
    const checkCredentials = async () => {
      setIsLoading(true);
      try {
        // Load saved credentials
        const credentials = await freeAgentApi.loadCredentials();
        if (credentials?.accessToken) {
          setIsConnected(true);
          setFreeAgentClientId(credentials.clientId);
          // Don't set the client secret for security reasons
        }
        
        // Process OAuth callback if present
        const query = new URLSearchParams(location.search);
        const code = query.get('code');
        
        if (code && freeAgentClientId && freeAgentClientSecret) {
          setIsSubmitting(true);
          try {
            await freeAgentApi.exchangeCodeForToken(code, freeAgentClientId, freeAgentClientSecret);
            setIsConnected(true);
            // Remove code from URL
            navigate("/settings", { replace: true });
            toast({
              title: "Connected",
              description: "Successfully connected to FreeAgent"
            });
          } catch (error) {
            console.error("OAuth error:", error);
            toast({
              title: "Connection Failed",
              description: error instanceof Error ? error.message : "Failed to connect to FreeAgent",
              variant: "destructive"
            });
          } finally {
            setIsSubmitting(false);
          }
        }
      } catch (error) {
        console.error("Error checking credentials:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCredentials();
  }, [location, navigate, toast]);
  
  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .maybeSingle();
        
      if (error) {
        console.error("Error loading preferences:", error);
        return;
      }
      
      if (data) {
        const prefs = data as PreferencesTable;
        setAutoCreateBills(prefs.auto_create_bills ?? true);
        setDefaultCurrency(prefs.default_currency ?? "USD");
      }
    };
    
    loadPreferences();
  }, []);
  
  const handleConnectFreeAgent = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!freeAgentClientId || !freeAgentClientSecret) {
      toast({
        title: "Error",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive"
      });
      return;
    }
    
    // Redirect to FreeAgent OAuth authorization page
    const authUrl = freeAgentApi.getAuthUrl(freeAgentClientId);
    window.location.href = authUrl;
  };
  
  const handleDisconnect = async () => {
    setIsSubmitting(true);
    
    try {
      await freeAgentApi.disconnect();
      setIsConnected(false);
      setFreeAgentClientId("");
      setFreeAgentClientSecret("");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect from FreeAgent",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      // Save preferences to database
      const { error } = await supabase
        .from('preferences')
        .upsert({
          id: 1, // Single record
          auto_create_bills: autoCreateBills,
          default_currency: defaultCurrency
        });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Preferences Saved",
        description: "Your settings have been updated"
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        
        <main className="page-container">
          <div className="flex justify-center items-center mt-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        
        <main className="page-container">
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <BlurCard className="animate-slide-up">
              <CardHeader>
                <CardTitle>FreeAgent Integration</CardTitle>
                <CardDescription>
                  Connect your FreeAgent account to automatically create bills
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleConnectFreeAgent} className="space-y-4">
                  <div>
                    <Label htmlFor="clientId">OAuth Identifier</Label>
                    <Input
                      id="clientId"
                      value={freeAgentClientId}
                      onChange={(e) => setFreeAgentClientId(e.target.value)}
                      disabled={isConnected || isSubmitting}
                      placeholder="Your FreeAgent OAuth Identifier"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientSecret">OAuth Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={freeAgentClientSecret}
                      onChange={(e) => setFreeAgentClientSecret(e.target.value)}
                      disabled={isConnected || isSubmitting}
                      placeholder="Your FreeAgent OAuth Secret"
                    />
                  </div>
                  
                  <div className="pt-2 text-sm text-muted-foreground">
                    <a 
                      href="https://dev.freeagent.com/docs/quick_start" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-primary"
                    >
                      <ExternalLink size={14} className="mr-1" />
                      How to get OAuth credentials
                    </a>
                  </div>
                  
                  <div className="pt-4">
                    {isConnected ? (
                      <div className="flex flex-col space-y-4">
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 text-sm flex items-start">
                          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Successfully connected to FreeAgent</p>
                            <p className="mt-1">Your purchase orders can now automatically create bills in FreeAgent.</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDisconnect}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Processing..." : "Disconnect"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? "Connecting..." : "Connect to FreeAgent"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </BlurCard>
            
            <BlurCard className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Configure default settings for purchase orders
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSavePreferences} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="autoBill">Auto-create bills</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create bills in FreeAgent when sending POs
                      </p>
                    </div>
                    <Switch
                      id="autoBill"
                      checked={autoCreateBills}
                      onCheckedChange={setAutoCreateBills}
                      disabled={!isConnected}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Input
                      id="defaultCurrency"
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value)}
                      placeholder="USD"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="mt-6 w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Preferences"}
                  </Button>
                </form>
              </CardContent>
            </BlurCard>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
