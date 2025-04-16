import { useState, useCallback } from 'react';
import { 
  usePlaidLink, 
  PlaidLinkOnSuccess, 
  PlaidLinkOnExit, 
  PlaidLinkOptionsWithLinkToken 
} from 'react-plaid-link';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlaidLinkProps {
  onSuccess?: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
  buttonText?: string;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
  className?: string;
}

export function PlaidLink({
  onSuccess,
  onExit,
  buttonText = "Link your bank account",
  variant = "default",
  className
}: PlaidLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Get link token from server when the component mounts
  const getLinkToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/plaid/link-token');
      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error getting link token:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize bank connection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const onPlaidSuccess: PlaidLinkOnSuccess = useCallback(
    (publicToken, metadata) => {
      console.log('Plaid Link success:', metadata);
      // Pass the public token and metadata to the parent component
      if (onSuccess) {
        onSuccess(publicToken, metadata);
      }
    },
    [onSuccess]
  );

  const onPlaidExit: PlaidLinkOnExit = useCallback(() => {
    // Reset loading state
    setIsLoading(false);
    // Notify parent component
    if (onExit) {
      onExit();
    }
  }, [onExit]);

  const config: PlaidLinkOptionsWithLinkToken = {
    token: linkToken || '',
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = useCallback(() => {
    if (!linkToken) {
      getLinkToken().then(() => {
        // The open function will be called once the token is set
        // due to the dependencies in the usePlaidLink hook
      });
    } else if (ready) {
      open();
    }
  }, [linkToken, ready, open, getLinkToken]);

  // If we already have a link token, we can call open() directly when the button is clicked
  // Otherwise, we need to get a link token first
  const onClick = useCallback(() => {
    if (linkToken && ready) {
      open();
    } else {
      handleClick();
    }
  }, [linkToken, ready, open, handleClick]);

  return (
    <Button
      onClick={onClick}
      disabled={isLoading || (Boolean(linkToken) && !ready)}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}