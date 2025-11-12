import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SimpleFileUploader } from "./SimpleFileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Plus, Link, X } from "lucide-react";

interface SubmitWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: number; // This is actually the work request ID for standalone tasks
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
  const [notes, setNotes] = useState("");
  const [newLink, setNewLink] = useState("");
  const [deliverableLinks, setDeliverableLinks] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    name: string;
    type: string;
    size: number;
    filename: string;
  }>>([]);

  const submitWorkMutation = useMutation({
    mutationFn: async (data: {
      notes?: string;
      artifactUrl?: string;
      deliverableFiles?: any[];
      deliverableDescription?: string;
      submissionType: string;
    }) => {
      // Use the new work request submissions endpoint
      const response = await apiRequest("POST", `/api/work-requests/${deliverableId}/submissions`, data);
      
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
      queryClient.invalidateQueries({ queryKey: ["/api/work-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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

  // URL validation helper
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Add link handler
  const addLink = () => {
    if (newLink.trim() && isValidUrl(newLink.trim())) {
      setDeliverableLinks([...deliverableLinks, newLink.trim()]);
      setNewLink("");
      toast({
        title: "Link Added",
        description: "Deliverable link added successfully.",
      });
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com).",
        variant: "destructive",
      });
    }
  };

  // Remove link handler
  const removeLink = (index: number) => {
    const newLinks = [...deliverableLinks];
    newLinks.splice(index, 1);
    setDeliverableLinks(newLinks);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  const handleSubmit = () => {
    if (submissionType === "digital") {
      // Require at least one file OR one link
      if (uploadedFiles.length === 0 && deliverableLinks.length === 0) {
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
        ...deliverableLinks.map(link => {
          const linkName = link.split('/').pop() || link;
          return {
            url: link,
            name: linkName,
            filename: linkName,
            type: "link",
            size: 0
          };
        })
      ];

      // Use the first link as artifactUrl if available, otherwise undefined
      const artifactUrl = deliverableLinks.length > 0 ? deliverableLinks[0] : undefined;

      submitWorkMutation.mutate({
        notes: notes || undefined,
        artifactUrl,
        deliverableFiles: allDeliverables,
        submissionType
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
      notes: notes || undefined,
      deliverableDescription: description,
      submissionType
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
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Upload Deliverable Files</Label>
                <SimpleFileUploader
                  maxFiles={5}
                  accept="*/*"
                  onFilesChanged={setUploadedFiles}
                  initialFiles={uploadedFiles}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">Deliverable Links</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Add links to Google Drive, Figma, websites, etc.
                </p>
                
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/deliverable"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    data-testid="input-deliverable-link"
                  />
                  <Button
                    onClick={addLink}
                    disabled={!newLink.trim()}
                    variant="outline"
                    type="button"
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
                    data-testid="button-add-link"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {/* Added Links */}
                {deliverableLinks.length > 0 && (
                  <div className="space-y-2" data-testid="deliverable-links">
                    {deliverableLinks.map((link, index) => (
                      <Card key={index} className="p-3 flex items-center justify-between group hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate"
                            data-testid={`link-${index}`}
                          >
                            {link}
                          </a>
                        </div>
                        <button
                          onClick={() => removeLink(index)}
                          type="button"
                          className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                          data-testid={`remove-link-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
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