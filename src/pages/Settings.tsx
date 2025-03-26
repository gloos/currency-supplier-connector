
import React, { useState } from "react";
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

const Settings = () => {
  const { toast } = useToast();
  
  const [freeAgentApiKey, setFreeAgentApiKey] = useState("");
  const [freeAgentAccessToken, setFreeAgentAccessToken] = useState("");
  const [autoCreateBills, setAutoCreateBills] = useState(true);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [isConnected, setIsConnected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleConnectFreeAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!freeAgentApiKey || !freeAgentAccessToken) {
      toast({
        title: "Error",
        description: "Please enter both API Key and Access Token",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Initialize FreeAgent API with credentials
      freeAgentApi.init({
        apiKey: freeAgentApiKey,
        accessToken: freeAgentAccessToken
      });
      
      // Test the connection (in a real app, this would make an API call to verify)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnected(true);
      
      toast({
        title: "Connected",
        description: "Successfully connected to FreeAgent"
      });
    } catch (error) {
      console.error("Error connecting to FreeAgent:", error);
      
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to FreeAgent",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
    setFreeAgentApiKey("");
    setFreeAgentAccessToken("");
    
    toast({
      title: "Disconnected",
      description: "FreeAgent connection removed"
    });
  };
  
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, save preferences to server/database
    toast({
      title: "Preferences Saved",
      description: "Your settings have been updated"
    });
  };
  
  return (
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
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={freeAgentApiKey}
                    onChange={(e) => setFreeAgentApiKey(e.target.value)}
                    disabled={isConnected || isSubmitting}
                    placeholder="Your FreeAgent API key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={freeAgentAccessToken}
                    onChange={(e) => setFreeAgentAccessToken(e.target.value)}
                    disabled={isConnected || isSubmitting}
                    placeholder="Your FreeAgent access token"
                  />
                </div>
                
                <div className="pt-4">
                  {isConnected ? (
                    <div className="flex flex-col space-y-4">
                      <div className="rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 p-4 text-sm">
                        Successfully connected to FreeAgent
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDisconnect}
                      >
                        Disconnect
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
                
                <Button type="submit" className="mt-6 w-full">
                  Save Preferences
                </Button>
              </form>
            </CardContent>
          </BlurCard>
        </div>
      </main>
    </div>
  );
};

export default Settings;
