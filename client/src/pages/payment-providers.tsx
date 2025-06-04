import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Shield, CheckCircle, Plus, Settings, CreditCard, Users, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TrolleyConnection {
  id: string;
  status: 'connected' | 'pending' | 'disconnected';
  subAccountId?: string;
  connectedAt?: string;
  lastSync?: string;
}

export default function PaymentProviders() {
  const [apiKey, setApiKey] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Trolley connection status
  const { data: trolleyConnection, isLoading } = useQuery({
    queryKey: ['/api/trolley/status'],
    queryFn: async () => {
      const response = await fetch('/api/trolley/status');
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Connect payment provider
  const connectProvider = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payment-providers/connect", data);
    },
    onSuccess: () => {
      toast({
        title: "Provider Connected",
        description: "Payment provider has been successfully connected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
      setShowSetup(false);
      setApiKey('');
      setSecretKey('');
      setSelectedProvider('');
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect payment provider.",
        variant: "destructive",
      });
    }
  });

  // Disconnect provider
  const disconnectProvider = useMutation({
    mutationFn: async (providerId: string) => {
      return apiRequest("DELETE", `/api/payment-providers/${providerId}`);
    },
    onSuccess: () => {
      toast({
        title: "Provider Disconnected",
        description: "Payment provider has been disconnected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-providers'] });
    }
  });

  const handleConnect = () => {
    if (!selectedProvider || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter your API credentials.",
        variant: "destructive",
      });
      return;
    }

    const providerInfo = AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider);
    
    connectProvider.mutate({
      providerId: selectedProvider,
      providerName: providerInfo?.name,
      credentials: {
        apiKey: apiKey,
        secretKey: secretKey
      }
    });
  };

  const getProviderInfo = (providerId: string) => {
    return AVAILABLE_PROVIDERS.find(p => p.id === providerId);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Providers</h1>
          <p className="text-muted-foreground">
            Connect third-party payment providers to process contractor payments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          Third-party Integration
        </div>
      </div>

      {/* Connected Providers */}
      {connectedProviders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Connected Providers
            </CardTitle>
            <CardDescription>
              These payment providers are connected and ready to process payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {connectedProviders.map((provider: any) => {
              const info = getProviderInfo(provider.providerId);
              return (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-green-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{info?.logo}</div>
                    <div>
                      <div className="font-medium">{info?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Connected • {info?.description}
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectProvider.mutate(provider.id)}
                      disabled={disconnectProvider.isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Available Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Available Payment Providers</CardTitle>
          <CardDescription>
            Choose a payment provider to handle contractor payments and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AVAILABLE_PROVIDERS.map((provider) => {
            const isConnected = connectedProviders.some((cp: any) => cp.providerId === provider.id);
            
            return (
              <div
                key={provider.id}
                className={`p-4 border rounded-lg ${isConnected ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{provider.logo}</div>
                    <div className="flex-1">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {provider.description}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {provider.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <Badge variant="default">Connected</Badge>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedProvider(provider.id);
                          setShowSetup(true);
                        }}
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Payment Provider</CardTitle>
              <CardDescription>
                Enter your API credentials to connect {AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="provider">Payment Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.logo} {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="secret-key">Secret Key (if required)</Label>
                <Input
                  id="secret-key"
                  type="password"
                  placeholder="Enter your secret key"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border">
                <p className="text-sm text-blue-800">
                  You'll need to create an account with {AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider)?.name} and obtain API credentials from their developer console.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={connectProvider.isPending}
                  className="flex-1"
                >
                  {connectProvider.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Connect Provider
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSetup(false);
                    setSelectedProvider('');
                    setApiKey('');
                    setSecretKey('');
                  }}
                  disabled={connectProvider.isPending}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legal Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Third-Party Payment Processing</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All payments are processed by licensed third-party providers</li>
                <li>• Your platform acts as a workflow coordinator, not a payment processor</li>
                <li>• Compliance and regulatory requirements are handled by the providers</li>
                <li>• Each provider has their own terms, fees, and supported regions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}