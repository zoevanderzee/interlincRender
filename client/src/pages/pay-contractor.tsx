import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, CreditCard, User, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface ContractorInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  stripeConnectAccountId?: string;
}

export default function PayContractor() {
  const [, navigate] = useLocation();
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [amount, setAmount] = useState('1.00');
  const [description, setDescription] = useState('Payment test');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get contractor ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contractorId = params.get('contractorId');

    if (contractorId) {
      fetchContractorInfo(contractorId);
    } else {
      setError('No contractor specified');
    }
  }, []);

  const fetchContractorInfo = async (contractorId: string) => {
    try {
      const response = await apiRequest('GET', `/api/contractors/${contractorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contractor info');
      }
      const data = await response.json();
      setContractor(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDirectPayment = async () => {
    if (!contractor) return;

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      console.log('Creating V2 Connect direct payment:', {
        contractorId: contractor.id,
        amount: parseFloat(amount),
        description
      });

      // Create direct transfer using V2 Connect
      const response = await apiRequest('POST', '/api/connect/v2/create-transfer', {
        destination: contractor.stripeConnectAccountId,
        amount: parseFloat(amount),
        currency: 'usd',
        description,
        metadata: {
          contractorId: contractor.id.toString(),
          paymentType: 'direct_payment'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const result = await response.json();

      console.log('Direct payment successful:', result);

      setPaymentSuccess(true);
      toast({
        title: 'Payment Successful',
        description: `$${amount} has been sent to ${contractor.firstName} ${contractor.lastName}`,
      });

    } catch (err: any) {
      console.error('Direct payment failed:', err);
      setError(err.message);
      toast({
        title: 'Payment Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (error && !contractor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => navigate('/contractors')} variant="outline" className="w-full">
              Back to Contractors
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
            <CardTitle>Payment Successful</CardTitle>
            <CardDescription>
              Payment has been sent successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl font-bold">${amount}</p>
              <p className="text-muted-foreground">
                Sent to {contractor?.firstName} {contractor?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="flex-1"
              >
                Make Another Payment
              </Button>
              <Button 
                onClick={() => navigate('/contractors')} 
                className="flex-1"
              >
                Back to Contractors
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading contractor information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto">
        <Button 
          onClick={() => navigate('/contractors')} 
          variant="ghost" 
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </CardTitle>
            <CardDescription>
              Send payment directly using Stripe Connect V2
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Payment Details
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Paying:</span>
                  <p className="font-medium">
                    {contractor.firstName} {contractor.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-bold text-lg">${amount}</p>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium">{description}</p>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Amount (USD)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description..."
                  rows={3}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleDirectPayment}
              disabled={isProcessing || !contractor.stripeConnectAccountId}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirm Payment ${amount}
                </>
              )}
            </Button>

            {!contractor.stripeConnectAccountId && (
              <div className="text-center text-sm text-muted-foreground">
                This contractor hasn't set up their payment account yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}