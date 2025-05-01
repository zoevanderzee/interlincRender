import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ContractorInvite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [inviteType, setInviteType] = useState('contractor');
  
  // Generate business invite link
  const generateInviteMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await apiRequest('POST', '/api/business/invite-link', { 
        workerType: type
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate invite link');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invite link generated',
        description: 'Your business invite link has been generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/business/invite-link'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate invite link',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Get existing business invite link
  const { data: inviteData, isLoading } = useQuery({
    queryKey: ['/api/business/invite-link'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/business/invite-link');
      if (!response.ok) {
        // If 404, it means no active invite link found, which is okay
        if (response.status === 404) {
          return null;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invite link');
      }
      
      return response.json();
    },
    enabled: !!user?.id && user?.role === 'business',
  });
  
  // Handle copy to clipboard
  const handleCopyInviteLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Invite link copied to clipboard',
      });
      
      // Reset copied status after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or copy manually',
        variant: 'destructive',
      });
    }
  };
  
  // Handle generate/refresh invite link
  const handleGenerateInviteLink = () => {
    generateInviteMutation.mutate(inviteType);
  };
  
  // We don't need to create the URL ourselves as it's provided by the API now
  
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Contractor Onboarding</CardTitle>
          <CardDescription>
            Generate and share a unique invitation link that allows contractors to register and
            connect directly to your account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invite-type">Worker Type</Label>
            <Select 
              value={inviteType} 
              onValueChange={setInviteType}
            >
              <SelectTrigger id="invite-type">
                <SelectValue placeholder="Select type of worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contractor">Sub Contractor</SelectItem>
                <SelectItem value="freelancer">Freelancer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This determines how they'll be categorized in your workers list
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inviteData && inviteData.token ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-link">Your Unique Onboarding Link</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="invite-link" 
                    value={inviteData.url} 
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyInviteLink(inviteData.url)}
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="bg-amber-900/20 border border-amber-700 rounded-md p-4 space-y-2">
                <h3 className="font-medium text-amber-500 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Important Information
                </h3>
                <p className="text-sm text-muted-foreground">
                  This link is tied to your account and can be used by any {inviteData.workerType || 'contractor'} you share it with.
                  When they register using this link, they'll automatically be added to your workers list.
                </p>
                <p className="text-sm text-muted-foreground">
                  For security, you can regenerate this link at any time, which will invalidate the old link.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                You don't have an active invite link yet.
              </p>
              <Button
                onClick={handleGenerateInviteLink}
                disabled={generateInviteMutation.isPending}
              >
                {generateInviteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
        
        {inviteData && inviteData.token && (
          <CardFooter className="flex justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span>Worker type: <strong>{inviteData.workerType || 'contractor'}</strong></span>
            </div>
            <Button
              variant="outline"
              onClick={handleGenerateInviteLink}
              disabled={generateInviteMutation.isPending}
            >
              {generateInviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Link
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}