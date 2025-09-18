
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle, AlertCircle, Settings, CreditCard, Zap, Shield, Globe, Building, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';

interface ConnectStatusV2 {
  hasAccount: boolean;
  accountId?: string;
  needsOnboarding: boolean;
  version: string;
  capabilities?: {
    card_payments: string;
    transfers: string;
    enhanced_onboarding: boolean;
    real_time_status: boolean;
    embedded_management: boolean;
  };
  payment_methods?: {
    card: boolean;
    ach: boolean;
    international: boolean;
  };
  requirements?: {
    currently_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string | null;
  };
}

interface OnboardingForm {
  business_type: 'individual' | 'company';
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  address_line1?: string;
  address_city?: string;
  address_postal_code?: string;
  address_country?: string;
  tos_acceptance?: boolean;
}

export default function InterlincConnect() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatusV2 | null>(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>({
    business_type: 'company',
    address_country: 'GB'
  });
  const [submitting, setSubmitting] = useState(false);

  // Check V2 status and enable payments if verified
  const checkStatus = async () => {
    try {
      console.log('Checking Interlinc Connect V2 status...');
      const response = await apiRequest('GET', '/api/connect/v2/status');
      const data = await response.json();

      console.log('Real Stripe Account Data from V2 API:', JSON.stringify(data, null, 2));
      
      // Log specific payment capabilities
      if (data.capabilities) {
        console.log('Payment Capabilities:');
        console.log('- Card Payments:', data.capabilities.card_payments);
        console.log('- ACH Transfers:', data.capabilities.us_bank_account_ach_payments);
        console.log('- International/SEPA:', data.capabilities.sepa_debit_payments);
        console.log('- Transfers:', data.capabilities.transfers);
      }

      // Log verification status
      if (data.verification_status) {
        console.log('Verification Status:');
        console.log('- Details Submitted:', data.verification_status.details_submitted);
        console.log('- Charges Enabled:', data.verification_status.charges_enabled);
        console.log('- Payouts Enabled:', data.verification_status.payouts_enabled);
      }

      // Log requirements if any
      if (data.requirements) {
        console.log('Outstanding Requirements:');
        console.log('- Currently Due:', data.requirements.currently_due);
        console.log('- Past Due:', data.requirements.past_due);
        console.log('- Pending Verification:', data.requirements.pending_verification);
        if (data.requirements.disabled_reason) {
          console.log('- Disabled Reason:', data.requirements.disabled_reason);
        }
      }
      
      // If account is verified and charges enabled, enable payments
      if (data.hasAccount && data.chargesEnabled && !data.paymentsEnabled) {
        console.log('Account is verified and charges enabled. Enabling payments...');
        try {
          const enableResponse = await apiRequest('POST', '/api/connect/v2/enable-payments');
          if (enableResponse.ok) {
            const enableData = await enableResponse.json();
            console.log('Payments enabled successfully:', enableData);
            // Refresh status to get updated data
            const refreshResponse = await apiRequest('GET', '/api/connect/v2/status');
            const refreshedData = await refreshResponse.json();
            setStatus(refreshedData);
          }
        } catch (enableError) {
          console.error('Failed to enable payments:', enableError);
          setStatus(data); // Still set the original status
        }
      } else {
        setStatus(data);
      }

      if (data.hasAccount && !data.needsOnboarding) {
        setActiveTab('manage');
      }

      return data;
    } catch (error) {
      console.error('Failed to check Interlinc Connect status:', error);
      throw error;
    }
  };

  // Submit onboarding data directly via API
  const submitOnboarding = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/onboard', {
        body: JSON.stringify(onboardingForm),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onboarding failed');
      }

      const result = await response.json();
      console.log('Onboarding completed:', result);

      // Refresh status
      await checkStatus();
      setActiveTab('manage');

    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Update account information
  const updateAccount = async (updateData: any) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/update', {
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      const result = await response.json();
      console.log('Account updated:', result);

      // Refresh status
      await checkStatus();

    } catch (err) {
      console.error('Account update failed:', err);
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Initializing Interlinc Connect V2...');
        await checkStatus();
        console.log('Interlinc Connect V2 initialized successfully');
      } catch (err) {
        console.error('Interlinc Connect initialization failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
        console.error('Error details:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const getStatusInfo = () => {
    if (!status) return { variant: 'outline', text: 'Loading...', color: 'text-muted-foreground' };

    // Check if account is fully verified and ready for all payment types
    const cardPaymentsActive = status.capabilities?.card_payments === 'active';
    const achPaymentsActive = status.capabilities?.us_bank_account_ach_payments === 'active';
    const sepaPaymentsActive = status.capabilities?.sepa_debit_payments === 'active';
    const transfersActive = status.capabilities?.transfers === 'active';

    if (status.hasAccount && status.chargesEnabled && cardPaymentsActive) {
      const activePaymentMethods = [];
      if (cardPaymentsActive) activePaymentMethods.push('Cards');
      if (achPaymentsActive) activePaymentMethods.push('ACH');
      if (sepaPaymentsActive) activePaymentMethods.push('SEPA');
      
      return { 
        variant: 'success', 
        text: `Verified & Active (${activePaymentMethods.join(', ')})`, 
        color: 'text-green-400' 
      };
    } else if (status.hasAccount && status.chargesEnabled) {
      return { variant: 'success', text: 'Connected & Charges Enabled', color: 'text-green-400' };
    } else if (status.hasAccount && status.detailsSubmitted && !status.chargesEnabled) {
      return { variant: 'warning', text: 'Pending Stripe Verification', color: 'text-amber-400' };
    } else if (status.hasAccount && !status.detailsSubmitted) {
      return { variant: 'warning', text: 'Account Created - Setup Required', color: 'text-amber-400' };
    } else if (status.needsOnboarding) {
      return { variant: 'warning', text: 'Setup Required', color: 'text-amber-400' };
    }

    return { variant: 'info', text: 'Ready to Configure', color: 'text-slate-400' };
  };

  const handleFormChange = (field: keyof OnboardingForm, value: any) => {
    setOnboardingForm(prev => ({ ...prev, [field]: value }));
  };

  if (error) {
    console.error('InterlincConnectV2 error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-red-400">Connection Error</CardTitle>
            <CardDescription>Unable to initialize Interlinc Connect</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-300 text-sm mb-6 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Interlinc Connect</h1>
              <p className="text-lg text-muted-foreground">
                Enhanced payment processing with advanced capabilities
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={statusInfo.variant} className="px-4 py-2">
                {statusInfo.text}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-8">
          {/* Status Overview */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 backdrop-blur-sm text-white p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Interlinc Connect Status</h3>
                  <p className="text-slate-100">
                    Advanced payment processing with enhanced capabilities
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-3">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </div>
            </div>

            {status && (
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account ID</label>
                      <p className="mt-1 font-mono text-sm bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
                        {status.accountId || 'Not created yet'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payment Methods</label>
                      <div className="mt-2 space-y-2">
                        {status.capabilities && (
                          <>
                            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <span className="text-sm">Card Payments</span>
                                  <p className="text-xs text-muted-foreground">Status: {status.capabilities.card_payments || 'inactive'}</p>
                                </div>
                              </div>
                              {status.capabilities.card_payments === 'active' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : status.capabilities.card_payments === 'pending' ? (
                                <Clock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <span className="text-sm">ACH Transfers</span>
                                  <p className="text-xs text-muted-foreground">Status: {status.capabilities.us_bank_account_ach_payments || 'inactive'}</p>
                                </div>
                              </div>
                              {status.capabilities.us_bank_account_ach_payments === 'active' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : status.capabilities.us_bank_account_ach_payments === 'pending' ? (
                                <Clock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <span className="text-sm">International/SEPA</span>
                                  <p className="text-xs text-muted-foreground">Status: {status.capabilities.sepa_debit_payments || 'inactive'}</p>
                                </div>
                              </div>
                              {status.capabilities.sepa_debit_payments === 'active' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : status.capabilities.sepa_debit_payments === 'pending' ? (
                                <Clock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg border border-border/50">
                              <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <span className="text-sm">Transfers</span>
                                  <p className="text-xs text-muted-foreground">Status: {status.capabilities.transfers || 'inactive'}</p>
                                </div>
                              </div>
                              {status.capabilities.transfers === 'active' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : status.capabilities.transfers === 'pending' ? (
                                <Clock className="w-4 h-4 text-amber-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Enhanced Features</label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                            <Zap className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Real-time Status Updates</p>
                            <p className="text-xs text-muted-foreground">Live monitoring and notifications</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <Shield className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Enhanced Security</p>
                            <p className="text-xs text-muted-foreground">Advanced compliance monitoring</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                          <div className="w-8 h-8 bg-slate-500/20 rounded-full flex items-center justify-center">
                            <Settings className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">API Management</p>
                            <p className="text-xs text-muted-foreground">Complete control within your app</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Main Interface */}
          {isLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Initializing Interlinc Connect</h3>
                <p className="text-muted-foreground text-center">Setting up your payment processing...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-2xl">Payment Setup</CardTitle>
                <CardDescription className="text-base">
                  Configure and manage your payment processing capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-border/50 px-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="setup" className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Account Setup
                      </TabsTrigger>
                      <TabsTrigger value="manage" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Management
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="setup" className="mt-0 p-6">
                    <div className="min-h-[500px]">
                      {status?.needsOnboarding ? (
                        <div className="space-y-6">
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-400">Account Setup Required</h4>
                                <p className="text-sm text-blue-300">Complete your business information to start processing payments</p>
                              </div>
                            </div>
                          </div>

                          <Card className="border-border/50">
                            <CardHeader>
                              <CardTitle className="text-lg">Business Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid gap-4">
                                <div>
                                  <Label htmlFor="business_type">Business Type</Label>
                                  <Select 
                                    value={onboardingForm.business_type} 
                                    onValueChange={(value) => handleFormChange('business_type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select business type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="individual">Individual</SelectItem>
                                      <SelectItem value="company">Company</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {onboardingForm.business_type === 'individual' ? (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input 
                                          id="first_name"
                                          value={onboardingForm.first_name || ''}
                                          onChange={(e) => handleFormChange('first_name', e.target.value)}
                                          placeholder="John"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input 
                                          id="last_name"
                                          value={onboardingForm.last_name || ''}
                                          onChange={(e) => handleFormChange('last_name', e.target.value)}
                                          placeholder="Doe"
                                        />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div>
                                    <Label htmlFor="company_name">Company Name</Label>
                                    <Input 
                                      id="company_name"
                                      value={onboardingForm.company_name || ''}
                                      onChange={(e) => handleFormChange('company_name', e.target.value)}
                                      placeholder="Company Ltd"
                                    />
                                  </div>
                                )}

                                <div>
                                  <Label htmlFor="email">Email</Label>
                                  <Input 
                                    id="email"
                                    type="email"
                                    value={onboardingForm.email || ''}
                                    onChange={(e) => handleFormChange('email', e.target.value)}
                                    placeholder="contact@company.com"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="phone">Phone</Label>
                                  <Input 
                                    id="phone"
                                    value={onboardingForm.phone || ''}
                                    onChange={(e) => handleFormChange('phone', e.target.value)}
                                    placeholder="+44 20 1234 5678"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor="address_line1">Address</Label>
                                  <Input 
                                    id="address_line1"
                                    value={onboardingForm.address_line1 || ''}
                                    onChange={(e) => handleFormChange('address_line1', e.target.value)}
                                    placeholder="123 Business Street"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="address_city">City</Label>
                                    <Input 
                                      id="address_city"
                                      value={onboardingForm.address_city || ''}
                                      onChange={(e) => handleFormChange('address_city', e.target.value)}
                                      placeholder="London"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="address_postal_code">Postal Code</Label>
                                    <Input 
                                      id="address_postal_code"
                                      value={onboardingForm.address_postal_code || ''}
                                      onChange={(e) => handleFormChange('address_postal_code', e.target.value)}
                                      placeholder="SW1A 1AA"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id="tos_acceptance"
                                    checked={onboardingForm.tos_acceptance || false}
                                    onChange={(e) => handleFormChange('tos_acceptance', e.target.checked)}
                                    className="rounded border-border bg-background"
                                  />
                                  <Label htmlFor="tos_acceptance" className="text-sm">
                                    I agree to the terms of service and privacy policy
                                  </Label>
                                </div>
                              </div>

                              <Button 
                                onClick={submitOnboarding}
                                disabled={submitting || !onboardingForm.tos_acceptance}
                                className="w-full mt-6"
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Setting up account...
                                  </>
                                ) : (
                                  'Complete Setup'
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-8 h-8 text-green-400" />
                          </div>
                          <h3 className="text-2xl font-semibold mb-2">Setup Complete!</h3>
                          <p className="text-muted-foreground text-center mb-6 max-w-md">
                            Your Interlinc Connect account is fully configured and ready to process payments.
                          </p>
                          <Button
                            onClick={() => setActiveTab('manage')}
                            className="flex items-center gap-2"
                          >
                            <Settings className="w-4 h-4" />
                            Access Management
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="manage" className="mt-0 p-6">
                    <div className="min-h-[500px]">
                      {status?.hasAccount ? (
                        <div className="space-y-6">
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                <Settings className="w-4 h-4 text-green-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-400">Account Management</h4>
                                <p className="text-sm text-green-300">Update your business details, banking information, and settings</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-6">
                            <Card>
                              <CardHeader>
                                <CardTitle>Account Information</CardTitle>
                                <CardDescription>View and update your account details</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Account ID</Label>
                                      <p className="font-mono text-sm bg-muted/50 p-2 rounded border border-border/50">
                                        {status.accountId}
                                      </p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <Badge variant={status.needsOnboarding ? 'warning' : 'success'}>
                                        {status.needsOnboarding ? 'Pending Setup' : 'Active'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle>Payment Capabilities</CardTitle>
                                <CardDescription>Manage your payment processing features</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span>Card Payments</span>
                                    <Badge variant={status.capabilities?.card_payments === 'active' ? 'success' : 'secondary'}>
                                      {status.capabilities?.card_payments || 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Transfers</span>
                                    <Badge variant={status.capabilities?.transfers === 'active' ? 'success' : 'secondary'}>
                                      {status.capabilities?.transfers || 'Inactive'}
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {status.requirements && status.requirements.currently_due.length > 0 && (
                              <Card className="border-amber-500/20">
                                <CardHeader>
                                  <CardTitle className="text-amber-400">Action Required</CardTitle>
                                  <CardDescription>Complete these requirements to activate your account</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <ul className="space-y-2">
                                    {status.requirements.currently_due.map((req, index) => (
                                      <li key={index} className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm">{req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </CardContent>
                              </Card>
                            )}

                            <Card>
                              <CardHeader>
                                <CardTitle>Account Debug Information</CardTitle>
                                <CardDescription>Raw Stripe account data for verification</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <Button 
                                  onClick={() => {
                                    console.log('Full Status Object:', JSON.stringify(status, null, 2));
                                    if (status.capabilities) {
                                      console.log('\n=== PAYMENT CAPABILITIES ===');
                                      Object.entries(status.capabilities).forEach(([key, value]) => {
                                        console.log(`${key}: ${value}`);
                                      });
                                    }
                                    if (status.verification_status) {
                                      console.log('\n=== VERIFICATION STATUS ===');
                                      Object.entries(status.verification_status).forEach(([key, value]) => {
                                        console.log(`${key}: ${value}`);
                                      });
                                    }
                                    alert('Account details logged to console. Check browser developer tools.');
                                  }}
                                  variant="outline"
                                  className="w-full"
                                >
                                  Log Full Account Details to Console
                                </Button>
                                
                                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs font-mono">
                                  <div><strong>Account ID:</strong> {status?.accountId || 'Not available'}</div>
                                  <div><strong>Charges Enabled:</strong> {status?.chargesEnabled ? 'Yes' : 'No'}</div>
                                  <div><strong>Details Submitted:</strong> {status?.detailsSubmitted ? 'Yes' : 'No'}</div>
                                  <div><strong>Payouts Enabled:</strong> {status?.payoutsEnabled ? 'Yes' : 'No'}</div>
                                  {status?.requirements && (
                                    <div><strong>Requirements Complete:</strong> {status.requirements.is_complete ? 'Yes' : 'No'}</div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-8 h-8 text-amber-400" />
                          </div>
                          <h3 className="text-2xl font-semibold mb-2">Setup Required First</h3>
                          <p className="text-muted-foreground text-center mb-6 max-w-md">
                            Please complete your account setup before accessing management features.
                          </p>
                          <Button
                            onClick={() => setActiveTab('setup')}
                            variant="outline"
                            className="flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4" />
                            Complete Setup
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
