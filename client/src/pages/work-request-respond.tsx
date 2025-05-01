import { useState, useEffect } from 'react';
import { useLocation, useRoute, useRouter } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function WorkRequestRespond() {
  const [, params] = useRoute('/work-requests/respond');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [location, setLocation] = useState<string>(window.location.href);
  const [token, setToken] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [step, setStep] = useState<'loading' | 'details' | 'success' | 'error'>('loading');
  const [workRequestId, setWorkRequestId] = useState<number | null>(null);

  // Parse token from URL
  useEffect(() => {
    const url = new URL(location);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setStep('error');
      toast({
        title: 'Invalid Link',
        description: 'This work request link is invalid or has expired.',
        variant: 'destructive'
      });
    }
  }, [location, toast]);

  // Verify token and get work request details
  const { data: workRequest, isLoading, error } = useQuery({
    queryKey: ['/api/work-requests/verify-token', token],
    queryFn: async () => {
      if (!token) return null;
      const res = await apiRequest('POST', '/api/work-requests/verify-token', { token });
      const data = await res.json();
      if (data.valid) {
        setWorkRequestId(data.workRequestId);
        setStep('details');
        return data;
      }
      setStep('error');
      return null;
    },
    enabled: !!token,
    retry: false
  });

  // Accept work request mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!workRequestId || !token) throw new Error('Missing work request ID or token');
      const res = await apiRequest('POST', `/api/work-requests/${workRequestId}/accept`, { token });
      return res.json();
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: 'Work Request Accepted',
        description: 'You have successfully accepted this work request.',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Accepting Work Request',
        description: error.message || 'There was an error accepting this work request.',
        variant: 'destructive'
      });
    }
  });

  // Decline work request mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      if (!workRequestId || !token) throw new Error('Missing work request ID or token');
      const res = await apiRequest('POST', `/api/work-requests/${workRequestId}/decline`, { 
        token,
        reason: declineReason 
      });
      return res.json();
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: 'Work Request Declined',
        description: 'You have declined this work request.',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Declining Work Request',
        description: error.message || 'There was an error declining this work request.',
        variant: 'destructive'
      });
    }
  });

  // Handle accept click
  const handleAccept = () => {
    acceptMutation.mutate();
  };

  // Handle decline click
  const handleDecline = () => {
    declineMutation.mutate();
  };

  // Render based on current step
  if (step === 'loading' || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
        <Card className="w-full max-w-md mx-auto bg-black border border-gray-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Loading Work Request</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify this request...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'error' || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
        <Card className="w-full max-w-md mx-auto bg-black border border-gray-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Invalid Work Request</CardTitle>
            <CardDescription className="text-center">
              This work request link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-center text-gray-400">
              If you believe this is an error, please contact the sender of this work request.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default" className="w-full" onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
        <Card className="w-full max-w-md mx-auto bg-black border border-gray-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {acceptMutation.isSuccess ? 'Work Request Accepted' : 'Work Request Declined'}
            </CardTitle>
            <CardDescription className="text-center">
              {acceptMutation.isSuccess 
                ? 'You have successfully accepted this work request.' 
                : 'You have declined this work request.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            {acceptMutation.isSuccess ? (
              <Check className="h-16 w-16 text-green-500 mb-4" />
            ) : (
              <X className="h-16 w-16 text-red-500 mb-4" />
            )}
            <p className="text-center text-gray-400">
              {acceptMutation.isSuccess 
                ? 'You will be contacted with further details about this project.' 
                : 'Thank you for your response.'}
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="default" className="w-full" onClick={() => navigate('/auth')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <Card className="w-full max-w-md mx-auto bg-black border border-gray-800">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Work Request</CardTitle>
          <CardDescription className="text-center">
            Review the details below and accept or decline this work request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workRequest && (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{workRequest.title}</h3>
                <div className="text-sm text-gray-400">Business ID: {workRequest.businessId}</div>
                <div className="text-sm text-gray-400">Status: {workRequest.status}</div>
              </div>

              <div className="pt-4">
                <h4 className="text-sm font-medium mb-2">To decline, provide a reason (optional):</h4>
                <Textarea
                  placeholder="Enter reason for declining..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="resize-none bg-gray-900"
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex space-x-2 w-full">
            <Button 
              variant="destructive" 
              className="w-1/2"
              onClick={handleDecline}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
            <Button 
              variant="default" 
              className="w-1/2"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}