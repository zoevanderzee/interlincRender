
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import Layout from '@/components/layout/Layout';

export default function ConnectDemo() {
  const [_, navigate] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const sessionIdParam = params.get('session_id');
    const accountIdParam = params.get('account');

    setSessionId(sessionIdParam);
    setAccountId(accountIdParam);
  }, []);

  // Check if this is a success page
  const isSuccessPage = sessionId && accountId;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {isSuccessPage ? (
          // Success Page
          <div className="text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-700 mb-2">Payment Successful!</h1>
              <p className="text-muted-foreground">
                Thank you for your purchase. Your payment has been processed successfully.
              </p>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session ID:</span>
                    <span className="font-mono text-sm">{sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account ID:</span>
                    <span className="font-mono text-sm">{accountId}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Button
                onClick={() => navigate(`/connect-storefront/${accountId}`)}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Store
              </Button>
            </div>
          </div>
        ) : (
          // Demo/Info Page
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Stripe Connect Integration</h1>
              <p className="text-muted-foreground">
                Complete Stripe Connect implementation with onboarding, products, and payments.
              </p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🚀 Getting Started</CardTitle>
                  <CardDescription>
                    Follow these steps to set up your Stripe Connect account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Complete the onboarding process to create your connected account</li>
                    <li>Verify your identity and business information with Stripe</li>
                    <li>Create products with prices for your customers</li>
                    <li>Share your storefront URL with customers</li>
                    <li>Start receiving payments with automatic platform fees</li>
                  </ol>
                  <div className="mt-4">
                    <Button onClick={() => navigate('/connect-onboarding')}>
                      Start Onboarding
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>💰 How It Works</CardTitle>
                  <CardDescription>
                    Understanding the payment flow and fee structure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Direct Charges with Application Fees</h4>
                    <p className="text-sm text-muted-foreground">
                      Customers pay directly to your connected account. The platform automatically 
                      collects a 3% application fee from each transaction.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Full Stripe Dashboard Access</h4>
                    <p className="text-sm text-muted-foreground">
                      You get complete access to the Stripe Dashboard to manage payments, 
                      view analytics, handle refunds, and manage your account settings.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Automatic Payouts</h4>
                    <p className="text-sm text-muted-foreground">
                      Stripe handles all payouts to your bank account automatically. 
                      You don't need to manage transfers manually.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🔧 Technical Implementation</CardTitle>
                  <CardDescription>
                    Built following Stripe Connect best practices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Uses controller properties for account creation (not legacy type parameter)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Stripe-Account header for all connected account operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Account Links for hosted onboarding flow</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Direct charges with application_fee_amount for monetization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Stripe Checkout for secure payment processing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Real-time account status checking via API</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-800">⚠️ Important Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-amber-700 text-sm space-y-2">
                  <p>
                    <strong>Environment Variables:</strong> Make sure your STRIPE_SECRET_KEY is set in your environment.
                  </p>
                  <p>
                    <strong>Account ID in URL:</strong> In production, replace the account ID in storefront URLs 
                    with custom domains or business identifiers.
                  </p>
                  <p>
                    <strong>Database Integration:</strong> This demo stores the connected account ID in your user record. 
                    In production, consider additional metadata and relationship tracking.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
