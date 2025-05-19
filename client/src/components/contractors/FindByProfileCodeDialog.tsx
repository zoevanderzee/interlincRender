import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, CheckCircle2, AlertCircle } from "lucide-react";

// Form schema
const formSchema = z.object({
  profileCode: z
    .string()
    .min(1, { message: "Profile code is required" })
    .max(50, { message: "Profile code is too long" })
    .regex(/^[A-Z0-9-]+$/, {
      message: "Profile code can only contain uppercase letters, numbers, and hyphens",
    }),
  message: z
    .string()
    .max(500, { message: "Message cannot exceed 500 characters" })
    .optional(),
});

export function FindByProfileCodeDialog({
  trigger,
  onSuccess
}: {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundContractor, setFoundContractor] = useState<{
    id: number;
    username: string;
    companyName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profileCode: "",
      message: "",
    },
  });

  // Handle search by profile code
  const handleSearch = async (profileCode: string) => {
    setIsSearching(true);
    setSearchError(null);
    setFoundContractor(null);
    
    try {
      // Use fetch directly to avoid case sensitivity issues
      const response = await fetch(`/api/contractors/find-by-profile-code/${profileCode}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id?.toString() || ""
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to find contractor with this profile code");
      }
      
      const data = await response.json();
      setFoundContractor(data);
    } catch (error: any) {
      setSearchError(error.message);
      toast({
        title: "Contractor not found",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle form submission to create connection request
  const connectionMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!foundContractor) {
        throw new Error("No contractor selected");
      }
      
      const response = await apiRequest("POST", "/api/connection-requests", {
        profileCode: values.profileCode,
        message: values.message || null,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send connection request");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connection request sent",
        description: "Your connection request has been sent successfully.",
      });
      setIsOpen(false);
      form.reset();
      setFoundContractor(null);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    },
  });
  
  // Handle dialog close
  const handleDialogClose = () => {
    form.reset();
    setFoundContractor(null);
    setSearchError(null);
    setIsOpen(false);
  };
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!foundContractor) {
      handleSearch(values.profileCode);
    } else {
      connectionMutation.mutate(values);
    }
  };
  
  // Get display name for contractor
  const getDisplayName = () => {
    if (foundContractor?.companyName) return foundContractor.companyName;
    if (foundContractor?.firstName && foundContractor?.lastName) 
      return `${foundContractor.firstName} ${foundContractor.lastName}`;
    return foundContractor?.username || "Contractor";
  };
  
  if (!user || user.role !== "business") {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect by Profile Code</DialogTitle>
          <DialogDescription>
            Enter a contractor's profile code to send them a connection request.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="profileCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Code</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="e.g. JOHNSON-2025"
                        {...field}
                        className="uppercase"
                        disabled={!!foundContractor || isSearching}
                      />
                    </FormControl>
                    {!foundContractor && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0"
                        onClick={() => handleSearch(form.getValues("profileCode"))}
                        disabled={isSearching || !form.getValues("profileCode")}
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {searchError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{searchError}</p>
              </div>
            )}
            
            {foundContractor && (
              <div className="p-3 rounded-md bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="font-medium">Contractor Found</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{getDisplayName()}</p>
                  {foundContractor.title && (
                    <p className="text-muted-foreground">{foundContractor.title}</p>
                  )}
                </div>
              </div>
            )}
            
            {foundContractor && (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Introduce yourself or explain why you'd like to connect..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleDialogClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSearching || connectionMutation.isPending}
              >
                {isSearching || connectionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {foundContractor ? "Sending Request..." : "Searching..."}
                  </>
                ) : foundContractor ? (
                  "Send Connection Request"
                ) : (
                  "Find Contractor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}