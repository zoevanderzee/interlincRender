import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle } from "lucide-react";

export default function PaymentSettings() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Settings</h1>
          <p className="text-muted-foreground">
            Payment method configuration for contractor payments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          Secured by Stripe Connect
        </div>
      </div>

      {/* Connect-Only Mode Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Secure Connect-Only Payment Mode
          </CardTitle>
          <CardDescription>
            Enhanced security mode - no saved cards required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-medium text-blue-900">
                  Connect-to-Connect Payment Flow
                </h3>
                <p className="text-sm text-blue-700">
                  Your business Stripe Connect account is linked and ready for secure contractor payments. 
                  Payment methods are collected fresh for each transaction, providing maximum security.
                </p>
                <div className="mt-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Business Account Connected ✓
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">How it works:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">1.</span>
                When you approve a payment, you'll enter your card details securely
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">2.</span>
                Funds transfer directly from your business account to contractor account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">3.</span>
                No card details are stored - fresh entry required each time
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">4.</span>
                Contractors receive payments instantly in their connected accounts
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Card */}
      <Card>
        <CardHeader>
          <CardTitle>Security Benefits</CardTitle>
          <CardDescription>
            Why Connect-only mode provides superior security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✓ Enhanced Security</h4>
              <p className="text-sm text-muted-foreground">
                No stored payment methods means zero risk of data breaches
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✓ Direct Transfers</h4>
              <p className="text-sm text-muted-foreground">
                Money moves directly between Connect accounts - never stored on platform
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✓ Real-time Payments</h4>
              <p className="text-sm text-muted-foreground">
                Contractors receive payments immediately upon approval
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">✓ Compliance Ready</h4>
              <p className="text-sm text-muted-foreground">
                Meets all PCI compliance requirements automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}