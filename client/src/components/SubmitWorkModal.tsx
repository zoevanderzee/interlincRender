import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SimpleFileUploader } from "./SimpleFileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";

interface SubmitWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: number;
  deliverableName: string;
}

export function SubmitWorkModal({
  isOpen,
  onClose,
  deliverableId,
  deliverableName,
}: SubmitWorkModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submissionType, setSubmissionType] = useState<"digital" | "physical">("digital");
  const [description, setDescription] = useState("");
  const [deliverableLinks, setDeliverableLinks] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>>([]);

  const submitWorkMutation = useMutation({
    mutationFn: async (data: {
      status: string;
      submittedAt: string;
      submissionType: string;
      deliverableFiles?: any[];
      deliverableDescription?: string;
    }) => {
      // Try both deliverables and milestones endpoints for compatibility
      let response = await apiRequest("PATCH", `/api/deliverables/${deliverableId}`, data);
      
      if (!response.ok) {
        // Fallback to milestones endpoint
        response = await apiRequest("PATCH", `/api/milestones/${deliverableId}`, data);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Submission failed' }));
        throw new Error(errorData.message || `Submission failed with status ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Submitted",
        description: "Your deliverable has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit work. Please try again.",
        variant: "destructive",
      });
    },
  });

  // File upload handlers removed - now handled by SimpleFileUploader

  const handleSubmit = () => {
    if (submissionType === "digital") {
      // Parse links from textarea (one per line or comma-separated)
      const links = deliverableLinks
        .split(/[\n,]+/)
        .map(link => link.trim())
        .filter(link => link.length > 0);
      
      // Require at least one file OR one link
      if (uploadedFiles.length === 0 && links.length === 0) {
        toast({
          title: "Files or Links Required",
          description: "Please upload at least one file or provide at least one link for digital deliverables.",
          variant: "destructive",
        });
        return;
      }

      // Combine uploaded files with link objects
      const allDeliverables = [
        ...uploadedFiles,
        ...links.map(link => ({
          url: link,
          name: link.split('/').pop() || link,
          type: "link",
          size: 0
        }))
      ];

      submitWorkMutation.mutate({
        status: "completed",
        submittedAt: new Date().toISOString(),
        submissionType,
        deliverableFiles: allDeliverables
      });
      return;
    }

    if (submissionType === "physical" && !description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description for physical deliverables.",
        variant: "destructive",
      });
      return;
    }

    submitWorkMutation.mutate({
      status: "completed",
      submittedAt: new Date().toISOString(),
      submissionType,
      deliverableDescription: description
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Deliverable</DialogTitle>
          <DialogDescription>
            Submit your work for "{deliverableName}" to get approval and payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium">Submission Type</Label>
            <RadioGroup
              value={submissionType}
              onValueChange={(value: "digital" | "physical") => setSubmissionType(value)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="digital" id="digital" />
                <Label htmlFor="digital">Digital Work (files, documents, etc.)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physical" id="physical" />
                <Label htmlFor="physical">Physical Work (cannot be digitally evidenced)</Label>
              </div>
            </RadioGroup>
          </div>

          {submissionType === "digital" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Upload Deliverable Files</Label>
                <SimpleFileUploader
                  maxFiles={5}
                  accept="*/*"
                  onFilesChanged={setUploadedFiles}
                  initialFiles={uploadedFiles}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliverableLinks" className="text-base font-medium">
                  Or Provide Links
                </Label>
                <p className="text-sm text-muted-foreground">
                  Add links to Google Drive, Figma, websites, etc. (one per line or comma-separated)
                </p>
                <Textarea
                  id="deliverableLinks"
                  data-testid="input-deliverable-links"
                  placeholder="https://drive.google.com/file/...&#10;https://figma.com/file/...&#10;https://example.com/deliverable"
                  value={deliverableLinks}
                  onChange={(e) => setDeliverableLinks(e.target.value)}
                  rows={3}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium">
                Work Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the physical work completed that cannot be digitally evidenced (e.g., 'Installed new plumbing system in bathroom', 'Delivered materials to construction site', etc.)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitWorkMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitWorkMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitWorkMutation.isPending ? "Submitting..." : "Submit Deliverable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}