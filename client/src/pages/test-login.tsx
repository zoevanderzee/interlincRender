import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

export default function TestLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginButton = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    handleLogin(user, pass);
  };

  const handleLogin = async (user: string, pass: string) => {
    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/login', {
        username: user,
        password: pass
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const userData = await response.json();
      toast({
        title: 'Login Successful',
        description: `Logged in as ${userData.username} (${userData.role})`,
      });
      
      // Redirect to payments page
      navigate('/payments');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border border-gray-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Test Connect Payment</CardTitle>
          <CardDescription>
            Login with test accounts to try out the Stripe Connect payment flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => handleLogin(username, password)}
              disabled={loading || !username || !password}
              className="w-full font-medium bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Sign In
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 border-t border-gray-800 pt-6">
          <div className="text-sm text-gray-400 mb-2">Test Accounts (click to login):</div>
          <div className="grid grid-cols-1 gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => handleLoginButton('test_business', 'password123')}
              className="w-full justify-start"
            >
              <div className="text-left">
                <div className="font-medium">Business User</div>
                <div className="text-xs text-gray-400">test_business / password123</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleLoginButton('test_contractor', 'password123')}
              className="w-full justify-start"
            >
              <div className="text-left">
                <div className="font-medium">Contractor (with Connect)</div>
                <div className="text-xs text-gray-400">test_contractor / password123</div>
              </div>
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-4">
            After login, go to Payments page to test the payment flow
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}