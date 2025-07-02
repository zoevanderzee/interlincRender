import { useState } from "react";
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
    id: "business",
    name: "Business Plan",
    price: "$49/month",
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
    id: "contractor",
    name: "Contractor Plan",
    price: "$19/month",
    description: "Essential tools for independent contractors",
    features: [
      "Profile management",
      "Work submissions",
      "Payment tracking",
      "Project collaboration",
      "Basic reporting",
      "Email support"
    ]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Complete subscription on backend
        await apiRequest("POST", "/api/complete-subscription", {
          subscriptionId,
          userId
        });

        toast({
          title: "Subscription Activated",
          description: "Welcome! Your subscription is now active.",
        });

        onComplete();
      }
    } catch (error) {
      toast({
        title: "Subscription Error",
        description: "Failed to activate subscription. Please try again.",
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
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? "Processing..." : "Complete Subscription"}
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
  const [selectedPlan, setSelectedPlan] = useState<string>(userRole);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [showPayment, setShowPayment] = useState(false);
  const { toast } = useToast();

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

      setClientSecret(data.clientSecret);
      setSubscriptionId(data.subscriptionId);
      setSelectedPlan(planId);
      setShowPayment(true);

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-gray-600">
          Select a subscription plan to start using Creativ Linc
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {subscriptionPlans.map((plan) => (
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