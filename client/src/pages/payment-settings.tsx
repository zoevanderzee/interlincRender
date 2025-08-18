import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Bank, Shield, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
}

export default function PaymentSettings() {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's payment methods
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['/api/payment-methods'],
    queryFn: async () => {
      const response = await fetch('/api/payment-methods');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Add payment method mutation
  const addPaymentMethod = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/payment-methods", data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Added",
        description: "Your payment method has been successfully added and verified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
      setShowAddCard(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Payment Method",
        description: error.message || "Please check your card details and try again.",
        variant: "destructive",
      });
    }
  });

  // Set default payment method
  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return apiRequest("POST", `/api/payment-methods/${paymentMethodId}/set-default`);
    },
    onSuccess: () => {
      toast({
        title: "Default Payment Method Updated",
        description: "This payment method will be used for automated payments.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    }
  });

  // Delete payment method
  const deletePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return apiRequest("DELETE", `/api/payment-methods/${paymentMethodId}`);
    },
    onSuccess: () => {
      toast({
        title: "Payment Method Removed",
        description: "The payment method has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    }
  });

  const resetForm = () => {
    setCardNumber("");
    setExpiryMonth("");
    setExpiryYear("");
    setCvc("");
    setCardholderName("");
  };

  const handleAddCard = () => {
    if (!cardNumber || !expiryMonth || !expiryYear || !cvc || !cardholderName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all card details.",
        variant: "destructive",
      });
      return;
    }

    addPaymentMethod.mutate({
      type: 'card',
      card: {
        number: cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(expiryMonth),
        exp_year: parseInt(expiryYear),
        cvc: cvc
      },
      billing_details: {
        name: cardholderName
      }
    });
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substr(0, 19); // Limit to 16 digits + 3 spaces
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Settings</h1>
          <p className="text-muted-foreground">
            Manage your payment methods for automated contractor payments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          Secured by Stripe
        </div>
      </div>

      {/* Current Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            These payment methods will be used to fund automated payments to contractors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Methods Added</h3>
              <p className="text-muted-foreground mb-4">
                Add a payment method to enable automated contractor payments
              </p>
              <Button onClick={() => setShowAddCard(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          ) : (
            <>
              {paymentMethods.map((method: PaymentMethod) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {method.type === 'card' ? (
                      <CreditCard className="w-8 h-8 text-blue-600" />
                    ) : (
                      <Bank className="w-8 h-8 text-green-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {method.type === 'card' 
                          ? `${method.brand?.toUpperCase()} ending in ${method.last4}`
                          : `${method.bankName} ending in ${method.last4}`
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {method.type === 'card' ? 'Credit/Debit Card' : 'Bank Account'}
                      </div>
                    </div>
                    {method.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultPaymentMethod.mutate(method.id)}
                        disabled={setDefaultPaymentMethod.isPending}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePaymentMethod.mutate(method.id)}
                      disabled={deletePaymentMethod.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setShowAddCard(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Payment Method
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Form */}
      {showAddCard && (
        <Card>
          <CardHeader>
            <CardTitle>Add Payment Method</CardTitle>
            <CardDescription>
              Add a credit card or debit card to fund automated payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="cardholder-name">Cardholder Name</Label>
                <Input
                  id="cardholder-name"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input
                  id="card-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expiry-month">Month</Label>
                  <Input
                    id="expiry-month"
                    placeholder="MM"
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').substring(0, 2))}
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry-year">Year</Label>
                  <Input
                    id="expiry-year"
                    placeholder="YYYY"
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddCard}
                disabled={addPaymentMethod.isPending}
                className="flex-1"
              >
                {addPaymentMethod.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Add Payment Method
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCard(false);
                  resetForm();
                }}
                disabled={addPaymentMethod.isPending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Security Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Your Payment Information is Secure</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All payment data is encrypted and processed by Stripe</li>
                <li>• We never store your full card numbers</li>
                <li>• Automated payments are processed only when you approve deliverables</li>
                <li>• You can remove payment methods at any time</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}