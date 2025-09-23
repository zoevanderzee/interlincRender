import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, CreditCard, User, DollarSign, Calendar } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Load Stripe
const publicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
if (!publicKey || !publicKey.startsWith('pk_')) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(publicKey);

interface Contractor {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  profileCode: string;
  stripeConnectAccountId?: string;
}

interface PaymentFormData {
  contractorId: number;
  amount: string;
  description: string;
  dueDate: string;
}

function PaymentForm({ 
  contractor, 
  amount, 
  description, 
  clientSecret, 
  onSuccess 
}: {
  contractor: Contractor;
  amount: string;
  description: string;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Summary */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Paying:</span>
            <span>{contractor.firstName} {contractor.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Amount:</span>
            <span className="text-lg font-bold">{formatAmount(amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Description:</span>
            <span className="text-sm text-muted-foreground max-w-48 text-right">{description}</span>
          </div>
        </div>

        {/* Stripe Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? "Processing..." : `Pay ${formatAmount(amount)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PayContractor() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [match] = useRoute('/pay-contractor/:contractorId?');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const contractorId = match && typeof match === 'object' && 'contractorId' in match && match.contractorId
    ? parseInt(match.contractorId as string) 
    : null;

  const [formData, setFormData] = useState<PaymentFormData>({
    contractorId: contractorId || 0,
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0]
  });

  const [clientSecret, setClientSecret] = useState<string>('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Fetch contractors
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/users', { role: 'contractor' }]
  });

  // Get selected contractor
  const selectedContractor = contractors.find(c => c.id === formData.contractorId);

  // Create payment intent mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      console.log('[Pay Contractor] Creating payment intent:', data);

      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id.toString() || ''
        },
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          description: data.description,
          contractorId: data.contractorId,
          connectedAccountId: selectedContractor?.stripeConnectAccountId,
          // Ensure currency is set to GBP for UK accounts
          currency: 'gbp' 
        })
      });

      const responseData = await response.json();
      console.log('[Pay Contractor] Payment intent response:', responseData);

      if (!response.ok) {
        // Throw with the specific error from server
        throw new Error(responseData.error || 'Failed to create payment intent');
      }

      return responseData;
    },
    onSuccess: (data) => {
      console.log('[Pay Contractor] Payment intent created successfully');
      setClientSecret(data.clientSecret);
      setShowPaymentForm(true);
    },
    onError: (error: Error) => {
      console.error('[Pay Contractor] Payment intent creation failed:', error);

      // Show specific error message from server
      const errorMessage = error.message || "Failed to initialize payment. Please try again.";

      toast({
        title: "Payment Setup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contractorId || !formData.amount || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const numericAmount = parseFloat(formData.amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive"
      });
      return;
    }

    // Validate for GBP minimum amount
    if (numericAmount < 0.50) {
      toast({
        title: "Amount Too Small",
        description: "Minimum payment amount is £0.50",
        variant: "destructive"
      });
      return;
    }

    // Validate contractor has Connect account
    if (!selectedContractor?.stripeConnectAccountId) {
      toast({
        title: "Payment Setup Required",
        description: "This contractor needs to complete their payment account setup before receiving payments.",
        variant: "destructive"
      });
      return;
    }

    console.log('[Pay Contractor] Submitting payment:', {
      contractor: selectedContractor?.firstName + ' ' + selectedContractor?.lastName,
      amount: formData.amount,
      hasConnectAccount: !!selectedContractor?.stripeConnectAccountId
    });

    createPaymentMutation.mutate(formData);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful",
      description: `Payment of £${formData.amount} sent to ${selectedContractor?.firstName} ${selectedContractor?.lastName}`,
    });
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    navigate('/payments');
  };

  // If we have a client secret, show the Stripe payment form
  if (showPaymentForm && clientSecret && selectedContractor) {
    return (
      <div className="container py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPaymentForm(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Complete Payment</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Paying:</span>
                <span>{selectedContractor.firstName} {selectedContractor.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Amount:</span>
                <span className="text-lg font-bold">£{formData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Description:</span>
                <span className="text-sm text-muted-foreground max-w-48 text-right">{formData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due Date:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(formData.dueDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Payment Method:</span>
                <span className="text-sm text-muted-foreground">Business Account (Approved)</span>
              </div>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CreditCard className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Your business account is verified and ready for payments. 
                    Stripe will process this payment and handle all transaction fees automatically.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePaymentSuccess} 
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Confirm Payment of £{formData.amount}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/payments')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>
        <h1 className="text-2xl font-bold">Pay Contractor</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contractor Selection */}
            <div className="space-y-2">
              <Label htmlFor="contractor">Select Contractor</Label>
              <Select 
                value={formData.contractorId.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, contractorId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {contractor.firstName} {contractor.lastName} ({contractor.profileCode})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.50"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  className="pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-sm text-muted-foreground">GBP</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum amount: £0.50
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Payment Description</Label>
              <Textarea
                id="description"
                placeholder="What is this payment for?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Payment Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dueDate"
                  type="date"
                  className="pl-10"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? "Preparing Payment..." : "Continue to Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}