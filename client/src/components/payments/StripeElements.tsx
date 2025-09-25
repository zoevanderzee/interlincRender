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
console.log('Stripe public key in component:', publicKey);
console.log('Starts with pk_test_:', publicKey.startsWith('pk_test_'));
console.log('Starts with pk_live_:', publicKey.startsWith('pk_live_'));
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
  const [isElementsReady, setIsElementsReady] = useState(false);
  const { toast } = useToast();
  
  // Check if elements are ready
  useEffect(() => {
    const checkElements = async () => {
      if (elements) {
        // Wait for elements to be fully loaded
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

    // Make sure elements are properly mounted before calling confirmPayment
    // Wait a bit to ensure elements are fully mounted
    await new Promise(resolve => setTimeout(resolve, 100));

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
        disabled={!stripe || !isElementsReady || isSubmitting || isProcessing}
      >
        {isSubmitting || isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
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

interface SavedCard {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: number;
}

interface StripeElementsProps {
  amount: number; // in cents
  onPaymentComplete: (paymentIntentId: string) => void;
  isProcessing?: boolean;
  contractorUserId?: number;
  currency?: string;
  description?: string;
  showSavedCards?: boolean;
}

export function StripeElements({ amount, onPaymentComplete, isProcessing = false, contractorUserId, currency = 'gbp', description, showSavedCards = true }: StripeElementsProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(true);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
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

  // Load saved cards for business users
  const loadSavedCards = async () => {
    if (!showSavedCards) return;
    
    try {
      setLoadingSavedCards(true);
      const response = await apiRequest('GET', '/api/connect/v2/saved-cards');
      if (response.ok) {
        const data = await response.json();
        setSavedCards(data.savedCards || []);
      }
    } catch (error) {
      console.error('Failed to load saved cards:', error);
    } finally {
      setLoadingSavedCards(false);
    }
  };

  // Mutation to create a payment intent with V2 destination charge
  const createPaymentIntentMutation = useMutation({
    mutationFn: async () => {
      if (contractorUserId) {
        // Use V2 destination charges for contractor payments
        const requestBody: any = { 
          contractorUserId,
          amount: amount / 100, // Convert back to dollars
          currency,
          description,
          saveCard: true // Enable card saving by default
        };

        // If using a saved card, include the payment method ID
        if (!useNewCard && selectedCardId) {
          requestBody.paymentMethodId = selectedCardId;
        }

        const response = await apiRequest(
          'POST',
          '/api/connect/v2/create-transfer',
          requestBody
        );
        if (!response.ok) {
          throw new Error('Failed to create destination charge');
        }
        return response.json();
      } else {
        // Fallback to regular payment intent
        const response = await apiRequest(
          'POST',
          '/api/create-payment-intent',
          { amount }
        );
        if (!response.ok) {
          throw new Error('Failed to create payment intent');
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

  // Initialize payment intent and load saved cards when component mounts
  useEffect(() => {
    if (isValidPublicKey) {
      loadSavedCards();
      createPaymentIntentMutation.mutate();
    }
  }, []);

  // Recreate payment intent when payment method selection changes
  useEffect(() => {
    if (clientSecret && !useNewCard && selectedCardId) {
      // For saved cards, we might need to recreate the payment intent
      // depending on the implementation
      createPaymentIntentMutation.mutate();
    }
  }, [useNewCard, selectedCardId]);

  if (!clientSecret || createPaymentIntentMutation.isPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Initializing payment...</span>
      </div>
    );
  }

  // Configure Stripe Elements options
  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
    },
    // Use simpler options that are compatible with all versions of Stripe Elements
    loader: 'always' as const,
  };

  return (
    <div className="space-y-6">
      {/* Saved Cards Section */}
      {showSavedCards && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Payment Method</h3>
          
          {loadingSavedCards ? (
            <div className="flex items-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading saved cards...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {savedCards.length > 0 && (
                <div className="space-y-2">
                  {savedCards.map((card) => (
                    <label key={card.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={!useNewCard && selectedCardId === card.id}
                        onChange={() => {
                          setUseNewCard(false);
                          setSelectedCardId(card.id);
                        }}
                        className="text-primary"
                      />
                      <div className="flex-1 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {card.card.brand.toUpperCase()} •••• {card.card.last4}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {card.card.exp_month}/{card.card.exp_year}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={useNewCard}
                  onChange={() => {
                    setUseNewCard(true);
                    setSelectedCardId(null);
                  }}
                  className="text-primary"
                />
                <span>{savedCards.length > 0 ? 'Use a new card' : 'Add payment method'}</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Payment Form - only show if using new card or no saved cards UI */}
      {(useNewCard || !showSavedCards) && (
        <Elements stripe={stripePromise} options={options}>
          <StripeCheckoutForm 
            clientSecret={clientSecret} 
            onPaymentComplete={onPaymentComplete}
            isProcessing={isProcessing}
          />
        </Elements>
      )}

      {/* Direct charge button for saved cards */}
      {!useNewCard && selectedCardId && (
        <div className="pt-4">
          <Button 
            onClick={async () => {
              // Handle saved card payment directly
              try {
                const response = await apiRequest('POST', '/api/connect/v2/charge-saved-card', {
                  paymentMethodId: selectedCardId,
                  contractorUserId,
                  amount: amount / 100,
                  currency,
                  description
                });
                
                if (response.ok) {
                  const result = await response.json();
                  onPaymentComplete(result.payment_intent_id);
                } else {
                  throw new Error('Payment failed');
                }
              } catch (error) {
                toast({
                  title: 'Payment failed',
                  description: 'There was an error processing your payment.',
                  variant: 'destructive',
                });
              }
            }}
            className="w-full"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: currency.toUpperCase()
              }).format(amount / 100)}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}