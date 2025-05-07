import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Fingerprint } from "lucide-react";

interface FindByProfileCodeDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

// Create schema for the form
const formSchema = z.object({
  profileCode: z.string()
    .min(3, "Profile code must be at least 3 characters")
    .max(20, "Profile code cannot exceed 20 characters"),
  message: z.string()
    .max(500, "Message cannot exceed 500 characters")
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function FindByProfileCodeDialog({ 
  trigger,
  onSuccess
}: FindByProfileCodeDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profileCode: "",
      message: "",
    },
  });
  
  // Create connection request mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest("POST", "/api/connection-requests", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send connection request");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request sent",
        description: "Your connection request has been sent to the worker.",
      });
      form.reset();
      setOpen(false);
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
  
  // Handle form submission
  const onSubmit = (data: FormValues) => {
    createConnectionMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Fingerprint className="mr-2 h-5 w-5" />
            Connect by Profile Code
          </DialogTitle>
          <DialogDescription>
            Enter a worker's profile code to send them a connection request.
            This allows you to quickly find and connect with external workers.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="profileCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter the worker's profile code"
                      className="uppercase"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormDescription>
                    The worker's profile code (e.g., JOHNSON-2025)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add a message to introduce yourself or explain why you'd like to connect"
                      className="min-h-[120px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Include a brief message for the worker
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={createConnectionMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createConnectionMutation.isPending}
              >
                {createConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}