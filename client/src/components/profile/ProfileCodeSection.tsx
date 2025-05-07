import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  RefreshCw, 
  Copy, 
  Check,
  Fingerprint
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProfileCodeSection() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // Query to fetch the current user's profile code
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/profile-code'],
    retry: false
  });
  
  // Mutation to generate a new profile code
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/profile-code', {});
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to generate new code");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile-code'] });
      toast({
        title: "Profile code updated",
        description: "Your new profile code has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate code",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Copy profile code to clipboard
  const copyToClipboard = () => {
    if (!data?.profileCode) return;
    
    navigator.clipboard.writeText(data.profileCode)
      .then(() => {
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Profile code has been copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy code to clipboard",
          variant: "destructive",
        });
      });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" />
          Worker Profile Code
        </CardTitle>
        <CardDescription>
          Share this code with businesses to let them connect with you. It's like a business card that identifies you in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-destructive mb-4">Failed to load profile code</p>
            <Button variant="secondary" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {data?.profileCode ? (
              <>
                <div className="bg-primary-900 p-6 rounded-lg text-center">
                  <h3 className="text-xs text-primary-400 uppercase tracking-wider mb-2">Your Profile Code</h3>
                  <div className="flex items-center justify-center space-x-2">
                    <p className="text-2xl font-bold text-white tracking-wide">{data.profileCode}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-300 hover:text-white hover:bg-primary-800"
                            onClick={copyToClipboard}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                    <h4 className="font-medium mb-2">How to use your profile code</h4>
                    <p className="text-sm text-primary-700">
                      Share this code with businesses who want to connect with you. They'll enter it in their system to send you a connection request.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => generateCodeMutation.mutate()}
                      disabled={generateCodeMutation.isPending}
                    >
                      {generateCodeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Generate New Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="mb-4">You don't have a profile code yet.</p>
                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                >
                  {generateCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Generate Profile Code
                    </>
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