import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Copy, Loader2, Fingerprint, Check } from "lucide-react";

export function ProfileCodeSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  // Copy profile code to clipboard
  const copyToClipboard = () => {
    if (user?.profileCode) {
      navigator.clipboard.writeText(user.profileCode);
      setIsCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Your profile code has been copied to clipboard.",
      });
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  // Check if we need to generate an initial profile code
  const needsInitialCode = !user?.profileCode;

  // Generate initial code mutation
  const generateInitialCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/profile-code/generate");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate profile code");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile code generated",
        description: "Your profile code has been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate profile code",
        variant: "destructive",
      });
    },
  });

  if (!user || user.role !== "contractor") {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" />
          Your Profile Code
        </CardTitle>
        <CardDescription>
          Share your unique profile code with businesses to connect without exposing your email address. This code is permanent and cannot be changed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {needsInitialCode ? (
          <div className="text-center py-6">
            <div className="flex items-center justify-center mb-4 text-muted-foreground">
              <Fingerprint className="h-12 w-12 opacity-50 mb-2" />
            </div>
            <p className="mb-6">You don't have a profile code yet. Generate one to let businesses find and connect with you.</p>
            <Button
              onClick={() => generateInitialCodeMutation.mutate()}
              disabled={generateInitialCodeMutation.isPending}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {generateInitialCodeMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="mr-2 h-4 w-4" />
              )}
              Generate Profile Code
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-md bg-muted p-6 relative">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full absolute -top-3 -left-3 px-3 py-1 text-xs text-white">
                Your Code
              </div>
              <div className="flex items-center mt-2">
                <Input
                  className="font-mono text-xl text-center bg-transparent border-none h-14 shadow-none"
                  value={user?.profileCode || ""}
                  readOnly
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-2 focus:ring-0"
                        onClick={copyToClipboard}
                      >
                        {isCopied ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy to clipboard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm mt-2 text-muted-foreground text-center">
                Share this code with businesses who want to connect with you.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}