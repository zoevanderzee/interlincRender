import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StripeTestSimple() {
  const [amount, setAmount] = useState('25.00');
  const [description, setDescription] = useState('Test Payment');
  const [recipientName, setRecipientName] = useState('John Smith');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  // Handle form submission - create a simulated payment
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
    
    setStatus('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setStatus('success');
      
      toast({
        title: 'Payment Simulated',
        description: 'Since we\'re having issues with Stripe integration, this is a simulated success.',
      });
    }, 1500);
  };

  // Format amount as currency
  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Payment Simulation</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Payment Successful</CardTitle>
            <CardDescription>
              Your payment has been simulated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg font-semibold">{formatAmount(amount)}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-sm text-muted-foreground">Recipient: {recipientName}</p>
            <div className="mt-4 p-3 bg-muted/40 rounded-md">
              <p className="text-sm font-medium">This is a simulated payment</p>
              <p className="text-xs text-muted-foreground">
                In production, this would process a real payment through Stripe.
                We're showing this simulation due to Stripe integration challenges.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setStatus('idle')} className="w-full">
              Make Another Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Payment Simulation</h1>
        
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Payment Failed</CardTitle>
            <CardDescription>
              Something went wrong with your payment simulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {errorMessage && <p className="text-sm text-destructive mb-4">{errorMessage}</p>}
            <p className="text-sm text-muted-foreground">Please try again or contact support.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setStatus('idle')} className="w-full">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Initial/Payment form state
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Payment Simulation</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
          <CardDescription>
            Fill in the details to simulate a payment. In production, this would use Stripe.
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
            
            <div className="mt-4 p-3 bg-secondary/20 rounded-md">
              <p className="text-sm font-medium">Simulated Payment</p>
              <p className="text-xs text-muted-foreground">
                This is a simulation of a payment flow. In production, we would integrate with Stripe
                for secure payment processing.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full"
              disabled={status === 'processing'}
            >
              {status === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Make Payment'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}