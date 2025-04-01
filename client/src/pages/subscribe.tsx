import { useEffect, useState } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle, Info } from "lucide-react";
import { Loader2 } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
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
          return_url: window.location.origin + '/settings?subscription_success=true',
        },
      });

      if (error) {
        setErrorMessage(error.message || 'An unexpected error occurred');
        toast({
          title: "Subscription Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      toast({
        title: "Subscription Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
        
        {errorMessage && (
          <div className="text-sm text-red-500 mt-2">{errorMessage}</div>
        )}
      </div>
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Subscribe Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getSubscription = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('POST', '/api/get-or-create-subscription');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get subscription information');
        }
        
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
        toast({
          title: "Subscription Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    getSubscription();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
          <p className="text-lg">Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-black text-white border border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-red-500">Subscription Error</CardTitle>
            <CardDescription>
              We encountered an issue setting up your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/settings'}
            >
              Go Back to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-6">Subscribe to Premium Plan</h1>
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Unlimited Smart Contracts</h3>
                  <p className="text-gray-400">Create an unlimited number of smart contracts for all your business needs</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Priority Support</h3>
                  <p className="text-gray-400">Get priority access to our support team with 24/7 assistance</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Advanced Analytics</h3>
                  <p className="text-gray-400">Access detailed reports and insights about your contracts and payments</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Custom Integrations</h3>
                  <p className="text-gray-400">Connect with your existing tools and services for seamless workflow</p>
                </div>
              </div>
              
              <div className="flex items-center px-4 py-3 bg-indigo-900/30 rounded-lg mt-8">
                <Info className="h-5 w-5 text-indigo-400 mr-3" />
                <p className="text-sm text-indigo-300">Your subscription will be billed monthly and can be canceled anytime.</p>
              </div>
            </div>
          </div>
          
          <div>
            <Card className="bg-black text-white border border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center mb-2">
                  <CardTitle className="text-xl font-bold">Premium Plan</CardTitle>
                  <div className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full">Most Popular</div>
                </div>
                <CardDescription className="flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                  Secure payment processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$99</span>
                    <span className="text-gray-400 ml-2">/month</span>
                  </div>
                </div>
                
                {clientSecret ? (
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
                    <SubscribeForm />
                  </Elements>
                ) : (
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-800 pt-4">
                <div className="flex items-center text-sm text-gray-400">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Secured by Stripe - 256-bit encryption
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}