import { useState, useEffect, useRef } from 'react';
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
  embedMode?: boolean; // Use iframe vs popup window
}

export function TrolleyWidget({ contractorEmail, contractorId, onSuccess, onCancel, embedMode = true }: TrolleyWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [recipientStatus, setRecipientStatus] = useState<'none' | 'creating' | 'active' | 'error'>('none');
  const [widgetHeight, setWidgetHeight] = useState('600px');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Check if contractor already has a recipient
  useEffect(() => {
    checkRecipientStatus();
  }, [contractorId]);

  // Setup widget event listeners for iframe communication
  useEffect(() => {
    if (!embedMode || !widgetUrl) return;

    const handleWidgetEvents = (event: MessageEvent) => {
      if (event.origin !== 'https://widget.trolley.com') return;

      const widgetEvent = event.data;
      console.log('Trolley Widget Event:', widgetEvent);

      switch (widgetEvent.event) {
        case 'document.height':
          // Auto-adjust iframe height
          if (iframeRef.current) {
            const newHeight = `${widgetEvent.document.height}px`;
            setWidgetHeight(newHeight);
            iframeRef.current.style.height = newHeight;
          }
          break;

        case 'document.loaded':
          console.log('Trolley Widget loaded successfully');
          break;

        case 'document.failed':
          console.error('Trolley Widget failed to load:', widgetEvent.document);
          toast({
            title: "Widget Error",
            description: `Failed to load: ${widgetEvent.document.message}`,
            variant: "destructive",
          });
          break;

        case 'module.loaded':
          console.log(`Trolley module loaded: ${widgetEvent.module[0]}`);
          break;

        case 'module.successful':
          console.log(`Trolley module completed: ${widgetEvent.module[0]}`);
          if (widgetEvent.module[0] === 'pay') {
            toast({
              title: "Setup Complete",
              description: "Payment information configured successfully",
            });
            setTimeout(() => {
              checkRecipientStatus();
              onSuccess?.();
            }, 1000);
          }
          break;

        case 'module.failed':
          console.error(`Trolley module failed: ${widgetEvent.module[0]}`);
          toast({
            title: "Setup Error",
            description: `Failed to complete ${widgetEvent.module[0]} setup`,
            variant: "destructive",
          });
          break;
      }
    };

    window.addEventListener('message', handleWidgetEvents);
    return () => window.removeEventListener('message', handleWidgetEvents);
  }, [embedMode, widgetUrl, toast, onSuccess]);

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

  const generateWidgetUrl = async (setupType: 'quick' | 'full' = 'full') => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/trolley/widget-url', {
        contractorEmail,
        contractorId,
        products: setupType === 'quick' ? ['pay'] : ['pay', 'tax'],
        colors: {
          primary: 'hsl(var(--primary))',
          background: 'hsl(var(--background))',
          text: 'hsl(var(--foreground))',
          border: 'hsl(var(--border))'
        }
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
              <div className="flex gap-2">
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    generateWidgetUrl('quick');
                  }}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Quick Setup'
                  )}
                </Button>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    generateWidgetUrl('full');
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Full Setup'
                  )}
                </Button>
              </div>
            ) : embedMode ? (
              <div className="space-y-3">
                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <iframe
                    ref={iframeRef}
                    id="trolley-widget"
                    src={widgetUrl}
                    width="100%"
                    height={widgetHeight}
                    frameBorder="0"
                    style={{ 
                      minHeight: '400px',
                      backgroundColor: 'hsl(var(--background))' 
                    }}
                    title="Trolley Payment Setup"
                  />
                </div>
                <Button 
                  onClick={() => setWidgetUrl(null)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Generate New Link
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button 
                  onClick={openWidget}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Onboarding Widget
                </Button>
                <Button 
                  onClick={() => setWidgetUrl(null)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                >
                  Generate New Link
                </Button>
              </div>
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