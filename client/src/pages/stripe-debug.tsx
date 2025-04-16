import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StripeDebugPage() {
  const [stripeInfo, setStripeInfo] = useState({
    keyExists: false,
    keyValue: '',
    startsWithPk: false,
    keyMasked: ''
  });

  useEffect(() => {
    // Get publishable key
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
    const keyExists = Boolean(key);
    const startsWithPk = key.startsWith('pk_');
    
    // Create a masked version for safe display
    let keyMasked = '';
    if (key) {
      const prefix = key.substring(0, 7);
      const suffix = key.substring(key.length - 4);
      const middleLength = key.length - prefix.length - suffix.length;
      const middle = '*'.repeat(Math.min(middleLength, 10));
      keyMasked = `${prefix}${middle}${suffix}`;
    }
    
    setStripeInfo({
      keyExists,
      keyValue: key,
      startsWithPk,
      keyMasked
    });
  }, []);

  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Key Debug Tool</h1>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Stripe Publishable Key Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">Key Exists:</div>
            <div>{stripeInfo.keyExists ? '✅ Yes' : '❌ No'}</div>
            
            <div className="font-medium">Key Format Valid:</div>
            <div>{stripeInfo.startsWithPk ? '✅ Yes (starts with pk_)' : '❌ No (should start with pk_)'}</div>
            
            <div className="font-medium">Key Value (Masked):</div>
            <div className="break-all">{stripeInfo.keyMasked || 'Not available'}</div>
            
            <div className="font-medium">Environment:</div>
            <div>{import.meta.env.MODE}</div>
          </div>
          
          <div className="pt-4">
            <Button onClick={refreshPage} className="w-full">
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-8 text-center max-w-lg mx-auto">
        <h2 className="text-xl font-bold mb-4">Debugging Instructions</h2>
        <ul className="text-left list-disc pl-5 space-y-2">
          <li>The Stripe publishable key should be set as the <code className="bg-muted px-1 rounded">VITE_STRIPE_PUBLIC_KEY</code> environment variable</li>
          <li>The key should start with <code className="bg-muted px-1 rounded">pk_test_</code> or <code className="bg-muted px-1 rounded">pk_live_</code></li>
          <li>After changing environment variables, you need to restart the application</li>
          <li>If the key format is valid but still doesn't work, try generating a new key from the Stripe dashboard</li>
        </ul>
      </div>
    </div>
  );
}