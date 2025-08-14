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
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const onboardingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  region: z.string().min(1, 'State/Province is required'),
  country: z.string().min(2, 'Country is required').default('US'),
  postalCode: z.string().min(1, 'Postal code is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  governmentId: z.string().optional()
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function PaymentSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get contractor status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/trolley/contractor-status'],
    staleTime: 30000
  });

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      region: '',
      country: 'US',
      postalCode: '',
      dateOfBirth: '',
      governmentId: ''
    }
  });

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const response = await apiRequest('POST', '/api/trolley/complete-onboarding', {
        firstName: data.firstName,
        lastName: data.lastName,
        address: {
          street1: data.street1,
          street2: data.street2,
          city: data.city,
          region: data.region,
          country: data.country,
          postalCode: data.postalCode
        },
        dateOfBirth: data.dateOfBirth,
        governmentId: data.governmentId
      });
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

  const onSubmit = (data: OnboardingFormData) => {
    onboardingMutation.mutate(data);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-blue-500" />
              Complete Payment Setup
            </CardTitle>
            <p className="text-muted-foreground">
              Provide your information to enable receiving payments for completed work.
              This information is securely processed and never shared.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
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
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
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
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="US" {...field} />
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
                  name="governmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Government ID (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SSN, TIN, etc." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={onboardingMutation.isPending}
                >
                  {onboardingMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up payment...
                    </>
                  ) : (
                    'Complete Payment Setup'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}