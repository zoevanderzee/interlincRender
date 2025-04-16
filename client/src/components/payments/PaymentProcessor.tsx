import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { BankAccountSelector } from './BankAccountSelector';

// Import Stripe elements component
import { StripeElements } from './StripeElements';

// Check if we have a valid Stripe publishable key
const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

interface PaymentProcessorProps {
  paymentId: number;
  amount: string;
  description: string;
  recipientName: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

function PaymentProcessor({
  paymentId,
  amount,
  description,
  recipientName,
  onComplete,
  onCancel
}: PaymentProcessorProps) {
  const [paymentTab, setPaymentTab] = useState<'card' | 'ach'>('card');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // Mutation for processing card payments
  const cardPaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/payments/${paymentId}/update-status`,
        { status: 'completed', paymentIntentId }
      );
      if (!response.ok) {
        throw new Error('Failed to process payment');
      }
      return response.json();
    },
    onSuccess: () => {
      setPaymentStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: 'Payment successful',
        description: `Your payment to ${recipientName} has been processed.`,
      });
      if (onComplete) onComplete();
    },
    onError: (error: Error) => {
      setPaymentStatus('error');
      toast({
        title: 'Payment failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation for processing ACH payments
  const achPaymentMutation = useMutation({
    mutationFn: async (bankAccountId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/plaid/payments/${paymentId}/pay-via-ach`,
        { bankAccountId }
      );
      if (!response.ok) {
        throw new Error('Failed to process ACH payment');
      }
      return response.json();
    },
    onSuccess: () => {
      setPaymentStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: 'Payment initiated',
        description: `Your ACH payment to ${recipientName} has been initiated. It may take 1-3 business days to complete.`,
      });
      if (onComplete) onComplete();
    },
    onError: (error: Error) => {
      setPaymentStatus('error');
      toast({
        title: 'Payment failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Handle Stripe payment completion
  const handleStripePaymentComplete = (paymentIntentId: string) => {
    cardPaymentMutation.mutate(paymentIntentId);
  };

  // Process ACH payment
  const processAchPayment = () => {
    if (!selectedBankAccountId) {
      toast({
        title: 'Select a bank account',
        description: 'Please select a bank account to continue.',
        variant: 'destructive',
      });
      return;
    }

    setPaymentStatus('processing');
    achPaymentMutation.mutate(selectedBankAccountId);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const formatAmount = (amount: string) => {
    // Simple formatting - add commas and ensure 2 decimal places
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  // If payment is successful, show success message
  if (paymentStatus === 'success') {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Payment Successful</CardTitle>
          <CardDescription>
            {paymentTab === 'card' 
              ? 'Your payment has been processed.' 
              : 'Your payment has been initiated and will be processed within 1-3 business days.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg font-semibold">{formatAmount(amount)}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm text-muted-foreground">Recipient: {recipientName}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onComplete} className="w-full">
            Return to Payments
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
        <CardDescription>Pay {recipientName} for {description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-2xl font-bold text-center mb-2">{formatAmount(amount)}</p>
          <Separator className="my-4" />
        </div>

        <Tabs value={paymentTab} onValueChange={(value: string) => setPaymentTab(value as 'card' | 'ach')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card">
              <CreditCard className="h-4 w-4 mr-2" /> Credit Card
            </TabsTrigger>
            <TabsTrigger value="ach">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 8.5V5H5V19H19V15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Bank Account
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="card" className="mt-4">
            {/* Check if we have a valid public key */}
            {publicKey.startsWith('pk_') ? (
              <StripeElements
                amount={parseFloat(amount) * 100} // Convert to cents
                onPaymentComplete={handleStripePaymentComplete}
                isProcessing={paymentStatus === 'processing' || cardPaymentMutation.isPending}
              />
            ) : (
              <div className="p-6 border rounded-md bg-destructive/10 text-center">
                <h3 className="font-bold mb-2">Stripe Integration Error</h3>
                <p className="text-sm mb-4">
                  The Stripe publishable key is invalid or missing. 
                  Please provide a valid publishable key (starts with 'pk_').
                </p>
                <p className="text-xs text-muted-foreground">
                  For security reasons, credit card payments are disabled until a proper publishable key is provided.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ach" className="mt-4">
            <BankAccountSelector
              onAccountSelect={setSelectedBankAccountId}
              selectedAccountId={selectedBankAccountId}
              showAddButton={true}
            />
            
            <div className="mt-4">
              <Button 
                onClick={processAchPayment} 
                className="w-full" 
                disabled={!selectedBankAccountId || paymentStatus === 'processing' || achPaymentMutation.isPending}
              >
                {(paymentStatus === 'processing' || achPaymentMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay from Bank Account</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                ACH transfers typically take 1-3 business days to process.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleCancel} disabled={paymentStatus === 'processing'}>
          Cancel
        </Button>
        
        {paymentStatus === 'error' && (
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span className="text-sm">Payment failed. Please try again.</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default PaymentProcessor;
export { PaymentProcessor };