import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Upload, CheckCircle, FileText, X } from 'lucide-react';

const submitWorkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
  submissionType: z.enum(['digital', 'physical']),
  attachmentUrls: z.array(z.string()).optional(),
});

type SubmitWorkFormData = z.infer<typeof submitWorkSchema>;

interface SubmitWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  workRequest: any;
}

export function SubmitWorkModal({ isOpen, onClose, workRequest }: SubmitWorkModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<SubmitWorkFormData>({
    resolver: zodResolver(submitWorkSchema),
    defaultValues: {
      title: workRequest?.title || '',
      description: `Completed: ${workRequest?.title || ''}`,
      notes: '',
      submissionType: 'digital',
      attachmentUrls: [],
    },
  });

  const submitWorkMutation = useMutation({
    mutationFn: async (data: SubmitWorkFormData) => {
      return await apiRequest('POST', '/api/work-request-submissions', {
        workRequestId: workRequest.id,
        ...data,
        attachmentUrls: uploadedFiles,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Work submitted successfully',
        description: 'Your work has been submitted for review',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-request-submissions'] });
      onClose();
      form.reset();
      setUploadedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error submitting work',
        description: error.message || 'Failed to submit work. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFileUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // In a real app, you'd upload to a file storage service
        // For now, we'll simulate by creating a local URL
        const fileUrl = `uploads/${Date.now()}-${file.name}`;
        newFileUrls.push(fileUrl);
      }
      
      setUploadedFiles(prev => [...prev, ...newFileUrls]);
      toast({
        title: 'Files uploaded',
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: SubmitWorkFormData) => {
    submitWorkMutation.mutate({
      ...data,
      attachmentUrls: uploadedFiles,
    });
  };

  const submissionType = form.watch('submissionType');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Work</DialogTitle>
          <DialogDescription className="text-gray-400">
            Submit your completed work for: {workRequest?.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Submission Type */}
          <div className="space-y-3">
            <Label className="text-white">Submission Type</Label>
            <RadioGroup
              value={submissionType}
              onValueChange={(value) => form.setValue('submissionType', value as 'digital' | 'physical')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="digital" id="digital" />
                <Label htmlFor="digital" className="text-white cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Digital Delivery
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physical" id="physical" />
                <Label htmlFor="physical" className="text-white cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Physical Task
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Work submission title"
            />
            {form.formState.errors.title && (
              <p className="text-red-400 text-sm">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              className="bg-zinc-800 border-zinc-700 text-white min-h-[100px]"
              placeholder="Describe what you've completed..."
            />
            {form.formState.errors.description && (
              <p className="text-red-400 text-sm">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* File Upload for Digital Submissions */}
          {submissionType === 'digital' && (
            <div className="space-y-4">
              <Label className="text-white">Attachments</Label>
              
              <Card className="bg-zinc-800 border-zinc-700 border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-blue-400 hover:text-blue-300">Upload files</span>
                      <span className="text-gray-400"> or drag and drop</span>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      PDF, DOC, JPG, PNG, ZIP up to 10MB each
                    </p>
                  </div>
                </CardContent>
              </Card>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-white">Uploaded Files:</Label>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-zinc-800 p-3 rounded border border-zinc-700">
                      <span className="text-white text-sm">{file.split('/').pop()}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Physical Task Completion */}
          {submissionType === 'physical' && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-white font-medium mb-2">Physical Task Completion</h3>
                  <p className="text-gray-400 text-sm">
                    By submitting, you confirm that the physical task has been completed as requested.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-white">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              className="bg-zinc-800 border-zinc-700 text-white"
              placeholder="Any additional information or notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitWorkMutation.isPending || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitWorkMutation.isPending ? 'Submitting...' : 'Submit Work'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}