import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";

export function ProfileCodeSection() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Query to fetch the user's profile code
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/profile-code'],
    retry: false,
  });
  
  // Mutation to generate a new profile code
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/profile-code');
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile-code'] });
      toast({
        title: "Profile code generated",
        description: "Your new profile code is ready to share.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate profile code",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Function to copy profile code to clipboard
  const copyToClipboard = () => {
    if (data?.profileCode) {
      navigator.clipboard.writeText(data.profileCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Profile code copied to clipboard",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile Code</CardTitle>
        <CardDescription>
          Share your unique profile code with businesses to connect without email invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-destructive py-4">
            <p>Unable to load your profile code</p>
            <Button 
              variant="secondary" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/profile-code'] })}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.profileCode ? (
              <>
                <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-md">
                  <p className="font-mono text-lg">{data.profileCode}</p>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={copyToClipboard}
                    className="ml-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This code is like your professional ID - you can share it verbally or in text messages. 
                  Businesses can use it to send you connection requests without needing your email address.
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="mb-4">You don't have a profile code yet</p>
                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    'Generate Profile Code'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}