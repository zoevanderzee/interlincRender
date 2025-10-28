import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

// Validate and initialize Stripe with the public key
const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const isValidPublicKey = publicKey.startsWith('pk_');
const stripePromise = isValidPublicKey ? loadStripe(publicKey) : null;

interface StripeCheckoutFormProps {
  clientSecret: string;
  onPaymentComplete: (paymentIntentId: string) => void;
  isProcessing: boolean;
  showSaveCard?: boolean;
}

function StripeCheckoutForm({ clientSecret, onPaymentComplete, isProcessing, showSaveCard = false }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isElementsReady, setIsElementsReady] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const checkElements = async () => {
      if (elements) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsElementsReady(true);
      }
    };
    
    checkElements();
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: 'Error',
        description: 'Stripe has not been properly initialized.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        setup_future_usage: showSaveCard && saveCard ? 'off_session' : undefined,
      },
    });

    if (error) {
      toast({
        title: 'Payment failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onPaymentComplete(paymentIntent.id);
    } else {
      toast({
        title: 'Payment failed',
        description: 'The payment was not completed successfully.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      
      {/* Save Card Option */}
      {showSaveCard && (
        <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm text-white">Save card for future payments</span>
          </label>
          <p className="text-xs text-gray-400 mt-1 ml-6">
            Your card will be securely stored for faster checkout next time
          </p>
        </div>
      )}
      
      {/* Connect-Only Security Notice */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Secure Connect Payment</p>
            <p className="text-blue-700">Card details are processed securely and never stored</p>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !isElementsReady || isSubmitting || isProcessing}
      >
        {isSubmitting || isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : !isElementsReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading payment form...
          </>
        ) : (
          'Pay with Card'
        )}
      </Button>
    </form>
  );
}

interface StripeElementsProps {
  clientSecret?: string; // Optional: if provided, skip payment intent creation
  amount?: number; // in cents (only needed if clientSecret not provided)
  contractorUserId?: number;
  currency?: string;
  onPaymentComplete: (paymentIntentId: string) => void;
  isProcessing?: boolean;
  description?: string;
  showSaveCard?: boolean;
}

export function StripeElements({ 
  clientSecret: providedClientSecret,
  amount, 
  onPaymentComplete, 
  isProcessing = false, 
  contractorUserId, 
  currency = 'gbp', 
  description,
  showSaveCard = false
}: StripeElementsProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(providedClientSecret || null);
  const { toast } = useToast();

  // If we don't have a valid public key, show error message
  if (!isValidPublicKey) {
    return (
      <div className="p-6 border rounded-md bg-destructive/10 text-center">
        <h2 className="text-lg font-semibold text-destructive mb-2">Payment System Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          The Stripe publishable key is invalid or missing. 
          Please provide a valid publishable key (starts with 'pk_').
        </p>
        <p className="text-xs text-muted-foreground">
          For security reasons, credit card payments are disabled until a proper publishable key is provided.
        </p>
      </div>
    );
  }

  // Mutation to create a payment intent with Connect destination charges
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      if (contractorUserId) {
        // Use V2 destination charges for contractor payments
        const requestBody = { 
          contractorUserId,
          amount: amount / 100, // Convert back to dollars
          currency,
          description
        };

        const response = await apiRequest(
          'POST',
          '/api/connect/v2/create-transfer',
          requestBody
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create destination charge');
        }
        return response.json();
      } else {
        // Fallback to regular payment intent
        const response = await apiRequest(
          'POST',
          '/api/create-payment-intent',
          { 
            amount: amount / 100,
            currency,
            description
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }
        return response.json();
      }
    },
    onSuccess: (data) => {
      setClientSecret(data.client_secret || data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Initialize payment intent when component mounts (only if clientSecret not provided)
  useEffect(() => {
    if (isValidPublicKey && !providedClientSecret && amount) {
      createPaymentIntentMutation.mutate();
    }
  }, [providedClientSecret, amount]);

  if (!clientSecret || createPaymentIntentMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Initializing secure payment...</span>
      </div>
    );
  }

  // Configure Stripe Elements options
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
    loader: 'always' as const,
  };

  return (
    <div className="space-y-4">
      {/* Connect-Only Mode Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Secure Payment</h3>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <Shield className="w-3 h-3 mr-1" />
          Connect Protected
        </Badge>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <StripeCheckoutForm 
          clientSecret={clientSecret}
          onPaymentComplete={onPaymentComplete}
          isProcessing={isProcessing || createPaymentIntentMutation.isPending}
          showSaveCard={showSaveCard}
        />
      </Elements>
    </div>
  );
}