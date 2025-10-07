import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SubscriptionForm from '@/components/SubscriptionForm';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Subscribe() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user data to determine role
  const { data: user, isLoading: userLoading, error } = useQuery({
    queryKey: ['/api/user'],
    enabled: true,
  });

  useEffect(() => {
    if (!userLoading) {
      setCurrentUser(user);
      setIsLoading(false);
    }
  }, [user, userLoading]);

  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center" style={{ background: '#0f1a2e' }}>
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
          <p className="text-lg">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4" style={{ background: '#0f1a2e' }}>
        <Card className="max-w-md w-full bg-black text-white border border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-red-500">Authentication Error</CardTitle>
            <CardDescription>
              Please log in to access subscription options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/auth'}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubscriptionComplete = () => {
    // Redirect to dashboard after successful subscription
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      {/* Luxury gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#0f1a2e] to-[#1a2b4a]" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Content */}
      <div className="relative z-10">
        <SubscriptionForm
          userRole={currentUser.role as 'business' | 'contractor'}
          userEmail={currentUser.email}
          userName={currentUser.username || currentUser.first_name || 'User'}
          userId={currentUser.id}
          onSubscriptionComplete={handleSubscriptionComplete}
        />
      </div>
    </div>
  );
}

export default Subscribe;