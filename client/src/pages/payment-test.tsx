import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PaymentTestPage() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive'
      });
      return;
    }
    
    // Simulate payment processing
    setPaymentStatus('processing');
    
    // Simulate a response after 2 seconds
    setTimeout(() => {
      // 90% success rate for demo purposes
      const isSuccess = Math.random() < 0.9;
      
      if (isSuccess) {
        setPaymentStatus('success');
        toast({
          title: 'Payment Successful',
          description: `Your payment of $${parseFloat(amount).toFixed(2)} to ${recipientName} has been processed.`
        });
      } else {
        setPaymentStatus('error');
        toast({
          title: 'Payment Failed',
          description: 'There was an error processing your payment. Please try again.',
          variant: 'destructive'
        });
      }
    }, 2000);
  };

  const handleReset = () => {
    setPaymentStatus('idle');
    setAmount('');
    setDescription('');
    setRecipientName('');
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
        <h1 className="text-3xl font-bold mb-8">Payment Integration Test</h1>
        
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
        
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold mb-4">⚠️ Stripe Integration Notice</h2>
          <p className="max-w-lg mx-auto">
            We're currently waiting for the correct Stripe publishable key. The actual Stripe payment integration
            will be available after setting up the proper key. This simulation shows the UI flow but doesn't 
            process real payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Payment Integration Test</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Payment</CardTitle>
          <CardDescription>
            Enter payment details to test the payment flow.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
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
                disabled={paymentStatus === 'processing'}
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
                disabled={paymentStatus === 'processing'}
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
                disabled={paymentStatus === 'processing'}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={paymentStatus === 'processing'}
            >
              {paymentStatus === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Payment'
              )}
            </Button>
            
            {paymentStatus === 'error' && (
              <div className="flex items-center text-destructive">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-sm">Payment failed. Please try again.</span>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground text-center w-full mt-2">
              This is a simulated payment flow until we get the proper Stripe publishable key.
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}