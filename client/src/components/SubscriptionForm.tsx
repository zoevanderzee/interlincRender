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

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "business-starter",
    name: "Test Plan",
    price: "Loading...",
    description: "Try the platform with full features at a minimal cost",
    features: [
      "Full platform access",
      "Test all features",
      "Perfect for evaluation",
      "Upgrade anytime",
      "Email support"
    ]
  },
  {
    id: "business",
    name: "Standard",
    price: "Loading...",
    description: "Perfect for businesses managing contractors and projects",
    features: [
      "Unlimited contractor management",
      "Project milestone tracking",
      "Automated payments",
      "Budget management",
      "Data room access",
      "Advanced reporting",
      "Priority support"
    ],
    recommended: true
  },
  {
    id: "business-enterprise",
    name: "Enterprise",
    price: "Loading...",
    description: "Advanced features for large businesses with complex needs",
    features: [
      "Everything in Standard Plan",
      "White-label options",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced analytics",
      "SLA guarantees",
      "24/7 phone support"
    ]
  },
  {
    id: "business-annual",
    name: "Business Annual",
    price: "Loading...",
    description: "Get the full Standard Plan features with annual billing",
    features: [
      "Everything in Standard Plan",
      "Annual billing discount",
      "Priority support",
      "Extended data retention",
      "Advanced reporting"
    ]
  },
  {
    id: "contractor",
    name: "Contractor Basic",
    price: "Loading...",
    description: "Essential tools for independent contractors",
    features: [
      "Profile management",
      "Work submissions",
      "Payment tracking",
      "Project collaboration",
      "Basic reporting",
      "Email support"
    ]
  },
  {
    id: "contractor-pro",
    name: "Contractor Pro",
    price: "Loading...",
    description: "Advanced tools for professional contractors",
    features: [
      "Everything in Basic Plan",
      "Advanced analytics",
      "Priority support",
      "Custom invoicing",
      "Extended file storage",
      "API access",
      "White-label options"
    ],
    recommended: true
  }
];

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
  const { toast } = useToast();

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

  // Filter plans based on user role and update prices - STRICT SEPARATION
  const availablePlans = subscriptionPlans.filter(plan => {
    // Contractors can ONLY see contractor plans
    if (userRole === 'contractor') {
      return plan.id.startsWith('contractor');
    }
    // Business users can ONLY see business plans
    if (userRole === 'business') {
      return plan.id.startsWith('business');
    }
    // Fallback: no plans if role is unclear
    return false;
  }).map(plan => ({
    ...plan,
    price: formatPrice(plan.id)
  })).filter(plan => {
    // Only filter out plans with completely missing price data
    const priceData = prices[plan.id];
    return priceData !== undefined;
  });

  // Debug logging for plan filtering
  console.log('Available plans for', userRole + ':', availablePlans.map(p => p.id));



  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">
          {userRole === 'contractor' ? 'Contractor Subscription Plans' : 'Business Subscription Plans'}
        </h2>
        <p className="text-gray-600">
          {userRole === 'contractor' 
            ? 'Choose your contractor plan to access the platform' 
            : 'Choose your business plan to manage contractors and projects'
          }
        </p>
      </div>

      <div className={`${
        userRole === 'contractor' 
          ? 'grid md:grid-cols-2 gap-6 max-w-4xl' 
          : 'grid md:grid-cols-3 gap-6 max-w-5xl'
      } mx-auto`}>
        {availablePlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              selectedPlan === plan.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.recommended && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Recommended
              </Badge>
            )}
            
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                <span className="text-2xl font-bold text-blue-600">
                  {plan.price}
                </span>
              </CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full mt-6"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlanSelect(plan.id);
                }}
                variant={selectedPlan === plan.id ? "default" : "outline"}
              >
                {selectedPlan === plan.id ? "Selected" : "Choose Plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}