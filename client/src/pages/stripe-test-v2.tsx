import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';

// Import Stripe.js directly
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

export default function StripeTestV2() {
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('Test Payment');
  const [recipientName, setRecipientName] = useState('John Smith');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Debug Stripe environment variables
  useEffect(() => {
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    console.log('Stripe Test V2 Page - Key:', stripePublicKey);
    console.log('Valid key format:', stripePublicKey?.startsWith('pk_'));
    
    // Check URL parameters for success or canceled status
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';
    const isCanceled = urlParams.get('canceled') === 'true';
    
    if (isSuccess) {
      setPaymentStatus('success');
    } else if (isCanceled) {
      setPaymentStatus('error');
      setError('Payment was canceled');
    }
  }, []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
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
        amount: parseFloat(amount) * 100, // Convert dollars to cents
        description: description || 'Payment'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { id: sessionId, url: checkoutUrl } = await response.json();
      
      // Redirect directly to the Stripe Checkout URL
      window.location.href = checkoutUrl;
      
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
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // If payment is successful, show success message
  if (paymentStatus === 'success') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Payment Successful</CardTitle>
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
            <Button onClick={() => setPaymentStatus('idle')} className="w-full">
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
        <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>
        
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
            <Button onClick={() => setPaymentStatus('idle')} className="w-full">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Payment Test v2</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Stripe Checkout</CardTitle>
          <CardDescription>
            Test the Stripe payment integration using a redirect to Stripe Checkout.
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
                'Pay with Stripe'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}