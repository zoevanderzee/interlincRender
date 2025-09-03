
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/utils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

function PaymentMethodSetup() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [setupIntentSecret, setSetupIntentSecret] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    initializeCustomer();
  }, []);

  const initializeCustomer = async () => {
    try {
      // Create Stripe customer for business
      const customerResponse = await apiRequest('POST', '/api/stripe-connect/business/create-customer');
      const customerResult = await customerResponse.json();
      
      if (customerResponse.ok) {
        setCustomerId(customerResult.customerId);
        
        // Create setup intent for adding payment method
        const setupResponse = await apiRequest('POST', '/api/stripe-connect/business/setup-payment');
        const setupResult = await setupResponse.json();
        
        if (setupResponse.ok) {
          setSetupIntentSecret(setupResult.clientSecret);
        }
      } else {
        throw new Error(customerResult.message);
      }
    } catch (error: any) {
      toast({
        title: 'Error initializing payment setup',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !setupIntentSecret) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(setupIntentSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Payment method added successfully',
        description: 'Your business can now make payments to contractors',
      });

      // Refresh page to show success state
      window.location.reload();

    } catch (error: any) {
      toast({
        title: 'Error adding payment method',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
        <CardDescription>
          Add a card or bank account to pay contractors automatically when you approve deliverables
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 border rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
          
          <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Payment Method...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Add Payment Method
              </>
            )}
          </Button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• When you approve a deliverable, we automatically charge this payment method</li>
            <li>• Funds go directly to the contractor's bank account (no platform fees)</li>
            <li>• Payments are processed securely by Stripe</li>
            <li>• You'll receive email confirmations for all transactions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BusinessPaymentSetup() {
  const [hasCustomer, setHasCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkCustomerStatus();
  }, []);

  const checkCustomerStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/user');
      const userData = await response.json();
      
      setHasCustomer(!!userData.stripeCustomerId);
    } catch (error) {
      console.error('Error checking customer status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Business Payment Setup</h1>
      
      <Elements stripe={stripePromise}>
        <PaymentMethodSetup />
      </Elements>
    </div>
  );
}
