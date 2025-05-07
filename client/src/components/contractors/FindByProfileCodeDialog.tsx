import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface FindByProfileCodeDialogProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function FindByProfileCodeDialog({ 
  trigger, 
  onSuccess 
}: FindByProfileCodeDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [profileCode, setProfileCode] = useState("");
  const [message, setMessage] = useState("");

  // Mutation to send a connection request
  const connectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/connection-requests", {
        profileCode,
        message: message.trim() || null,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to send connection request");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connection-requests"] });
      toast({
        title: "Connection request sent",
        description: "The contractor will be notified of your request.",
      });
      setOpen(false);
      setProfileCode("");
      setMessage("");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send connection request",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect with a Contractor</DialogTitle>
          <DialogDescription>
            Enter the contractor's profile code to send them a connection request.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="profile-code" className="text-right">
              Profile Code
            </Label>
            <Input
              id="profile-code"
              value={profileCode}
              onChange={(e) => setProfileCode(e.target.value.toUpperCase())}
              className="col-span-3"
              placeholder="e.g. SMITH-X12Y"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right mt-2">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message to introduce yourself or your project"
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => connectionMutation.mutate()}
            disabled={!profileCode || connectionMutation.isPending}
          >
            {connectionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}