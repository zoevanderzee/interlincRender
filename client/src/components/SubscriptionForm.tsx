import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

interface SubscriptionFormProps {
  userRole: 'business' | 'contractor';
  userEmail: string;
  userName: string;
  userId: number;
  onSubscriptionComplete: () => void;
}

const CheckoutForm = ({ 
  subscriptionId, 
  userId, 
  onComplete 
}: { 
  subscriptionId: string; 
  userId: number; 
  onComplete: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);

  useEffect(() => {
    if (!elements) return;

    // Listen for the payment element to be ready
    const paymentElement = elements.getElement('payment');
    if (paymentElement) {
      paymentElement.on('ready', () => {
        console.log('PaymentElement is ready');
        setIsElementReady(true);
      });
    }
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Error",
        description: "Payment system not ready. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if payment element is complete and valid
    const { error: submitError } = await elements.submit();
    if (submitError) {
      toast({
        title: "Payment Information Required",
        description: submitError.message || "Please complete the payment information.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Starting payment confirmation for subscription:', subscriptionId);

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Stripe payment confirmation error:', error);

        // Provide specific error messages for common payment issues
        let errorMessage = error.message;
        if (error.code === 'authentication_required') {
          errorMessage = "Your bank requires additional authentication. Please try a different card or contact your bank.";
        } else if (error.code === 'card_declined') {
          errorMessage = "Your card was declined. Please check your card details and try again, or use a different card.";
        } else if (error.code === 'insufficient_funds') {
          errorMessage = "Insufficient funds. Please use a different card or add funds to your account.";
        } else if (error.code === 'incorrect_cvc') {
          errorMessage = "The security code (CVC) is incorrect. Please check and try again.";
        } else if (error.code === 'expired_card') {
          errorMessage = "Your card has expired. Please use a different card.";
        } else if (error.code === 'generic_decline') {
          errorMessage = "Your card was declined. Please contact your bank for more information or use a different card.";
        }

        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      console.log('Payment confirmed successfully, completing subscription...');

      // Complete subscription on backend
      const completeResponse = await apiRequest("POST", "/api/complete-subscription", {
        subscriptionId,
        userId
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        console.error('Complete subscription error:', errorData);
        throw new Error(errorData.message || 'Failed to complete subscription');
      }

      console.log('Subscription completed successfully');

      toast({
        title: "Subscription Activated",
        description: "Welcome! Your subscription is now active.",
      });

      onComplete();

    } catch (error: any) {
      console.error('Subscription activation error:', error);
      toast({
        title: "Subscription Error", 
        description: error.message || "Failed to activate subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !isElementReady || isProcessing} 
        className="w-full"
      >
        {isProcessing ? "Processing..." : 
         !isElementReady ? "Loading..." : 
         "Complete Subscription"}
      </Button>
    </form>
  );
};

export default function SubscriptionForm({ 
  userRole, 
  userEmail, 
  userName, 
  userId, 
  onSubscriptionComplete 
}: SubscriptionFormProps) {
  // Debug logging to ensure role separation
  console.log('SubscriptionForm userRole:', userRole);

  // Validate role
  if (userRole !== 'business' && userRole !== 'contractor') {
    console.error('Invalid user role:', userRole);
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-red-500">Invalid User Role</h2>
        <p>Unable to display subscription plans. Please contact support.</p>
      </div>
    );
  }

  const [selectedPlan, setSelectedPlan] = useState<string>(userRole);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();

  // Define subscription plans function first - before using it
  const getSubscriptionPlans = (): SubscriptionPlan[] => [
    {
      id: "business",
      name: "SME",
      price: "Loading...",
      description: "Perfect for small to medium businesses",
      features: [
        "Up to 50 active contractors",
        "Project milestone tracking",
        "Automated milestone-based payments",
        "Budget and expense management",
        "Standard analytics & reporting",
        "24 hour email support"
      ]
    },
    {
      id: "business-annual",
      name: "SME Annual",
      price: "Loading...",
      description: "Save with annual billing for SME features",
      features: [
        "Everything in SME Monthly",
        "Annual billing saves money",
        "Priority support",
        "Extended data retention",
        "Advanced reporting"
      ]
    },
    {
      id: "business-enterprise",
      name: "Enterprise",
      price: "Loading...",
      description: "For large organizations with advanced needs",
      features: [
        "Unlimited contractors",
        "Unlimited workforce management",
        "Fast-track issue resolution with 24/7 availability",
        "Team access",
        "Scalable infrastructure built for enterprise workloads",
        "Everything in SME"
      ]
    },
    {
      id: "business-starter",
      name: "Enterprise Annual",
      price: "Loading...",
      description: "Annual enterprise plan with all features",
      features: [
        "Everything in Enterprise",
        "Annual billing saves money",
        "Dedicated account manager",
        "SLA guarantees",
        "Advanced security",
        "Custom workflows"
      ]
    }
  ];

  // Fetch real prices from Stripe
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('/api/subscription-prices');
        const priceData = await response.json();
        setPrices(priceData);
      } catch (error) {
        console.error('Error fetching prices:', error);
        toast({
          title: "Error",
          description: "Failed to load subscription prices",
          variant: "destructive",
        });
      } finally {
        setLoadingPrices(false);
      }
    };

    fetchPrices();
  }, [toast]);

  const handlePlanSelect = async (planId: string) => {
    try {
      const response = await apiRequest("POST", "/api/create-subscription", {
        planType: planId,
        email: userEmail,
        customerName: userName
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subscription');
      }

      setSubscriptionId(data.subscriptionId);
      setSelectedPlan(planId);

      // Check if this is a free subscription (no clientSecret)
      if (data.clientSecret) {
        // Paid subscription - show payment form
        setClientSecret(data.clientSecret);
        setShowPayment(true);
      } else {
        // Free subscription - complete immediately by calling complete subscription API
        try {
          const completeResponse = await apiRequest("POST", "/api/complete-subscription", {
            subscriptionId: data.subscriptionId,
            userId: userId
          });

          if (!completeResponse.ok) {
            throw new Error('Failed to activate free subscription');
          }

          toast({
            title: "Subscription Complete!",
            description: "Your free subscription has been activated.",
          });
          onSubscriptionComplete();
        } catch (completeError) {
          toast({
            title: "Activation Error",
            description: "Your subscription was created but could not be activated. Please contact support.",
            variant: "destructive",
          });
        }
      }

    } catch (error) {
      toast({
        title: "Subscription Error",
        description: error instanceof Error ? error.message : "Failed to create subscription",
        variant: "destructive",
      });
    }
  };

  const handleSubscriptionComplete = () => {
    setShowPayment(false);
    onSubscriptionComplete();
  };

  if (showPayment && clientSecret) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>
              {subscriptionPlans.find(p => p.id === selectedPlan)?.name} - {subscriptionPlans.find(p => p.id === selectedPlan)?.price}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                subscriptionId={subscriptionId}
                userId={userId}
                onComplete={handleSubscriptionComplete}
              />
            </Elements>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to format price
  const formatPrice = (planId: string) => {
    if (loadingPrices) return "Loading...";

    const priceData = prices[planId];
    if (!priceData) return "Price unavailable";

    const amount = priceData.amount / 100; // Convert cents to pounds
    const currency = priceData.currency.toUpperCase();
    const interval = priceData.interval;
    const intervalCount = priceData.interval_count || 1;

    // Only show "Free" for contractor base plan (explicitly free)
    if (amount === 0 && planId === 'contractor') {
      return "Free";
    }

    // Format currency symbol
    const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

    if (interval === 'month') {
      return `${currencySymbol}${amount.toFixed(2)}${intervalCount === 1 ? '/month' : `/${intervalCount} months`}`;
    } else if (interval === 'year') {
      return `${currencySymbol}${amount.toFixed(2)}${intervalCount === 1 ? '/year' : `/${intervalCount} years`}`;
    }

    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // Get subscription plans using the function defined earlier
  const subscriptionPlans = getSubscriptionPlans();

  // Filter plans based on user role, billing period, and update prices - STRICT SEPARATION
  const availablePlans = subscriptionPlans.filter(plan => {
    // Contractors can ONLY see contractor plans
    if (userRole === 'contractor') {
      return plan.id.startsWith('contractor');
    }
    // Business users can ONLY see business plans
    if (userRole === 'business') {
      const isAnnual = plan.id.includes('annual') || plan.id.includes('starter');
      if (billingPeriod === 'monthly') {
        return plan.id.startsWith('business') && !isAnnual;
      } else {
        return plan.id.startsWith('business') && isAnnual;
      }
    }
    // Fallback: no plans if role is unclear
    return false;
  }).map(plan => {
    return {
      ...plan,
      // Use hardcoded plan name - ignore Stripe product name
      price: formatPrice(plan.id)
    };
  }).filter(plan => {
    // Only filter out plans with completely missing price data
    const priceData = prices[plan.id];
    return priceData !== undefined;
  });

  // Debug logging for plan filtering
  console.log('Available plans for', userRole + ':', availablePlans.map(p => p.id));



  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
            {userRole === 'contractor' ? 'Contractor Plans' : 'Business Plans'}
          </h2>
          {userRole === 'business' && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl p-1.5 backdrop-blur-xl shadow-lg">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  billingPeriod === 'monthly'
                    ? 'bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/30'
                    : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative ${
                  billingPeriod === 'annual'
                    ? 'bg-gradient-to-r from-primary to-indigo-500 text-white shadow-lg shadow-primary/30'
                    : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Annual 
                <span className={`ml-1.5 text-xs px-2 py-0.5 rounded-full ${
                  billingPeriod === 'annual' 
                    ? 'bg-white/20' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  Save 17%
                </span>
              </button>
            </div>
          )}
        </div>
        <p className="text-lg text-blue-200/70 font-light max-w-2xl mx-auto">
          {userRole === 'contractor' 
            ? 'Unlock premium features and grow your freelance business' 
            : billingPeriod === 'monthly'
              ? 'Scale your team with powerful contractor management tools'
              : 'Get the best value with annual billing - all premium features included'
          }
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {availablePlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative cursor-pointer transition-all duration-300 backdrop-blur-xl border-2 ${
              selectedPlan === plan.id 
                ? 'ring-4 ring-primary/50 border-primary shadow-2xl shadow-primary/20 scale-[1.02]' 
                : 'border-white/10 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.01]'
            }`}
            style={{ 
              background: 'linear-gradient(135deg, rgba(107, 154, 255, 0.06) 0%, rgba(15, 26, 46, 1) 60%, rgba(15, 26, 46, 1) 100%)'
            }}
            onClick={() => setSelectedPlan(plan.id)}
          >
            
            {plan.recommended && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-indigo-500 text-white border-none font-bold shadow-lg shadow-primary/50 px-4 py-1.5">
                ✨ Most Popular
              </Badge>
            )}

            <CardHeader className="space-y-4 pb-6 pt-6">
              <CardTitle className="flex flex-col gap-3">
                <span className="text-2xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {plan.name}
                </span>
                <div className="relative">
                  <div className="flex flex-col items-start">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-primary via-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight break-words">
                      {plan.price.split('/')[0]}
                    </span>
                    {plan.price.includes('/') && (
                      <span className="text-sm text-blue-300/70 font-medium mt-1">
                        /{plan.price.split('/')[1]}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && (
                    <p className="text-sm text-blue-300/70 mt-3 font-medium">Billed annually • Save 17%</p>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-blue-200/70 min-h-[40px] font-light">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 pb-6 px-5">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start group">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 border border-primary/30">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-base leading-relaxed text-blue-100/90 font-light group-hover:text-white transition-colors">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full h-10 text-sm font-semibold transition-all duration-300 ${
                  selectedPlan === plan.id 
                    ? 'bg-gradient-to-r from-primary to-indigo-500 hover:from-primary/90 hover:to-indigo-500/90 shadow-xl shadow-primary/30' 
                    : 'bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 hover:border-primary/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan.id);
                }}
                variant={selectedPlan === plan.id ? "default" : "outline"}
              >
                {selectedPlan === plan.id ? "✓ Selected" : "Get Started →"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}