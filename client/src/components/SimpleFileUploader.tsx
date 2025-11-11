
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, File, Eye, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  filename: string;
}

interface SimpleFileUploaderProps {
  onFileUploaded?: (files: UploadedFile[]) => void;
  onFilesChanged?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  initialFiles?: UploadedFile[];
  projectId?: number | null;
}

export function SimpleFileUploader({
  onFileUploaded,
  onFilesChanged,
  maxFiles = 5,
  accept = "*/*",
  disabled = false,
  initialFiles = [],
  projectId = null
}: SimpleFileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Check file limit
    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxFiles} files`,
        variant: "destructive"
      });
      return;
    }

    uploadFiles(selectedFiles);
  };

  const uploadFiles = async (filesToUpload: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const uploadedFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);

        // Step 1: Get presigned upload URL
        const userId = localStorage.getItem('user_id');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (userId) {
          headers['X-User-ID'] = userId;
        }

        const uploadRequestBody = {
          projectId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size
        };

        const presignedResponse = await fetch('/api/files/upload', {
          method: 'POST',
          headers,
          body: JSON.stringify(uploadRequestBody)
        });

        if (!presignedResponse.ok) {
          const errorData = await presignedResponse.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(errorData.error || `Failed to get upload URL: ${presignedResponse.status}`);
        }

        const { presigned, file: fileMetadata, viewUrl, downloadUrl } = await presignedResponse.json();

        // Step 2: Upload directly to object storage using presigned URL
        // For S3/R2 PUT method
        const uploadResponse = await fetch(presigned.url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
            'Content-Length': file.size.toString()
          },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload to storage failed: ${uploadResponse.status}`);
        }

        // Step 3: Mark upload as complete
        const completeResponse = await fetch('/api/files/complete', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: fileMetadata.id })
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({ error: 'Complete failed' }));
          throw new Error(errorData.error || 'Failed to complete upload');
        }

        // Add to uploaded files list
        uploadedFiles.push({
          url: viewUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          filename: fileMetadata.id
        });
      }

      // Update files list
      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      
      // Notify parent components
      onFileUploaded?.(uploadedFiles);
      onFilesChanged?.(newFiles);

      toast({
        title: "Upload successful",
        description: `${uploadedFiles.length} file(s) uploaded successfully`
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChanged?.(newFiles);
  };

  const viewFile = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  const downloadFile = (file: UploadedFile) => {
    const downloadUrl = file.url.replace('/view/', '/download/');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
        />
        
        {uploading ? (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-gray-400 animate-pulse" />
            <p className="text-sm text-gray-600">Uploading files...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div>
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || files.length >= maxFiles}
                className="text-sm"
              >
                Choose files to upload
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                {files.length}/{maxFiles} files • Max 200MB per file
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files</h4>
          {files.map((file, index) => (
            <div
              key={`${file.filename}-${index}`}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)} • {file.type}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => viewFile(file)}
                  title="View file"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(file)}
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  title="Remove file"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
