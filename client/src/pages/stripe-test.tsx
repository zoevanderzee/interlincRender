import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StripeElements } from '@/components/payments/StripeElements';

export default function StripeTestPage() {
  const [amount, setAmount] = useState('100.00');
  const [description, setDescription] = useState('Test Payment');
  const [recipientName, setRecipientName] = useState('John Smith');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showStripeForm, setShowStripeForm] = useState(false);
  const { toast } = useToast();
  
  // Debug Stripe environment variables
  useEffect(() => {
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    console.log('Stripe Test Page - Key:', stripePublicKey);
    console.log('Valid key format:', stripePublicKey?.startsWith('pk_'));
  }, []);

  const handleStartPayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive'
      });
      return;
    }
    
    setShowStripeForm(true);
  };
  
  const handlePaymentComplete = (paymentIntentId: string) => {
    setPaymentStatus('success');
    setShowStripeForm(false);
    toast({
      title: 'Payment Successful',
      description: `Your payment of ${formatAmount(amount)} has been processed.`,
    });
  };

  const handleReset = () => {
    setPaymentStatus('idle');
    setShowStripeForm(false);
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
        <h1 className="text-3xl font-bold mb-8">Stripe Payment Test</h1>
        
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
            <Button onClick={handleReset} className="w-full">
              Make Another Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Payment Test</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Stripe Payment</CardTitle>
          <CardDescription>
            Test the Stripe payment integration with a live payment form.
          </CardDescription>
        </CardHeader>
        
        {!showStripeForm ? (
          <form onSubmit={(e) => { e.preventDefault(); handleStartPayment(); }}>
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
              >
                Proceed to Payment
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent>
            <StripeElements 
              amount={parseFloat(amount) * 100} // Convert to cents
              onPaymentComplete={handlePaymentComplete}
              isProcessing={paymentStatus === 'processing'}
            />
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowStripeForm(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}