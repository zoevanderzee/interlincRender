import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Clock, XCircle, AlertCircle, Settings, CreditCard, Zap, Shield, Globe, Building, Users, ArrowRight, Loader2, Upload, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ConnectStatusV2 {
  hasAccount: boolean;
  accountId?: string;
  needsOnboarding: boolean;
  version: string;
  capabilities?: Record<string, string>;
  payment_methods?: Record<string, boolean>;
  requirements?: {
    currently_due: string[];
    past_due: string[];
    pending_verification: string[];
    disabled_reason: string | null;
    is_complete: boolean;
  };
  verification_status?: {
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    verification_complete: boolean;
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
  dob?: {
    day: number;
    month: number;
    year: number;
  };
  business_profile?: {
    name?: string;
    support_email?: string;
    support_phone?: string;
    url?: string;
  };
}

interface BankAccountForm {
  routing_number: string;
  account_number: string;
  account_holder_type: 'individual' | 'company';
}

interface VerificationForm {
  document_type: string;
  document_front?: File;
  document_back?: File;
}

export default function InterlincConnectV2() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectStatusV2 | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Form states
  const [onboardingForm, setOnboardingForm] = useState<OnboardingForm>({
    business_type: 'individual',
    address_country: 'GB'
  });
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountForm>({
    routing_number: '',
    account_number: '',
    account_holder_type: 'individual'
  });
  const [verificationForm, setVerificationForm] = useState<VerificationForm>({
    document_type: 'passport'
  });

  // Transfer state
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');

  // Check V2 status and capabilities
  const checkStatus = async () => {
    try {
      console.log('Checking Interlinc Connect V2 status...');
      const response = await apiRequest('GET', '/api/connect/v2/status');
      const data = await response.json();

      console.log('V2 Status Response (Real Stripe Data):', JSON.stringify(data, null, 2));
      console.log('Account verification details:', {
        accountId: data.accountId,
        charges_enabled: data.verification_status?.charges_enabled,
        details_submitted: data.verification_status?.details_submitted,
        payouts_enabled: data.verification_status?.payouts_enabled,
        requirements: data.requirements,
        capabilities: data.capabilities
      });
      setStatus(data);

      // Auto-navigate based on status
      if (!data.hasAccount) {
        setActiveTab('create');
      } else if (data.needsOnboarding) {
        setActiveTab('onboard');
      } else if (data.verification_status?.verification_complete) {
        setActiveTab('manage');
      } else {
        setActiveTab('verify');
      }

    } catch (error) {
      console.error('Failed to check V2 status:', error);
      throw error;
    }
  };

  // Create Connect account
  const createAccount = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/create-account', {
        body: JSON.stringify({
          country: 'GB',
          business_type: onboardingForm.business_type
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Account creation failed');
      }

      const result = await response.json();
      console.log('Account created:', result);

      toast({
        title: "Account Created",
        description: "Your Connect account has been created successfully.",
      });

      // Refresh status and move to onboarding
      await checkStatus();
      setActiveTab('onboard');

    } catch (err) {
      console.error('Account creation failed:', err);
      setError(err instanceof Error ? err.message : 'Account creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit onboarding information
  const submitOnboarding = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/submit-onboarding', {
        body: JSON.stringify(onboardingForm),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onboarding submission failed');
      }

      const result = await response.json();
      console.log('Onboarding submitted:', result);

      toast({
        title: "Information Submitted",
        description: "Your account information has been submitted for review.",
      });

      // Refresh status
      await checkStatus();

    } catch (err) {
      console.error('Onboarding submission failed:', err);
      setError(err instanceof Error ? err.message : 'Onboarding submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Add bank account
  const addBankAccount = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/add-bank-account', {
        body: JSON.stringify(bankAccountForm),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bank account addition failed');
      }

      const result = await response.json();
      console.log('Bank account added:', result);

      toast({
        title: "Bank Account Added",
        description: "Your bank account has been added successfully.",
      });

      // Clear form and refresh status
      setBankAccountForm({
        routing_number: '',
        account_number: '',
        account_holder_type: 'individual'
      });
      await checkStatus();

    } catch (err) {
      console.error('Bank account addition failed:', err);
      setError(err instanceof Error ? err.message : 'Bank account addition failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit verification documents
  const submitVerification = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const formData: any = {
        document_type: verificationForm.document_type
      };

      // Convert files to base64
      if (verificationForm.document_front) {
        const frontData = await fileToBase64(verificationForm.document_front);
        formData.document_front = frontData.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      }

      if (verificationForm.document_back) {
        const backData = await fileToBase64(verificationForm.document_back);
        formData.document_back = backData.split(',')[1];
      }

      const response = await apiRequest('POST', '/api/connect/v2/verify-account', {
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification submission failed');
      }

      const result = await response.json();
      console.log('Verification submitted:', result);

      toast({
        title: "Documents Submitted",
        description: "Your verification documents have been submitted for review.",
      });

      // Refresh status
      await checkStatus();

    } catch (err) {
      console.error('Verification submission failed:', err);
      setError(err instanceof Error ? err.message : 'Verification submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Create transfer
  const createTransfer = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await apiRequest('POST', '/api/connect/v2/create-transfer', {
        body: JSON.stringify({
          amount: parseFloat(transferAmount),
          description: transferDescription || 'Manual transfer'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transfer creation failed');
      }

      const result = await response.json();
      console.log('Transfer created:', result);

      toast({
        title: "Transfer Created",
        description: `Transfer of $${transferAmount} has been initiated.`,
      });

      // Clear form
      setTransferAmount('');
      setTransferDescription('');

    } catch (err) {
      console.error('Transfer creation failed:', err);
      setError(err instanceof Error ? err.message : 'Transfer creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await checkStatus();
      } catch (err) {
        console.error('V2 initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const getStatusInfo = () => {
    if (!status) return { variant: 'outline', text: 'Loading...', color: 'text-muted-foreground' };

    // Check if account has blocking requirements
    const hasBlockingRequirements = status.requirements?.disabled_reason ||
                                   (status.requirements?.currently_due?.length > 0) ||
                                   (status.requirements?.past_due?.length > 0);

    if (status.verification_status?.verification_complete && !hasBlockingRequirements) {
      return { variant: 'success', text: 'Fully Verified & Active', color: 'text-green-400' };
    } else if (status.hasAccount && status.verification_status?.charges_enabled && !hasBlockingRequirements) {
      return { variant: 'success', text: 'Connected & Active', color: 'text-green-400' };
    } else if (status.hasAccount && hasBlockingRequirements) {
      return { variant: 'destructive', text: 'Action Required', color: 'text-red-400' };
    } else if (status.hasAccount && status.verification_status?.details_submitted) {
      return { variant: 'warning', text: 'Under Review', color: 'text-amber-400' };
    } else if (status.hasAccount) {
      return { variant: 'warning', text: 'Setup Required', color: 'text-amber-400' };
    }

    return { variant: 'info', text: 'Ready to Start', color: 'text-slate-400' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin mb-4 mx-auto"></div>
          <h3 className="text-lg font-semibold mb-2">Initializing Connect V2</h3>
          <p className="text-muted-foreground">Loading payment processing setup...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <CardTitle className="text-red-400">Connection Error</CardTitle>
            <CardDescription>Unable to initialize payment processing</CardDescription>
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
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Payment Processing Setup</h1>
              <p className="text-lg text-muted-foreground">
                Direct API integration for complete payment processing control
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
        {/* Status Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Account Status
            </CardTitle>
            <CardDescription>Current payment processing capabilities and requirements</CardDescription>
          </CardHeader>
          {status && (
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account Information</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span>Account ID:</span>
                        <span className="font-mono text-sm">{status.accountId || 'Not created'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Details Submitted:</span>
                        {status.verification_status?.details_submitted ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> : 
                          <XCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex justify-between">
                        <span>Charges Enabled:</span>
                        {status.verification_status?.charges_enabled ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> : 
                          <XCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex justify-between">
                        <span>Payouts Enabled:</span>
                        {status.verification_status?.payouts_enabled ? 
                          <CheckCircle className="w-4 h-4 text-green-400" /> : 
                          <XCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Payment Methods</Label>
                    <div className="mt-2 space-y-2">
                      {status.capabilities && Object.keys(status.capabilities).length > 0 ? (
                        Object.entries(status.capabilities).filter(([_, capStatus]) => capStatus !== 'not_requested').map(([capability, capStatus]) => (
                          <div key={capability} className="flex justify-between items-center">
                            <span className="capitalize">{capability.replace(/_/g, ' ')}</span>
                            <Badge variant={capStatus === 'active' ? 'default' : capStatus === 'pending' ? 'secondary' : 'destructive'}>
                              {capStatus}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No payment methods configured yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main Interface */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-border/50 px-6">
                <TabsList className="grid w-full max-w-2xl grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="create" disabled={status?.hasAccount}>Create</TabsTrigger>
                  <TabsTrigger value="onboard" disabled={!status?.hasAccount || !status?.needsOnboarding}>Setup</TabsTrigger>
                  <TabsTrigger value="verify" disabled={!status?.hasAccount}>Verify</TabsTrigger>
                  <TabsTrigger value="manage" disabled={!status?.hasAccount}>Manage</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CreditCard className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Payment Processing Overview</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Complete end-to-end payment processing setup with direct API integration
                  </p>
                  <div className="flex justify-center gap-4">
                    {!status?.hasAccount && (
                      <Button onClick={() => setActiveTab('create')}>
                        Create Account
                      </Button>
                    )}
                    {status?.hasAccount && status?.needsOnboarding && (
                      <Button onClick={() => setActiveTab('onboard')}>
                        Complete Setup
                      </Button>
                    )}
                    {status?.hasAccount && !status?.needsOnboarding && (
                      <Button onClick={() => setActiveTab('manage')}>
                        Manage Account
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="create" className="p-6">
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Create Payment Account</h3>
                    <p className="text-muted-foreground">Set up your payment processing account</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="business_type">Account Type</Label>
                      <Select 
                        value={onboardingForm.business_type} 
                        onValueChange={(value) => setOnboardingForm(prev => ({...prev, business_type: value as 'individual' | 'company'}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={createAccount} disabled={submitting} className="w-full">
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Create Account
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="onboard" className="p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Account Information</h3>
                    <p className="text-muted-foreground">Provide your business details for verification</p>
                  </div>

                  {onboardingForm.business_type === 'individual' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input 
                          value={onboardingForm.first_name || ''}
                          onChange={(e) => setOnboardingForm(prev => ({...prev, first_name: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input 
                          value={onboardingForm.last_name || ''}
                          onChange={(e) => setOnboardingForm(prev => ({...prev, last_name: e.target.value}))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Company Name</Label>
                      <Input 
                        value={onboardingForm.company_name || ''}
                        onChange={(e) => setOnboardingForm(prev => ({...prev, company_name: e.target.value}))}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={onboardingForm.email || ''}
                        onChange={(e) => setOnboardingForm(prev => ({...prev, email: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input 
                        value={onboardingForm.phone || ''}
                        onChange={(e) => setOnboardingForm(prev => ({...prev, phone: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input 
                      value={onboardingForm.address_line1 || ''}
                      onChange={(e) => setOnboardingForm(prev => ({...prev, address_line1: e.target.value}))}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input 
                        value={onboardingForm.address_city || ''}
                        onChange={(e) => setOnboardingForm(prev => ({...prev, address_city: e.target.value}))}
                      />
                    </div>
                    <div>
                      <Label>Postal Code</Label>
                      <Input 
                        value={onboardingForm.address_postal_code || ''}
                        onChange={(e) => setOnboardingForm(prev => ({...prev, address_postal_code: e.target.value}))}
                      />
                    </div>
                  </div>

                  <Button onClick={submitOnboarding} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Submit Information
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="verify" className="p-6">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">Identity Verification</h3>
                    <p className="text-muted-foreground">Upload verification documents</p>
                  </div>

                  <div>
                    <Label>Document Type</Label>
                    <Select 
                      value={verificationForm.document_type}
                      onValueChange={(value) => setVerificationForm(prev => ({...prev, document_type: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="driving_license">Driving License</SelectItem>
                        <SelectItem value="id_card">National ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Document Front</Label>
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => setVerificationForm(prev => ({...prev, document_front: e.target.files?.[0]}))}
                    />
                  </div>

                  <div>
                    <Label>Document Back (if applicable)</Label>
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => setVerificationForm(prev => ({...prev, document_back: e.target.files?.[0]}))}
                    />
                  </div>

                  <Button onClick={submitVerification} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Upload Documents
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="manage" className="p-6">
                <div className="space-y-8">
                  {/* Account Management */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Account Management</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Bank Account Setup */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Bank Account Setup</CardTitle>
                          <CardDescription>
                            {status?.verification_status?.verification_complete ? 
                              "Update payout destination" : 
                              "Complete onboarding first to add bank account"
                            }
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {status?.verification_status?.verification_complete ? (
                            <>
                              <div>
                                <Label>Routing Number</Label>
                                <Input 
                                  value={bankAccountForm.routing_number}
                                  onChange={(e) => setBankAccountForm(prev => ({...prev, routing_number: e.target.value}))}
                                  placeholder="123456789"
                                />
                              </div>
                              <div>
                                <Label>Account Number</Label>
                                <Input 
                                  value={bankAccountForm.account_number}
                                  onChange={(e) => setBankAccountForm(prev => ({...prev, account_number: e.target.value}))}
                                  placeholder="1234567890"
                                />
                              </div>
                              <Button onClick={addBankAccount} disabled={submitting} className="w-full">
                                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Update Bank Account
                              </Button>
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground mb-4">
                                Bank account setup is handled during the onboarding process. 
                                Complete your account verification first.
                              </p>
                              <Button 
                                variant="outline" 
                                onClick={() => setActiveTab('onboard')}
                                disabled={!status?.hasAccount || !status?.needsOnboarding}
                              >
                                Complete Onboarding
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Manual Transfer */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Create Transfer</CardTitle>
                          <CardDescription>Manual payout transfer</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Amount ($)</Label>
                            <Input 
                              type="number"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="100.00"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Input 
                              value={transferDescription}
                              onChange={(e) => setTransferDescription(e.target.value)}
                              placeholder="Transfer description"
                            />
                          </div>
                          <Button onClick={createTransfer} disabled={submitting || !transferAmount} className="w-full">
                            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create Transfer
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Requirements */}
                  {status?.requirements && !status?.requirements?.is_complete && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Outstanding Requirements</h3>
                      <Card className="border-amber-500/20">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            {status.requirements.currently_due.map((req, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <span className="text-sm">{req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Status Complete */}
                  {status?.verification_status?.verification_complete && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Account Fully Verified!</h3>
                      <p className="text-muted-foreground">
                        Your payment processing is active and ready to receive payments.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}