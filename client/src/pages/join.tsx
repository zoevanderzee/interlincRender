
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, CheckCircle, AlertCircle } from 'lucide-react';

export default function JoinPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get code from URL params
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get('code');
    
    if (urlCode) {
      setCode(urlCode);
      fetchCompanyPreview(urlCode);
    } else {
      setError('No company code provided in link');
    }
  }, []);

  const fetchCompanyPreview = async (companyCode: string) => {
    setIsLoadingPreview(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/join/preview/${companyCode}`);
      
      if (!response.ok) {
        throw new Error('Invalid or expired link');
      }
      
      const data = await response.json();
      setCompanyInfo(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load company information');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = `/join?code=${code}`;
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await apiRequest('POST', '/api/join/accept', { code });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join company');
      }

      toast({
        title: data.alreadyConnected ? 'Already Connected' : 'Successfully Joined!',
        description: `You are now connected to ${data.companyName}`,
      });

      // Redirect to contractor dashboard
      navigate('/');
      
    } catch (err: any) {
      setError(err.message || 'Failed to join company');
      toast({
        title: 'Join Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (authLoading || isLoadingPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-zinc-400">Loading company information...</p>
        </div>
      </div>
    );
  }

  if (error && !companyInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {companyInfo?.companyLogo ? (
              <img 
                src={companyInfo.companyLogo} 
                alt={companyInfo.companyName}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <CardTitle>{companyInfo?.companyName || 'Company'}</CardTitle>
              {companyInfo?.industry && (
                <CardDescription>{companyInfo.industry}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div className="p-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <p className="text-sm text-zinc-400 mb-1">Joining as</p>
                <p className="font-medium text-white">
                  {user.firstName && user.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user.username}
                </p>
                <p className="text-sm text-zinc-400">{user.email}</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button 
                onClick={handleJoin} 
                disabled={isJoining}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Join {companyInfo?.companyName}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-zinc-400">
                You need to sign in or create an account to join this company.
              </p>
              <Button 
                onClick={handleJoin}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                Sign In to Join
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
