import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { freeAgentApi } from '@/utils/freeagent-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner'; // Use sonner toast
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Interface for the credential status check from Supabase
interface CredentialStatus {
    id: number; // The PK of the credential row
    company_id: string;
    updated_at: string | null; // Use updated_at as proxy for last sync
}

const Settings: React.FC = () => {
    const { user } = useAuth();
    const companyId = user?.company?.id;
    const queryClient = useQueryClient();
    const [oauthError, setOauthError] = useState<string | null>(null); // For OAuth redirect specific errors

    // --- Data Fetching and Mutations --- 

    // Query to check FreeAgent connection status
    const { data: credential, isLoading: isLoadingStatus, error: statusError } = useQuery<CredentialStatus | null>({
        queryKey: ['freeagentConnectionStatus', companyId],
        queryFn: async (): Promise<CredentialStatus | null> => {
            if (!companyId) return null; // Guard clause
            const { data, error } = await supabase
                .from('freeagent_credentials')
                .select('id, company_id, updated_at')
                .eq('company_id', companyId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching connection status:", error);
                 if (error.message.includes('column') && error.message.includes('does not exist')) {
                     console.warn("DB schema might be outdated. Ensure 'company_id' exists on 'freeagent_credentials'.");
                     throw new Error("Database schema error. Cannot check connection.");
                 }
                throw new Error(`Failed to check FreeAgent connection status: ${error.message}`);
            }
            return data as CredentialStatus | null; // Cast data to expected type or null
        },
        enabled: !!companyId, // Only run if companyId is available
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchOnWindowFocus: false, // Prevent refetch on tab focus
    });

    // Derive connection state from query result
    const isConnected = !!credential;
    const credentialId = credential?.id;
    const lastSyncTime = credential?.updated_at ? new Date(credential.updated_at).toLocaleString() : 'Never';

    // Mutation to trigger the sync Edge Function
    const triggerSync = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('sync-freeagent-data');
            if (error) {
                 let message = error.message || 'Failed to start data sync.';
                 if (error.context?.error_details) message = error.context.error_details;
                 throw new Error(message);
            }
             if (data?.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            toast("Sync Successful", {
                description: `Synced: ${data?.syncedContacts ?? 0} contacts, ${data?.syncedProjects ?? 0} projects, ${data?.syncedCategories ?? 0} categories.`,
            });
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['freeagentConnectionStatus', companyId] });
            queryClient.invalidateQueries({ queryKey: ['cachedContacts', companyId] });
            queryClient.invalidateQueries({ queryKey: ['cachedProjects', companyId] });
            queryClient.invalidateQueries({ queryKey: ['cachedCategories', companyId] });
        },
        onError: (error) => {
             toast("Sync Failed", {
                 description: error instanceof Error ? error.message : "Unknown sync error.",
             });
        },
    });

    // Mutation for disconnecting
    const disconnectMutation = useMutation({
         mutationFn: async () => {
             if (!credentialId) throw new Error("Cannot disconnect, connection details not found.");
             await freeAgentApi.disconnect(credentialId); // Call utility function
         },
         onSuccess: () => {
             toast("Disconnected", { description: "Successfully disconnected from FreeAgent." });
             // Invalidate status and remove cached data
             queryClient.invalidateQueries({ queryKey: ['freeagentConnectionStatus', companyId] });
             queryClient.removeQueries({ queryKey: ['cachedContacts', companyId] });
             queryClient.removeQueries({ queryKey: ['cachedProjects', companyId] });
             queryClient.removeQueries({ queryKey: ['cachedCategories', companyId] });
         },
         onError: (error) => {
             toast("Disconnect Failed", {
                 description: error instanceof Error ? error.message : "Unknown disconnect error.",
             });
         },
     });

    // --- Effects --- 

    // Effect to handle the OAuth callback
    useEffect(() => {
        let isMounted = true; // Flag to track component mount status

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        const errorDesc = params.get('error_description');

        if (code || errorParam) {
            // Clean URL immediately only if mounted to avoid potential issues
            if (isMounted) {
                 window.history.replaceState({}, document.title, window.location.pathname); 
            }
        }

        if (errorParam) {
            const errorMsg = `Connection failed: ${errorDesc || errorParam}`;
            console.error(`OAuth Error: ${errorParam} - ${errorDesc}`);
            if (isMounted) {
                 setOauthError(errorMsg);
            }
            return; // Exit early
        }

        if (code) {
             if (isMounted) {
                 setOauthError(null);
             }
            console.log("OAuth code detected, invoking callback function...");
            
            supabase.functions.invoke('freeagent-oauth-callback', { body: { code } })
                .then(({ data, error }) => {
                    if (!isMounted) return; // Don't proceed if unmounted

                    if (error) {
                        let message = error.message || 'Failed processing connection.';
                         if (error.context?.error_details) message = error.context.error_details;
                        throw new Error(message);
                    }
                    if (data?.error) throw new Error(data.error);

                    console.log("Callback function success:", data);
                    toast("Connected", { description: "Successfully connected! You can now sync data." });
                    queryClient.invalidateQueries({ queryKey: ['freeagentConnectionStatus', companyId] });
                })
                .catch((err) => {
                    if (!isMounted) return; // Don't proceed if unmounted

                    const errorMsg = err instanceof Error ? err.message : "Unknown callback error.";
                    console.error("Error during connection callback processing:", err);
                    setOauthError(`Connection Error: ${errorMsg}`);
                    toast("Connection Failed", { description: errorMsg });
                });
        }

        // Cleanup function to set isMounted to false when component unmounts
        return () => {
            isMounted = false;
        };
        // Disable ESLint exhaustive-deps rule if triggerSync causes infinite loops, 
        // but ensure companyId and queryClient are stable or correctly handled.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient, companyId]); // Re-run only if queryClient or companyId changes

    // --- Event Handlers --- 

    const handleConnect = () => {
        try {
            setOauthError(null);
            const authUrl = freeAgentApi.getAuthUrl();
            window.location.href = authUrl;
        } catch (error) {
             const errorMsg = error instanceof Error ? error.message : "Configuration error.";
             console.error("Error initiating connection:", error);
             toast("Connection Error", { description: errorMsg });
             setOauthError(errorMsg);
        }
    };

    const handleDisconnect = () => disconnectMutation.mutate();
    const handleSyncNow = () => triggerSync.mutate();

    // Combine loading states
    const isLoading = isLoadingStatus || triggerSync.isPending || disconnectMutation.isPending;

    // --- Render --- 
    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>FreeAgent Integration</CardTitle>
                <CardDescription>
                    Connect your FreeAgent account to sync contacts, projects, and categories.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Initial Loading State */}
                {isLoadingStatus && (
                    <div className="flex items-center justify-center p-4">
                         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                         <span className="ml-2 text-muted-foreground">Loading connection status...</span>
                    </div>
                )}

                {/* Status Loading Error */}
                {statusError && !isLoadingStatus && (
                     <Alert variant="destructive">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Error Loading Status</AlertTitle>
                       <AlertDescription>
                           {statusError instanceof Error ? statusError.message : "Could not load connection details."}
                       </AlertDescription>
                     </Alert>
                )}

                {/* OAuth Redirect Error */}
                {oauthError && !isLoading && (
                     <Alert variant="destructive">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Connection Error</AlertTitle>
                       <AlertDescription>{oauthError}</AlertDescription>
                     </Alert>
                )}

                {/* Main Content Area (when status loaded successfully) */}
                {!isLoadingStatus && !statusError && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm font-medium">
                                Status: {isLoadingStatus ? <Loader2 className="inline-block h-4 w-4 animate-spin ml-1" /> : (isConnected ? <span className="text-green-600 font-semibold ml-1">Connected</span> : <span className="text-red-600 font-semibold ml-1">Not Connected</span>)}
                            </p>
                            {isConnected && (
                                <p className="text-sm text-muted-foreground">Last Sync: {lastSyncTime}</p>
                            )}
                        </div>

                        {!isConnected && !companyId && (
                            <Alert variant="default" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Company Not Loaded</AlertTitle>
                                <AlertDescription>Cannot manage integration until company details are available.</AlertDescription>
                            </Alert>
                        )}

                        {/* Action Buttons */  }
                        <div className="flex space-x-2 pt-2">
                            {isConnected ? (
                                <>
                                    <Button
                                        onClick={handleSyncNow}
                                        disabled={isLoading}
                                        aria-label="Sync FreeAgent data now"
                                        size="sm"
                                    >
                                        {triggerSync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Sync Now
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDisconnect}
                                        disabled={isLoading}
                                        aria-label="Disconnect from FreeAgent"
                                        size="sm"
                                    >
                                        {disconnectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Disconnect
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    onClick={handleConnect}
                                    disabled={isLoading || !companyId} // Disable if loading or no company ID
                                    aria-label="Connect to FreeAgent"
                                    size="sm"
                                >
                                    Connect to FreeAgent
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default Settings;