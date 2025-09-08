
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShoppingCart, Store, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Product {
  id: string;
  name: string;
  description: string;
  default_price: {
    id: string;
    unit_amount: number;
    currency: string;
  };
  active: boolean;
}

export default function Storefront() {
  const params = useParams();
  const [location] = useLocation();
  const accountId = params.accountId as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Check for success/cancel parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');

    if (sessionId) {
      toast({
        title: 'Payment Successful!',
        description: 'Your purchase has been completed successfully.',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled) {
      toast({
        title: 'Payment Canceled',
        description: 'Your payment was canceled. You can try again anytime.',
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, toast]);

  // Fetch products for the storefront
  const fetchProducts = async () => {
    if (!accountId) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('GET', `/api/connect/accounts/${accountId}/products`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      // Only show active products
      setProducts(data.products?.filter((p: Product) => p.active) || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load storefront products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle product purchase
  const purchaseProduct = async (product: Product) => {
    if (!product.default_price) {
      toast({
        title: 'Error',
        description: 'This product has no price set',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckoutLoading(product.id);
      
      const response = await apiRequest('POST', `/api/connect/accounts/${accountId}/checkout`, {
        line_items: [{
          price: product.default_price.id,
          quantity: 1,
        }],
        application_fee_amount: Math.max(50, Math.round(product.default_price.unit_amount * 0.05)), // 5% or 50¢ minimum platform fee
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Checkout Error',
        description: error.message || 'Failed to start checkout process',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  useEffect(() => {
    fetchProducts();
  }, [accountId]);

  if (!accountId || !accountId.startsWith('acct_')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Invalid Store</h3>
            <p className="text-muted-foreground">
              This storefront link is invalid or the store doesn't exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <Store className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Online Store</h1>
              <p className="text-sm text-muted-foreground">
                Powered by Stripe Connect
                {/* Note: In production, you'd use a custom identifier instead of account ID */}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-10 bg-gray-300 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Store Coming Soon</h3>
              <p className="text-muted-foreground">
                This store is being set up. Please check back later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold mb-4">Our Products</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Discover our carefully curated selection of products. 
                All payments are securely processed through Stripe.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {product.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold text-primary">
                        {product.default_price ? 
                          formatPrice(product.default_price.unit_amount, product.default_price.currency) :
                          'Price unavailable'
                        }
                      </span>
                      <Badge variant="outline">
                        {product.default_price?.currency.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <Button 
                      onClick={() => purchaseProduct(product)}
                      disabled={!product.default_price || checkoutLoading === product.id}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {checkoutLoading === product.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Buy Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Secure payments powered by Stripe • All transactions are encrypted and protected</p>
        </div>
      </div>
    </div>
  );
}
