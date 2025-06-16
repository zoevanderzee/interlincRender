import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TrolleyWidgetProps {
  contractorEmail: string;
  contractorId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TrolleyWidget({ contractorEmail, contractorId, onSuccess, onCancel }: TrolleyWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<'none' | 'creating' | 'active' | 'error'>('none');
  const { toast } = useToast();

  // Check if contractor already has a recipient
  useEffect(() => {
    checkRecipientStatus();
  }, [contractorId]);

  const checkRecipientStatus = async () => {
    try {
      const response = await apiRequest('GET', `/api/trolley/recipients/${contractorId}`);
      if (response.ok) {
        setRecipientStatus('active');
      } else {
        setRecipientStatus('none');
      }
    } catch (error) {
      setRecipientStatus('none');
    }
  };

  const generateWidgetUrl = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/trolley/widget-url', {
        contractorEmail,
        theme: 'dark',
        collectTaxInfo: true
      });

      const data = await response.json();
      if (data.widgetUrl) {
        setWidgetUrl(data.widgetUrl);
      } else {
        throw new Error('Failed to generate widget URL');
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to generate onboarding URL",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRecipient = async () => {
    setIsLoading(true);
    setRecipientStatus('creating');
    
    try {
      const response = await apiRequest('POST', '/api/trolley/recipients', {
        contractorId
      });

      if (response.ok) {
        setRecipientStatus('active');
        toast({
          title: "Recipient Created",
          description: "Contractor has been set up for payments",
        });
        onSuccess?.();
      } else {
        throw new Error('Failed to create recipient');
      }
    } catch (error: any) {
      setRecipientStatus('error');
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to set up contractor for payments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openWidget = () => {
    if (widgetUrl) {
      // Open widget in new window
      const popup = window.open(
        widgetUrl,
        'trolley-widget',
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (popup) {
        // Listen for popup close
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Check if recipient was created
            setTimeout(() => {
              checkRecipientStatus();
            }, 1000);
          }
        }, 1000);
      }
    }
  };

  if (recipientStatus === 'active') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Payment Setup Complete
          </CardTitle>
          <CardDescription>
            This contractor is ready to receive payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-green-600">
            Active Recipient
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contractor Payment Setup</CardTitle>
        <CardDescription>
          Set up {contractorEmail} to receive payments through Trolley
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recipientStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">
              Failed to set up payments. Please try again.
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-col space-y-2">
            <h4 className="font-medium">Option 1: Quick Setup</h4>
            <p className="text-sm text-muted-foreground">
              Create a basic recipient profile for immediate payments
            </p>
            <Button 
              onClick={createRecipient} 
              disabled={isLoading || recipientStatus === 'creating'}
              className="w-full"
            >
              {isLoading && recipientStatus === 'creating' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Quick Setup'
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <h4 className="font-medium">Option 2: Full Onboarding</h4>
            <p className="text-sm text-muted-foreground">
              Complete profile with payment methods and tax information
            </p>
            {!widgetUrl ? (
              <Button 
                onClick={generateWidgetUrl} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Onboarding Link'
                )}
              </Button>
            ) : (
              <Button 
                onClick={openWidget}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Onboarding Widget
              </Button>
            )}
          </div>
        </div>

        <div className="pt-4 text-xs text-muted-foreground">
          <p>
            <strong>Quick Setup:</strong> Creates a basic recipient profile using existing contractor information.
          </p>
          <p className="mt-1">
            <strong>Full Onboarding:</strong> Contractor completes their own profile with payment preferences and tax details.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}