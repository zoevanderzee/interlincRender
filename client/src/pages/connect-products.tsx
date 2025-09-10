
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ExternalLink, Package, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout/Layout';

interface Product {
  id: string;
  name: string;
  description: string;
  defaultPrice: {
    id: string;
    unit_amount: number;
    currency: string;
  } | string;
  active: boolean;
  images: string[];
}

export default function ConnectProducts() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState('usd');

  useEffect(() => {
    if (user?.stripeConnectAccountId) {
      loadProducts();
    } else {
      // Redirect to onboarding if no connected account
      navigate('/connect-onboarding');
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user?.stripeConnectAccountId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/stripe-connect/accounts/${user.stripeConnectAccountId}/products`);

      if (response.ok) {
        const productsData = await response.json();
        setProducts(productsData);
      } else {
        console.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Error loading products',
        description: 'Failed to load your products. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProduct = async () => {
    if (!productName || !productPrice) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.stripeConnectAccountId) {
      toast({
        title: 'No connected account',
        description: 'Please complete onboarding first.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const priceInCents = Math.round(parseFloat(productPrice) * 100);

      const response = await fetch(`/api/stripe-connect/accounts/${user.stripeConnectAccountId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id?.toString() || '',
        },
        body: JSON.stringify({
          name: productName,
          description: productDescription,
          priceInCents,
          currency: productCurrency,
        }),
      });

      if (response.ok) {
        const product = await response.json();
        setProducts(prev => [...prev, product]);
        
        // Reset form
        setProductName('');
        setProductDescription('');
        setProductPrice('');
        setProductCurrency('usd');
        setShowCreateDialog(false);

        toast({
          title: 'Product created',
          description: `${product.name} has been created successfully.`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error creating product',
        description: error instanceof Error ? error.message : 'Failed to create product',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const formatPrice = (price: any) => {
    if (typeof price === 'string') return price;
    if (price && price.unit_amount) {
      return `$${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`;
    }
    return 'Price not set';
  };

  const getStorefrontUrl = () => {
    if (user?.stripeConnectAccountId) {
      return `/connect-storefront/${user.stripeConnectAccountId}`;
    }
    return '#';
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Product Management</h1>
            <p className="text-muted-foreground">
              Manage products for your Stripe Connect account.
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(getStorefrontUrl())}
              disabled={!user?.stripeConnectAccountId}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Storefront
            </Button>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Product</DialogTitle>
                  <DialogDescription>
                    Create a new product for your connected Stripe account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Enter product name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Description</Label>
                    <Textarea
                      id="productDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Enter product description"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="productPrice">Price *</Label>
                      <Input
                        id="productPrice"
                        type="number"
                        step="0.01"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productCurrency">Currency</Label>
                      <select
                        id="productCurrency"
                        value={productCurrency}
                        onChange={(e) => setProductCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      >
                        <option value="usd">USD</option>
                        <option value="eur">EUR</option>
                        <option value="gbp">GBP</option>
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createProduct} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Product'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading products...</span>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first product to start selling.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {product.name}
                  </CardTitle>
                  {product.description && (
                    <CardDescription>{product.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <DollarSign className="h-5 w-5" />
                    {formatPrice(product.defaultPrice)}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${product.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm text-muted-foreground">
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About Your Products</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Products are created directly in your Stripe Connect account</li>
            <li>• Customers will see your business name on receipts and statements</li>
            <li>• The platform charges a small application fee per transaction</li>
            <li>• You can manage products in the Stripe Dashboard as well</li>
            <li>• Share your storefront link with customers to start selling</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
