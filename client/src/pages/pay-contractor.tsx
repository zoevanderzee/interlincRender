import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, User, DollarSign, FileText, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface ContractorInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  stripeConnectAccountId?: string;
  country?: string;
  // Connect V2 data that includes country information
  connectAccountData?: {
    country?: string;
    defaultCurrency?: string;
  };
}

export default function PayContractor() {
  const [, navigate] = useLocation();
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [amount, setAmount] = useState('1.00');
  const [description, setDescription] = useState('Payment test');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get contractors list
  const { data: contractors = [] } = useQuery<ContractorInfo[]>({
    queryKey: ['/api/contractors'],
  });

  // Function to get currency based on country - using the same mapping as Connect V2
  const getCurrencyFromCountry = (countryCode?: string): string => {
    const currencyMap: { [key: string]: string } = {
      // Major currencies - matching Connect V2 implementation
      'US': 'usd', 'USA': 'usd',
      'GB': 'gbp', 'UK': 'gbp', 'United Kingdom': 'gbp',
      'CA': 'cad', 'Canada': 'cad',
      'AU': 'aud', 'Australia': 'aud',
      'NZ': 'nzd', 'New Zealand': 'nzd',
      // European Union
      'AT': 'eur', 'BE': 'eur', 'CY': 'eur', 'EE': 'eur', 'FI': 'eur', 'FR': 'eur',
      'DE': 'eur', 'GR': 'eur', 'IE': 'eur', 'IT': 'eur', 'LV': 'eur', 'LT': 'eur',
      'LU': 'eur', 'MT': 'eur', 'NL': 'eur', 'PT': 'eur', 'SK': 'eur', 'SI': 'eur',
      'ES': 'eur', 'European Union': 'eur', 'Europe': 'eur',
      // Other major currencies
      'CH': 'chf', 'Switzerland': 'chf',
      'JP': 'jpy', 'Japan': 'jpy',
      'KR': 'krw', 'South Korea': 'krw',
      'SG': 'sgd', 'Singapore': 'sgd',
      'HK': 'hkd', 'Hong Kong': 'hkd',
      'SE': 'sek', 'Sweden': 'sek',
      'NO': 'nok', 'Norway': 'nok',
      'DK': 'dkk', 'Denmark': 'dkk',
      'PL': 'pln', 'Poland': 'pln',
      'CZ': 'czk', 'Czech Republic': 'czk',
      'HU': 'huf', 'Hungary': 'huf',
      'IN': 'inr', 'India': 'inr',
      'BR': 'brl', 'Brazil': 'brl',
      'MX': 'mxn', 'Mexico': 'mxn'
    };

    if (!countryCode) return 'usd';

    // Try exact match first
    const exactMatch = currencyMap[countryCode];
    if (exactMatch) return exactMatch;

    // Try case-insensitive match
    const lowerCaseMatch = Object.keys(currencyMap).find(
      key => key.toLowerCase() === countryCode.toLowerCase()
    );
    if (lowerCaseMatch) return currencyMap[lowerCaseMatch];

    // Default fallback
    return 'usd';
  };

  // Get YOUR business Connect V2 status to determine currency (not contractor's)
  const { data: connectStatus } = useQuery({
    queryKey: ['/api/connect/v2/status'],
    queryFn: () => apiRequest('GET', '/api/connect/v2/status').then(res => res.json()),
  });

  // Get currency from YOUR business account (who is making the payment)
  const currency = (() => {
    console.log('=== CURRENCY DETERMINATION DEBUG ===');
    console.log('connectStatus:', connectStatus);
    console.log('connectStatus.defaultCurrency:', connectStatus?.defaultCurrency);
    console.log('connectStatus.country:', connectStatus?.country);

    // BULLETPROOF: First priority - YOUR Connect V2 status default currency
    if (connectStatus?.defaultCurrency && connectStatus.defaultCurrency.trim() !== '') {
      console.log(`✅ USING YOUR BUSINESS CURRENCY: ${connectStatus.defaultCurrency}`);
      return connectStatus.defaultCurrency.toLowerCase();
    }

    // BULLETPROOF: Second priority - YOUR Connect V2 status country
    if (connectStatus?.country && connectStatus.country.trim() !== '') {
      const connectCurrency = getCurrencyFromCountry(connectStatus.country);
      console.log(`✅ USING YOUR BUSINESS COUNTRY ${connectStatus.country} -> ${connectCurrency}`);
      return connectCurrency;
    }

    // Third priority: Check if account has Stripe data
    if (connectStatus?.stripeAccountData?.default_currency) {
      console.log(`✅ Using Stripe account currency: ${connectStatus.stripeAccountData.default_currency}`);
      return connectStatus.stripeAccountData.default_currency;
    }

    if (connectStatus?.stripeAccountData?.country) {
      const stripeCurrency = getCurrencyFromCountry(connectStatus.stripeAccountData.country);
      console.log(`✅ Using Stripe account country ${connectStatus.stripeAccountData.country} -> ${stripeCurrency}`);
      return stripeCurrency;
    }

    console.log('❌ FALLBACK: No business account data available, defaulting to GBP');
    return 'gbp';
  })();

  console.log(`=== FINAL CURRENCY SELECTED: ${currency.toUpperCase()} ===`);

  // Check for contractor ID in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contractorId = params.get('contractorId');

    if (contractorId && contractorId !== 'undefined') {
      setSelectedContractorId(contractorId);
      fetchContractorInfo(contractorId);
    }
  }, []);

  // Fetch contractor info when selection changes
  useEffect(() => {
    if (selectedContractorId && selectedContractorId !== 'undefined') {
      fetchContractorInfo(selectedContractorId);
    }
  }, [selectedContractorId]);

  const fetchContractorInfo = async (contractorId: string) => {
    try {
      const response = await apiRequest('GET', `/api/contractors/${contractorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contractor info');
      }
      const data = await response.json();
      setContractor(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching contractor:', err);
      setError(err.message);
      setContractor(null);
    }
  };

  const handleDirectPayment = async () => {
    if (!contractor) {
      toast({
        title: 'Error',
        description: 'Please select a contractor first.',
        variant: 'destructive'
      });
      return;
    }

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
        currency: currency, // Use dynamic currency
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
              <p className="text-2xl font-bold">{amount} {currency.toUpperCase()}</p>
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
              <DollarSign className="h-5 w-5" />
              Send Payment
            </CardTitle>
            <CardDescription>
              Send payment directly using Stripe Connect V2
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Contractor Selection */}
            <div className="space-y-2">
              <Label htmlFor="contractor" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Select Contractor *
              </Label>
              <Select 
                value={selectedContractorId} 
                onValueChange={(value) => {
                  setSelectedContractorId(value);
                  setError(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contractor..." />
                </SelectTrigger>
                <SelectContent>
                  {contractors.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No contractors available</p>
                      <Button 
                        size="sm" 
                        className="mt-2" 
                        onClick={() => navigate('/contractors')}
                      >
                        Add Contractors
                      </Button>
                    </div>
                  ) : (
                    contractors.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName} ({c.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Details */}
            {contractor && (
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
                    <p className="font-bold text-lg">{amount} {currency.toUpperCase()}</p>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="font-medium">{description}</p>
                </div>
              </div>
            )}

            {/* Payment Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount ({currency.toUpperCase()})
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
              disabled={isProcessing || !contractor || !contractor.stripeConnectAccountId}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Send Payment {amount} {currency.toUpperCase()}
                </>
              )}
            </Button>

            {contractor && !contractor.stripeConnectAccountId && (
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