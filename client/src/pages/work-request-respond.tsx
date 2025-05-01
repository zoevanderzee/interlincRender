import { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Calendar, DollarSign, Tag, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkRequest } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';

export default function WorkRequestRespond() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [params] = useRoute('/work-requests/respond');
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const [reason, setReason] = useState('');
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  
  // State for tracking the response status
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [responseAction, setResponseAction] = useState<'accept' | 'decline' | null>(null);
  
  // Redirect to home if no token is found
  useEffect(() => {
    if (!token) {
      toast({
        title: 'Missing information',
        description: 'No token found in URL. Please use a valid work request link.',
        variant: 'destructive',
      });
      setLocation('/');
    }
  }, [token, toast, setLocation]);
  
  // Verify the token and get the work request details
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/work-requests/verify-token', token],
    queryFn: async () => {
      if (!token) return null;
      
      const response = await apiRequest('POST', '/api/work-requests/verify-token', { token });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid or expired token');
      }
      
      const tokenVerification = await response.json();
      
      // If verification is successful, get the work request details
      if (tokenVerification.valid && tokenVerification.workRequestId) {
        const workRequestResponse = await apiRequest('GET', `/api/work-requests?token=${token}`);
        if (!workRequestResponse.ok) {
          throw new Error('Failed to fetch work request details');
        }
        
        const workRequests = await workRequestResponse.json();
        return workRequests[0] as WorkRequest;
      }
      
      return null;
    },
    enabled: !!token,
  });
  
  // Accept work request mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!data?.id || !token) {
        throw new Error('Missing work request ID or token');
      }
      
      const response = await apiRequest('POST', `/api/work-requests/${data.id}/accept`, {
        token
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept work request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Work request accepted',
        description: 'You have successfully accepted the work request.',
      });
      setResponseSubmitted(true);
      setResponseAction('accept');
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to accept work request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Decline work request mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      if (!data?.id || !token) {
        throw new Error('Missing work request ID or token');
      }
      
      const response = await apiRequest('POST', `/api/work-requests/${data.id}/decline`, {
        token,
        reason: reason || 'Request declined'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline work request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Work request declined',
        description: 'You have declined the work request.',
      });
      setIsDeclineDialogOpen(false);
      setResponseSubmitted(true);
      setResponseAction('decline');
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to decline work request',
        description: error.message,
        variant: 'destructive',
      });
      setIsDeclineDialogOpen(false);
    },
  });
  
  // Handle accept button click
  const handleAccept = () => {
    acceptMutation.mutate();
  };
  
  // Handle decline button click
  const handleDecline = () => {
    setIsDeclineDialogOpen(true);
  };
  
  // Handle decline confirmation
  const handleDeclineConfirm = () => {
    declineMutation.mutate();
  };
  
  // Handle registration redirect
  const handleRegisterRedirect = () => {
    if (data && data.recipientEmail) {
      // Redirect to registration page with the email and business ID
      setLocation(`/auth?invite=${data.id}&email=${encodeURIComponent(data.recipientEmail)}`);
    } else {
      // Fallback if no email is available
      setLocation('/auth');
    }
  };
  
  // Display loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading Work Request</CardTitle>
            <CardDescription>Please wait while we fetch the work request details...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Display error state
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Invalid Work Request</CardTitle>
            <CardDescription>
              {error ? (error as Error).message : 'This work request link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Check if request is already accepted or declined
  if (data.status !== 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>
              {data.status === 'accepted' ? 'Work Request Accepted' : 'Work Request Declined'}
            </CardTitle>
            <CardDescription>
              {data.status === 'accepted' 
                ? 'This work request has already been accepted.' 
                : 'This work request has been declined.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            {data.status === 'accepted' 
              ? <CheckCircle className="h-12 w-12 text-green-500" /> 
              : <XCircle className="h-12 w-12 text-destructive" />}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Display response submitted state
  if (responseSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>
              {responseAction === 'accept' ? 'Work Request Accepted' : 'Work Request Declined'}
            </CardTitle>
            <CardDescription>
              {responseAction === 'accept'
                ? 'You have successfully accepted this work request.'
                : 'You have declined this work request.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            {responseAction === 'accept' 
              ? <CheckCircle className="h-12 w-12 text-green-500" /> 
              : <XCircle className="h-12 w-12 text-destructive" />}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="outline">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Display work request details and response options
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">{data.title}</CardTitle>
              <Badge variant="outline" className="mb-2">
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </Badge>
            </div>
          </div>
          <CardDescription>
            You have been invited to work on this project. Please review the details below.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Work request description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Description</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{data.description}</p>
          </div>
          
          {/* Work request details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.dueDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(data.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}
            
            {(data.budgetMin || data.budgetMax) && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Budget</p>
                  <p className="text-sm text-muted-foreground">
                    {data.budgetMin && data.budgetMax 
                      ? `$${data.budgetMin} - $${data.budgetMax}`
                      : data.budgetMin
                        ? `From $${data.budgetMin}`
                        : `Up to $${data.budgetMax}`
                    }
                  </p>
                </div>
              </div>
            )}
            
            {data.skills && (
              <div className="flex items-start space-x-2 col-span-1 md:col-span-2">
                <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Required Skills</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.skills.split(',').map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Attachments if any */}
          {data.attachmentUrls && Array.isArray(data.attachmentUrls) && data.attachmentUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Attachments</h3>
              <div className="grid grid-cols-1 gap-2">
                {data.attachmentUrls.map((url: string, index: number) => (
                  <a 
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center space-x-2"
                  >
                    <span>Attachment {index + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {/* Expiration warning if close to expiry */}
          {data.expiresAt && new Date(data.expiresAt) > new Date() && 
           new Date(data.expiresAt).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000 && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-md p-4 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-500">This request will expire soon</p>
                <p className="text-sm text-muted-foreground">
                  Please respond by {format(new Date(data.expiresAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <Button 
            className="w-full md:w-auto"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Work Request
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full md:w-auto"
            onClick={handleDecline}
            disabled={declineMutation.isPending}
          >
            {declineMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Declining...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Decline confirmation dialog */}
      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Work Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this work request? You can provide a reason below.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Reason for declining (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeclineDialogOpen(false)}
              className="sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={declineMutation.isPending}
              className="sm:order-2"
            >
              {declineMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                'Confirm Decline'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}