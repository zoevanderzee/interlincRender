import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { TROLLEY_COUNTRIES, US_STATES, BANK_ACCOUNT_TYPES, INDUSTRY_CATEGORIES, getBankCodeLabel, getCountryName } from '@shared/trolley-data';

const paymentSetupSchema = z.object({
  // Personal Information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  industry: z.string().min(1, 'Industry is required'),
  
  // Address Information
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  region: z.string().min(1, 'State/Province is required'),
  country: z.string().min(2, 'Country is required').default('US'),
  postalCode: z.string().min(1, 'Postal code is required'),
  
  // Bank Account Information (Optional)
  bankAccountNumber: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountType: z.enum(['checking', 'savings']).optional(),
  
  // PayPal Information (Optional)
  paypalEmail: z.string().email('Valid email required').optional().or(z.literal(''))
});

type PaymentSetupFormData = z.infer<typeof paymentSetupSchema>;

export default function PaymentSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBankForm, setShowBankForm] = useState(false);
  const [showPayPalForm, setShowPayPalForm] = useState(false);
  const [recipientIdInput, setRecipientIdInput] = useState('');

  // Get contractor status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/trolley/contractor-status'],
    staleTime: 30000
  });

  const form = useForm<PaymentSetupFormData>({
    resolver: zodResolver(paymentSetupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      dateOfBirth: '',
      industry: '',
      street1: '',
      street2: '',
      city: '',
      region: '',
      country: 'US',
      postalCode: '',
      bankAccountNumber: '',
      bankRoutingNumber: '',
      bankName: '',
      bankAccountType: 'checking',
      paypalEmail: ''
    }
  });

  // Watch country selection to update bank code label
  const selectedCountry = form.watch('country');
  
  // Debug logging
  console.log('Current selected country:', selectedCountry);

  // Manual sync existing Trolley account mutation
  const manualSyncMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await apiRequest('POST', '/api/trolley/sync-existing', { recipientId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Account Linked!",
        description: data.message || "Trolley account successfully linked"
      });
      setRecipientIdInput(''); // Clear the input
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/contractor-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Link Failed",
        description: error.message || "Failed to link Trolley account",
        variant: "destructive"
      });
    }
  });

  const paymentSetupMutation = useMutation({
    mutationFn: async (data: PaymentSetupFormData) => {
      const requestData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        dateOfBirth: data.dateOfBirth,
        address: {
          street1: data.street1,
          street2: data.street2,
          city: data.city,
          region: data.region,
          country: data.country,
          postalCode: data.postalCode
        }
      };

      // Add industry
      if (data.industry) {
        requestData.industry = data.industry;
      }

      // Add bank account if provided
      if (data.bankAccountNumber && data.bankRoutingNumber) {
        requestData.bankAccount = {
          accountNumber: data.bankAccountNumber,
          routingNumber: data.bankRoutingNumber,
          bankName: data.bankName || 'User Bank',
          accountType: data.bankAccountType || 'checking'
        };
      }

      // Add PayPal if provided
      if (data.paypalEmail) {
        requestData.paypalEmail = data.paypalEmail;
      }

      const response = await apiRequest('POST', '/api/trolley/submit-payment-setup', requestData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Setup Complete",
        description: data.message || "Your payment information has been configured successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trolley/contractor-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete payment setup. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: PaymentSetupFormData) => {
    paymentSetupMutation.mutate(data);
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If already setup, show success state
  if ((status as any)?.payoutEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-semibold">Payment Setup Complete</h2>
              <p className="text-muted-foreground">
                Your payment information is configured and ready to receive payments.
              </p>
              <p className="text-sm text-muted-foreground">
                Recipient ID: {(status as any)?.recipientId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Sync existing account option */}
        <Card className="mb-6 border-dashed border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Already have a Trolley account?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  If you already have a Trolley recipient account, enter your Recipient ID below to link it:
                </p>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="R-1234567890 (your Trolley recipient ID)"
                    value={recipientIdInput}
                    onChange={(e) => setRecipientIdInput(e.target.value)}
                    className="flex-1 border-blue-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (recipientIdInput.trim()) {
                        manualSyncMutation.mutate(recipientIdInput.trim());
                      }
                    }}
                    disabled={manualSyncMutation.isPending || !recipientIdInput.trim()}
                    className="border-blue-200 text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                  >
                    {manualSyncMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      'Link Account'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Find your Recipient ID in your Trolley dashboard under "My Profile" or "Account Settings"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">1</span>
                  Personal Information
                </CardTitle>
                <p className="text-muted-foreground">
                  Your personal details for payment processing
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRY_CATEGORIES.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment, Suite, etc. (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {TROLLEY_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. New York, London, Tokyo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province/Region</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. NY, Ontario, Tokyo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal/ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 10001, M5V 3A8, 100-0001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payout Methods Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-3">2</span>
                  Payout Methods
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add at least one payout method to receive payments
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bank Account Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Bank Account (Recommended)</h3>
                    <Button 
                      type="button" 
                      variant={showBankForm ? "default" : "outline"} 
                      onClick={() => setShowBankForm(!showBankForm)}
                      className="text-sm"
                    >
                      {showBankForm ? "Hide" : "Add Bank Account"}
                    </Button>
                  </div>
                  {showBankForm && (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankRoutingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{getBankCodeLabel(selectedCountry || 'US')} {selectedCountry && `(${selectedCountry})`}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={
                                selectedCountry === 'US' ? '021000021' :
                                selectedCountry === 'GB' ? '12-34-56' :
                                selectedCountry === 'CA' ? '001' :
                                selectedCountry === 'AU' ? '123-456' :
                                selectedCountry === 'DE' ? '12345678' :
                                selectedCountry === 'FR' ? '20041' :
                                selectedCountry === 'JP' ? '0001' :
                                selectedCountry === 'IN' ? 'ABCD0123456' :
                                'Bank routing code'
                              } 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Chase Bank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankAccountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BANK_ACCOUNT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  </>
                  )}
                </div>

                {/* PayPal Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">PayPal (Alternative)</h3>
                    <Button 
                      type="button" 
                      variant={showPayPalForm ? "default" : "outline"} 
                      onClick={() => setShowPayPalForm(!showPayPalForm)}
                      className="text-sm"
                    >
                      {showPayPalForm ? "Hide" : "Add PayPal"}
                    </Button>
                  </div>
                  {showPayPalForm && (
                  <FormField
                    control={form.control}
                    name="paypalEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PayPal Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Payment Method Required</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        You need to provide at least one payout method (bank account or PayPal) to receive payments.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={paymentSetupMutation.isPending}
                >
                  {paymentSetupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up payment...
                    </>
                  ) : (
                    'Complete Payment Setup'
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}