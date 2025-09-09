
import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  defaultPrice: {
    id: string;
    unit_amount: number;
    currency: string;
  };
  active: boolean;
  images: string[];
}

export default function Storefront() {
  // Extract accountId from URL path like /connect-storefront/:accountId
  const [match, params] = useRoute('/connect-storefront/:accountId');
  const accountId = params?.accountId;
  
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      loadProducts();
    } else {
      setError('Invalid storefront URL');
      setIsLoading(false);
    }
  }, [accountId]);

  const loadProducts = async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/stripe-connect/accounts/${accountId}/products`);

      if (response.ok) {
        const productsData = await response.json();
        // Only show active products with valid prices
        const activeProducts = productsData.filter((product: Product) => 
          product.active && product.defaultPrice && typeof product.defaultPrice === 'object'
        );
        setProducts(activeProducts);
      } else {
        setError('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load storefront');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (product: Product) => {
    if (!accountId || typeof product.defaultPrice !== 'object') return;

    setPurchasingProductId(product.id);
    try {
      // Calculate 3% platform fee
      const applicationFeeAmount = Math.round(product.defaultPrice.unit_amount * 0.03);

      const response = await fetch(`/api/stripe-connect/accounts/${accountId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: product.defaultPrice.id,
          quantity: 1,
          applicationFeeAmount,
        }),
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Purchase failed',
        description: error instanceof Error ? error.message : 'Failed to start checkout process',
        variant: 'destructive'
      });
    } finally {
      setPurchasingProductId(null);
    }
  };

  const formatPrice = (price: Product['defaultPrice']) => {
    if (typeof price === 'object' && price.unit_amount) {
      return `$${(price.unit_amount / 100).toFixed(2)}`;
    }
    return 'Price not available';
  };

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-semibold mb-2">Invalid Storefront URL</h1>
            <p className="text-muted-foreground">
              Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Online Store</h1>
              <p className="text-sm text-muted-foreground">
                Account: {accountId}
                {/* In a real application, you would replace this with the business name */}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Storefront</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Products Available</h2>
              <p className="text-muted-foreground">
                This store doesn't have any products for sale yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Available Products</h2>
              <p className="text-muted-foreground">
                Secure checkout powered by Stripe
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="flex flex-col">
                  {product.images && product.images.length > 0 && (
                    <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{product.name}</CardTitle>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Available
                      </Badge>
                    </div>
                    {product.description && (
                      <CardDescription>{product.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="mb-4">
                      <div className="text-2xl font-bold">
                        {formatPrice(product.defaultPrice)}
                      </div>
                      {typeof product.defaultPrice === 'object' && (
                        <div className="text-sm text-muted-foreground">
                          {product.defaultPrice.currency.toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handlePurchase(product)}
                      disabled={purchasingProductId === product.id}
                      className="w-full"
                    >
                      {purchasingProductId === product.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
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

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-white rounded-lg border">
          <h3 className="font-semibold mb-3">Secure Shopping</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <strong>🔒 Secure Payments</strong>
              <p>All payments are processed securely through Stripe.</p>
            </div>
            <div>
              <strong>💳 Multiple Payment Methods</strong>
              <p>We accept all major credit cards and digital wallets.</p>
            </div>
            <div>
              <strong>📧 Instant Confirmation</strong>
              <p>You'll receive an email confirmation after purchase.</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <p>
              This storefront is powered by Stripe Connect. 
              In a real application, you would replace the account ID with a custom domain or business name.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
