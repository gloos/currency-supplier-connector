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
import { freeAgentApi } from "@/utils/freeagent-api"; // Keep for disconnect, loadCredentials, getAuthUrl
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Loader2, ExternalLink, CheckCircle, AlertTriangle, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // Use the client instance

// Interface for preferences table (assuming it exists in types/freeagent.ts or similar)
interface PreferencesTable {
  id: number;
  auto_create_bills: boolean | null; // Allow null based on DB schema
  default_currency: string | null; // Allow null based on DB schema
  created_at: string | null;
  updated_at: string | null;
}

const Settings = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [freeAgentClientId, setFreeAgentClientId] = useState("");
  // REMOVED: const [freeAgentClientSecret, setFreeAgentClientSecret] = useState("");
  const [autoCreateBills, setAutoCreateBills] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [isConnected, setIsConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // General submitting state
  const [isLoading, setIsLoading] = useState(true); // Initial page load state
  const [isConnecting, setIsConnecting] = useState(false); // Specific state for OAuth connection process
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState("");

  // Set the redirect URI for display
  useEffect(() => {
    const uri = `${window.location.origin}/settings`;
    console.log("Current redirect URI for display:", uri);
    setRedirectUri(uri);
  }, []);

  // Check for OAuth code/error and load initial state
  useEffect(() => {
    const processOAuthCallback = async () => {
      const query = new URLSearchParams(location.search);
      const code = query.get('code');
      const error = query.get('error');
      const errorDescription = query.get('error_description');

      if (error) {
        setOauthError(errorDescription || 'An error occurred during FreeAgent authorization.');
        console.error("OAuth error received:", error, errorDescription);
        toast({ title: "Authorization Failed", description: errorDescription || "Failed to connect to FreeAgent.", variant: "destructive" });
        navigate("/settings", { replace: true }); // Clear URL params
        setIsLoading(false);
        return;
      }

      if (code) {
        setIsLoading(true); // Show loading while processing code
        setIsConnecting(true); // Indicate connection process is active
        setOauthError(null);
        console.log("Found auth code, invoking Edge Function...");

        try {
          // Call the Edge Function to exchange the code
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'freeagent-oauth-callback', // Edge Function name
            { body: { code } }          // Pass the code securely in the body
          );

          if (functionError) {
            console.error('Edge Function invocation error:', functionError);
            // Attempt to parse Supabase Edge Function error details if available
            let detail = functionError.message || 'Failed to invoke backend function.';
            if (functionError.context && typeof functionError.context === 'object' && 'error' in functionError.context) {
                detail = (functionError.context as any).error || detail;
            }
            throw new Error(detail);
          }

          // Check the response *from the function itself*
          if (functionData?.error) {
             console.error('Edge Function execution error:', functionData.error);
             throw new Error(functionData.error);
          }

          if (functionData?.success) {
             console.log("Edge Function call successful:", functionData.message);
             setIsConnected(true);
             toast({ title: "Connected", description: "Successfully connected to FreeAgent." });
             // Reload credentials to display Client ID (secret is not needed/stored client-side)
             const creds = await freeAgentApi.loadCredentials(); // Load from DB via API helper
             if (creds) setFreeAgentClientId(creds.clientId);
          } else {
              // This case should ideally be caught by functionData.error check above
              throw new Error(functionData?.message || 'Unknown error during token exchange process.');
          }

        } catch (invokeError) {
          console.error("Error during Edge Function call or processing:", invokeError);
          const message = invokeError instanceof Error ? invokeError.message : "Failed to connect to FreeAgent after authorization.";
          setOauthError(message);
          toast({ title: "Connection Failed", description: message, variant: "destructive" });
        } finally {
          navigate("/settings", { replace: true }); // Clean up URL params
          setIsConnecting(false); // End connection specific loading state
          setIsLoading(false); // End general loading state
        }
      } else {
         // No code or error in URL, just load the current connection status and preferences
         const loadInitialData = async () => {
             setIsLoading(true);
             try {
                 // Load FreeAgent connection status
                 const credentials = await freeAgentApi.loadCredentials();
                 if (credentials?.accessToken) {
                     setIsConnected(true);
                     setFreeAgentClientId(credentials.clientId);
                 } else {
                     setIsConnected(false);
                 }

                 // Load Preferences
                 const { data: prefsData, error: prefsError } = await supabase
                    .from('preferences')
                    .select('*')
                    .eq('id', 1) // Assuming single row with ID 1
                    .maybeSingle();

                 if (prefsError) {
                    console.error("Error loading preferences:", prefsError);
                    // Non-critical, maybe toast a warning
                 } else if (prefsData) {
                    const prefs = prefsData as PreferencesTable;
                    setAutoCreateBills(prefs.auto_create_bills ?? true);
                    setDefaultCurrency(prefs.default_currency ?? "USD");
                 }
             } catch(err) {
                 console.error("Error loading initial settings data:", err);
                 toast({ title: "Error", description: "Could not load initial settings.", variant: "destructive" });
             } finally {
                 setIsLoading(false);
             }
         };
         loadInitialData();
      }
    };

    processOAuthCallback();
  // Rerun when location changes (e.g., after OAuth redirect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navigate, toast]); // Dependencies for effect

  // --- Initiate FreeAgent Connection ---
  const handleConnectFreeAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setOauthError(null); // Clear previous errors
    const trimmedClientId = freeAgentClientId.trim();

    if (!trimmedClientId) {
      toast({
        title: "Missing Information",
        description: "Please enter your FreeAgent OAuth Identifier (Client ID).",
        variant: "destructive"
      });
      return;
    }

    try {
      // Generate authorization URL using ONLY the Client ID
      const authUrl = freeAgentApi.getAuthUrl(trimmedClientId);
      console.log("Redirecting user to FreeAgent auth URL:", authUrl);
      // Redirect the user's browser to FreeAgent for authorization
      window.location.href = authUrl;
      // Show connecting state while redirecting
      setIsConnecting(true);
    } catch (error) {
        console.error("Error generating FreeAgent auth URL:", error);
        toast({ title: "Error", description: "Failed to initiate connection process.", variant: "destructive"});
        setIsConnecting(false); // Stop connecting state on error
    }
  };

  // --- Disconnect from FreeAgent ---
  const handleDisconnect = async () => {
    setIsSubmitting(true);
    try {
      await freeAgentApi.disconnect(); // This now deletes credentials from DB via the API helper
      setIsConnected(false);
      setFreeAgentClientId("");
      // REMOVED: setFreeAgentClientSecret("");
      setOauthError(null);
      toast({ title: "Disconnected", description: "Successfully disconnected from FreeAgent." });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect from FreeAgent.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Save User Preferences ---
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Upsert preferences into the database
      const { error } = await supabase
        .from('preferences')
        .upsert({
          id: 1, // Use a fixed ID for the single preferences row
          auto_create_bills: autoCreateBills,
          default_currency: defaultCurrency,
          updated_at: new Date().toISOString(), // Explicitly set update timestamp
        }, { onConflict: 'id' }); // Specify the conflict column

      if (error) {
        throw error;
      }

      toast({
        title: "Preferences Saved",
        description: "Your settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error Saving Preferences",
        description: error instanceof Error ? error.message : "Failed to save your preferences.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />
        <main className="page-container flex justify-center items-center pt-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // --- Render Main Settings Page ---
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Navbar />

        <main className="page-container">
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* FreeAgent Connection Card */}
            <BlurCard className="animate-slide-up">
              <CardHeader>
                <CardTitle>FreeAgent Integration</CardTitle>
                <CardDescription>
                  Connect your FreeAgent account to sync data.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleConnectFreeAgent} className="space-y-4">
                  <div>
                    <Label htmlFor="clientId">OAuth Identifier (Client ID)</Label>
                    <Input
                      id="clientId"
                      value={freeAgentClientId}
                      onChange={(e) => setFreeAgentClientId(e.target.value)}
                      disabled={isConnected || isConnecting || isSubmitting}
                      placeholder="Enter your FreeAgent Client ID"
                      required
                    />
                  </div>

                  {/* Client Secret Input REMOVED */}

                  <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                    <div className="flex items-start mb-2">
                      <Globe className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Your Redirect URI</p>
                        <p className="mt-1 break-all font-mono text-xs bg-background/50 px-2 py-1 rounded">{redirectUri}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ensure this exact URI is registered in your FreeAgent application settings.
                    </p>
                  </div>

                  {oauthError && (
                    <div className="rounded-lg bg-destructive/10 text-destructive p-4 text-sm flex items-start border border-destructive/30">
                      <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Connection Error</p>
                        <p className="mt-1">{oauthError}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 text-sm text-muted-foreground">
                    <a
                      href="https://dev.freeagent.com/docs/oauth" // Link to relevant docs
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center hover:text-primary transition-colors"
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Find your FreeAgent OAuth credentials
                    </a>
                  </div>

                  <div className="pt-4">
                    {isConnected ? (
                      <div className="flex flex-col space-y-4">
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 text-sm flex items-start border border-green-200 dark:border-green-700">
                          <CheckCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Connected to FreeAgent</p>
                            <p className="mt-1">Your account is linked.</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDisconnect}
                          disabled={isSubmitting || isConnecting}
                          className="w-full"
                        >
                          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Disconnect FreeAgent
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting || isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isConnecting ? "Connecting..." : "Connect to FreeAgent"}
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </BlurCard>

            {/* Preferences Card */}
            <BlurCard className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Configure default settings for the application.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSavePreferences} className="space-y-6">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="autoBill" className="text-base">Auto-create bills</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create bills in FreeAgent when sending POs. (Requires FreeAgent connection)
                      </p>
                    </div>
                    <Switch
                      id="autoBill"
                      checked={autoCreateBills}
                      onCheckedChange={setAutoCreateBills}
                      disabled={!isConnected || isSubmitting} // Disable if not connected
                      aria-label="Toggle automatic bill creation in FreeAgent"
                    />
                  </div>

                  <div>
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Input
                      id="defaultCurrency"
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())} // Force uppercase
                      placeholder="e.g., GBP, USD, EUR"
                      maxLength={3}
                      disabled={isSubmitting}
                      className="w-32" // Make currency input smaller
                    />
                     <p className="text-xs text-muted-foreground mt-1">Enter the 3-letter currency code (e.g., GBP).</p>
                  </div>

                  <Button
                    type="submit"
                    className="mt-6 w-full"
                    disabled={isSubmitting || isConnecting}
                  >
                    {isSubmitting && !isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Preferences
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