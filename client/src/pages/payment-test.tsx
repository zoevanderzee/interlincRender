import { useState } from 'react';
import PaymentProcessor from '@/components/payments/PaymentProcessor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentTestPage() {
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPayment(true);
  };

  const handleCancel = () => {
    setShowPayment(false);
  };

  const handleComplete = () => {
    setShowPayment(false);
    setAmount('');
    setDescription('');
    setRecipientName('');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Payment Integration Test</h1>

      {showPayment ? (
        <PaymentProcessor
          paymentId={123} // For testing purposes
          amount={amount}
          description={description}
          recipientName={recipientName}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      ) : (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Test Payment</CardTitle>
            <CardDescription>
              Enter payment details to test the payment integration.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.50"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Payment description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Name</Label>
                <Input
                  id="recipient"
                  placeholder="Recipient name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Proceed to Payment
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}