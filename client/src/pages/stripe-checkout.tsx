import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { formatCurrency } from '@/lib/utils';

/**
 * Stripe Checkout Implementation
 * - Uses Stripe's server-side checkout session creation
 * - Redirects to Stripe hosted checkout page
 * - Handles success and cancel redirects
 */
export default function StripeCheckout() {
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('Contract Payment');
  const [recipientName, setRecipientName] = useState('John Smith');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Parse URL query parameters to detect successful payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const canceled = params.get('canceled');
    
    if (success === 'true') {
      setPaymentStatus('success');
      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.'
      });
    } else if (canceled === 'true') {
      setPaymentStatus('error');
      setError('Payment was canceled.');
      toast({
        title: 'Payment Canceled',
        description: 'Your payment was canceled.',
        variant: 'destructive'
      });
    }
  }, [location, toast]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setPaymentStatus('processing');
      
      // Create checkout session on the server
      const response = await apiRequest('POST', '/api/create-checkout-session', {
        amount: parseFloat(amount),
        description: description || 'Payment'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const { url: checkoutUrl } = await response.json();
      console.log('Checkout URL:', checkoutUrl);
      
      if (checkoutUrl) {
        // Redirect to Stripe's hosted checkout page
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned from server');
      }
      
    } catch (err: any) {
      setPaymentStatus('error');
      const errorMessage = typeof err === 'object' && err.message ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Payment failed',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    return formatCurrency(amount); // Use GBP formatting from utils
  };

  // If payment is successful, show success message
  if (paymentStatus === 'success') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Payment Successful</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Payment Complete</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg font-semibold">{formatAmount(amount)}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-sm text-muted-foreground">Recipient: {recipientName}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              // Clear URL parameters and reset state
              window.history.replaceState({}, document.title, window.location.pathname);
              setPaymentStatus('idle');
            }} className="w-full">
              Make Another Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Payment Failed</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Payment Failed</CardTitle>
            <CardDescription>
              Something went wrong with your payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              // Clear URL parameters and reset state
              window.history.replaceState({}, document.title, window.location.pathname);
              setPaymentStatus('idle');
            }} className="w-full">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Make a Payment</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Secure Payment</CardTitle>
          <CardDescription>
            Complete your payment securely through Stripe.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handlePaymentSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Payment description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Name</Label>
              <Input
                id="recipient"
                placeholder="Recipient name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}