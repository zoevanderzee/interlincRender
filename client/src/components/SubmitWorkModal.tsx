import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "./ObjectUploader";
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
  milestoneId: number;
  milestoneName: string;
}

export function SubmitWorkModal({
  isOpen,
  onClose,
  milestoneId,
  milestoneName,
}: SubmitWorkModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [submissionType, setSubmissionType] = useState<"digital" | "physical">("digital");
  const [description, setDescription] = useState("");
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
      const response = await apiRequest("PATCH", `/milestones/${milestoneId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Work Submitted",
        description: "Your deliverable has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit work. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const newFiles = result.successful.map((file: any) => ({
        url: file.uploadURL,
        name: file.name,
        type: file.type,
        size: file.size,
      }));
      setUploadedFiles([...uploadedFiles, ...newFiles]);
    }
  };

  const handleSubmit = () => {
    if (submissionType === "digital" && uploadedFiles.length === 0) {
      toast({
        title: "Files Required",
        description: "Please upload at least one file for digital deliverables.",
        variant: "destructive",
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

    const submissionData = {
      status: "completed",
      submittedAt: new Date().toISOString(),
      submissionType,
      ...(submissionType === "digital" 
        ? { deliverableFiles: uploadedFiles }
        : { deliverableDescription: description }
      ),
    };

    submitWorkMutation.mutate(submissionData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Submit Deliverable</DialogTitle>
          <DialogDescription>
            Submit your work for "{milestoneName}" to get approval and payment.
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
              <Label className="text-base font-medium">Upload Deliverable Files</Label>
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={50 * 1024 * 1024} // 50MB
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Files</span>
                </div>
              </ObjectUploader>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Uploaded Files:</Label>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
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