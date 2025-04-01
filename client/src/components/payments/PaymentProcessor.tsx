import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Payment } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Load Stripe outside of component to avoid recreating instance on renders
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentFormProps {
  clientSecret: string;
  paymentId: number;
  paymentDetails: {
    amount: string;
    description: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PaymentForm = ({ clientSecret, paymentId, paymentDetails, onSuccess, onCancel }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments?success=true&payment_id=${paymentId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An unexpected error occurred');
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully",
        });
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast({
        title: "Payment Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium mb-4">
          <div>Amount</div>
          <div className="text-lg font-bold">${parseFloat(paymentDetails.amount).toFixed(2)}</div>
        </div>
        
        <PaymentElement />
        
        {errorMessage && (
          <div className="text-sm text-red-500 mt-2">{errorMessage}</div>
        )}
      </div>
      
      <div className="flex gap-3 mt-6">
        <Button 
          variant="outline" 
          type="button" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing} 
          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
      </div>
    </form>
  );
};

interface PaymentProcessorProps {
  payment: Payment;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PaymentProcessor = ({ payment, onSuccess, onCancel }: PaymentProcessorProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('POST', `/api/payments/${payment.id}/create-intent`);
        const data = await response.json();
        
        if (response.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.message || 'Failed to initialize payment');
          toast({
            title: "Payment Initialization Failed",
            description: data.message || 'Could not initialize payment process',
            variant: "destructive",
          });
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        toast({
          title: "Payment Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [payment.id, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Payment Error</h3>
        <p className="text-red-600">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={onCancel}
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center p-6">
        <h3 className="text-lg font-medium mb-2">Unable to load payment</h3>
        <p className="text-gray-600">Could not initialize the payment process. Please try again later.</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={onCancel}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const paymentDetails = {
    amount: payment.amount,
    description: `Payment for Contract ID: ${payment.contractId}, Milestone ID: ${payment.milestoneId}`
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-black text-white border border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Payment</CardTitle>
        <CardDescription>
          Complete your payment for the milestone
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Elements 
          stripe={stripePromise} 
          options={{ 
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#6366f1',
                colorBackground: '#000000',
                colorText: '#ffffff',
                colorDanger: '#ef4444',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                borderRadius: '4px',
              }
            }
          }}
        >
          <PaymentForm 
            clientSecret={clientSecret} 
            paymentId={payment.id}
            paymentDetails={paymentDetails}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

export default PaymentProcessor;