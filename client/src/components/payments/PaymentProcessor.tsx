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
import { CheckCircle } from 'lucide-react';

// Load Stripe outside of component to avoid recreating instance on renders
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentFormProps {
  clientSecret: string;
  paymentId: number;
  paymentDetails: {
    amount: string;
    description: string;
  };
  isConnectPayment?: boolean;
  applicationFeePercentage?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PaymentForm = ({ 
  clientSecret, 
  paymentId, 
  paymentDetails, 
  isConnectPayment = false,
  applicationFeePercentage = 3.5, 
  onSuccess, 
  onCancel 
}: PaymentFormProps) => {
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

  // Calculate application fee if this is a Connect payment
  const amount = parseFloat(paymentDetails.amount);
  const applicationFee = isConnectPayment ? (amount * applicationFeePercentage / 100) : 0;
  const contractorAmount = isConnectPayment ? amount - applicationFee : 0;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm font-medium mb-4">
          <div>Amount</div>
          <div className="text-lg font-bold">${amount.toFixed(2)}</div>
        </div>
        
        {isConnectPayment && (
          <div className="p-3 rounded bg-zinc-900/50 border border-zinc-800 text-sm space-y-2 mb-4">
            <div className="flex justify-between text-gray-400">
              <span>Contractor receives</span>
              <span className="font-medium text-white">${contractorAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Platform fee ({applicationFeePercentage}%)</span>
              <span className="font-medium text-white">${applicationFee.toFixed(2)}</span>
            </div>
          </div>
        )}
        
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
  const [isConnectPayment, setIsConnectPayment] = useState(false);
  const [contractorName, setContractorName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchContractDetails = async () => {
      try {
        // Fetch contract to get contractor info
        const contractResponse = await apiRequest('GET', `/api/contracts/${payment.contractId}`);
        const contractData = await contractResponse.json();
        
        if (contractResponse.ok && contractData.contractorId) {
          // Fetch contractor details
          const contractorResponse = await apiRequest('GET', `/api/users/${contractData.contractorId}`);
          const contractorData = await contractorResponse.json();
          
          if (contractorResponse.ok) {
            setContractorName(
              contractorData.companyName || 
              `${contractorData.firstName} ${contractorData.lastName}`
            );
            
            // Check if contractor has Connect account
            const connectStatusResponse = await apiRequest('GET', `/api/contractors/${contractorData.id}/connect-status`);
            const connectStatusData = await connectStatusResponse.json();
            
            // Enable Connect payment if account is active
            if (connectStatusResponse.ok && connectStatusData.status === 'active') {
              setIsConnectPayment(true);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching contract details:', err);
      }
    };
    
    fetchContractDetails();
  }, [payment.contractId]);

  useEffect(() => {
    const fetchPaymentIntent = async () => {
      try {
        setLoading(true);
        
        // If contractor has Connect account, use the direct payment endpoint
        const endpoint = isConnectPayment
          ? `/api/payments/${payment.id}/pay-contractor`
          : `/api/payments/${payment.id}/create-intent`;
        
        const response = await apiRequest('POST', endpoint);
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

    // Only fetch payment intent when we know if it's a Connect payment or not
    if (payment.id) {
      fetchPaymentIntent();
    }
  }, [payment.id, toast, isConnectPayment]);

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
        <CardTitle className="text-xl font-bold">
          {isConnectPayment ? 'Direct Payment to Contractor' : 'Payment'}
        </CardTitle>
        <CardDescription>
          {isConnectPayment 
            ? `Payment will be sent directly to ${contractorName || 'the contractor'}`
            : 'Complete your payment for the milestone'}
        </CardDescription>
        {isConnectPayment && (
          <div className="mt-2 p-2 bg-indigo-900/30 border border-indigo-800 rounded text-xs">
            <p className="flex items-center text-indigo-300">
              <CheckCircle className="h-4 w-4 mr-1.5 text-indigo-400" />
              This contractor is set up for direct payments via Stripe Connect
            </p>
          </div>
        )}
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
            isConnectPayment={isConnectPayment}
            applicationFeePercentage={3.5}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </Elements>
      </CardContent>
    </Card>
  );
};

export default PaymentProcessor;