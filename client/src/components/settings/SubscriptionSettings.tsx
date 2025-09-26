import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CreditCard, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import SubscriptionForm from "@/components/SubscriptionForm";

interface SubscriptionSettingsProps {
  user: any;
}

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    plan_name: string;
    amount: number;
    currency: string;
    interval: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  } | null;
  customer: {
    id: string;
  } | null;
}

const planNameMapping: Record<string, string> = {
  'business-starter': 'Test Plan',
  'business': 'Standard Plan', 
  'business-enterprise': 'Enterprise Plan',
  'business-annual': 'Annual Plan',
  'contractor': 'Contractor Plan'
};

export function SubscriptionSettings({ user }: SubscriptionSettingsProps) {
  const { toast } = useToast();
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  // Fetch current subscription details
  const { data: subscriptionData, isLoading, error } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription-status');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      return response.json();
    }
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/cancel-subscription');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel subscription');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the current billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/reactivate-subscription');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reactivate subscription');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated and will continue billing.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed", 
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'incomplete': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showUpgrade) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Change Subscription Plan</CardTitle>
              <CardDescription>
                Select a new plan to upgrade or downgrade your subscription
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Back to Current Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionForm
            userRole={user.role as 'business' | 'contractor'}
            userEmail={user.email}
            userName={`${user.firstName} ${user.lastName}` || user.username}
            userId={user.id}
            onSubscriptionComplete={() => {
              setShowUpgrade(false);
              queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
              queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading subscription details...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscriptionData?.subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your subscription plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {error ? 'Failed to load subscription details' : 'No active subscription found'}
            </p>
            <Button onClick={() => setShowUpgrade(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { subscription } = subscriptionData;
  const planDisplayName = planNameMapping[subscription.plan_name] || subscription.plan_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          Subscription
        </CardTitle>
        <CardDescription>Manage your subscription plan and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold">{planDisplayName}</h3>
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status}
              </Badge>
              {subscription.cancel_at_period_end && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Cancelling
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatAmount(subscription.amount, subscription.currency)} per {subscription.interval}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button variant="outline" onClick={() => setShowUpgrade(true)}>
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Change Plan
            </Button>
          </div>
        </div>

        {/* Billing Information */}
        <div className="space-y-3">
          <h4 className="font-medium">Billing Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Current Period:</span>
              <div className="flex items-center mt-1">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Next Billing:</span>
              <div className="mt-1">
                <span className="font-medium">
                  {subscription.cancel_at_period_end 
                    ? 'Subscription ends' 
                    : formatAmount(subscription.amount, subscription.currency)
                  } on {formatDate(subscription.current_period_end)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          {subscription.cancel_at_period_end ? (
            <Button
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {reactivateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpCircle className="mr-2 h-4 w-4" />
              )}
              Reactivate Subscription
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}