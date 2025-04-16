import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Validate and initialize Stripe with the public key
// Only initialize if the key starts with 'pk_' (publishable key)
const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
const isValidPublicKey = publicKey.startsWith('pk_');
const stripePromise = isValidPublicKey ? loadStripe(publicKey) : null;

interface StripeCheckoutFormProps {
  clientSecret: string;
  onPaymentComplete: (paymentIntentId: string) => void;
  isProcessing: boolean;
}

function StripeCheckoutForm({ clientSecret, onPaymentComplete, isProcessing }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

    // Confirm the payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      toast({
        title: 'Payment failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded - notify parent component
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
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isSubmitting || isProcessing}
      >
        {isSubmitting || isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay with Card'
        )}
      </Button>
    </form>
  );
}

interface StripeElementsProps {
  amount: number; // in cents
  onPaymentComplete: (paymentIntentId: string) => void;
  isProcessing?: boolean;
}

export function StripeElements({ amount, onPaymentComplete, isProcessing = false }: StripeElementsProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  // If we don't have a valid public key, show error message instead
  if (!isValidPublicKey) {
    return (
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
    );
  }

  // Mutation to create a payment intent
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        '/api/create-payment-intent',
        { amount }
      );
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Initialize payment intent when component mounts
  useEffect(() => {
    if (isValidPublicKey) {
      createPaymentIntentMutation.mutate();
    }
  }, []);

  if (!clientSecret || createPaymentIntentMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Initializing payment...</span>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripeCheckoutForm 
        clientSecret={clientSecret} 
        onPaymentComplete={onPaymentComplete}
        isProcessing={isProcessing}
      />
    </Elements>
  );
}