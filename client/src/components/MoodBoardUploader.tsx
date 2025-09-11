import { useState } from "react";
import { X, Plus, Link, Upload, Image } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

interface MoodBoardUploaderProps {
  value?: {
    files: string[];
    links: string[];
  };
  onChange?: (value: { files: string[]; links: string[] }) => void;
  disabled?: boolean;
}

/**
 * MoodBoard component for visual inspiration uploads and URL links
 * Features:
 * - File drag & drop upload for PNG/JPEG images
 * - URL input for external inspiration links  
 * - Preview thumbnails for uploaded images
 * - Delete functionality for both files and links
 * - Luxury UI with smooth animations
 */
export function MoodBoardUploader({ value = { files: [], links: [] }, onChange, disabled }: MoodBoardUploaderProps) {
  const [newLink, setNewLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload parameters:", error);
      throw error;
    }
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const newFiles = result.successful.map((file: any) => file.uploadURL);
      onChange?.({
        ...value,
        files: [...value.files, ...newFiles]
      });
      setIsUploading(false);
      toast({
        title: "Upload Complete",
        description: `${result.successful.length} image(s) uploaded successfully.`,
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...value.files];
    newFiles.splice(index, 1);
    onChange?.({
      ...value,
      files: newFiles
    });
  };

  const addLink = () => {
    if (newLink.trim() && isValidUrl(newLink.trim())) {
      onChange?.({
        ...value,
        links: [...value.links, newLink.trim()]
      });
      setNewLink("");
      toast({
        title: "Link Added",
        description: "Inspiration link added to mood board.",
      });
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL (e.g., https://example.com).",
        variant: "destructive",
      });
    }
  };

  const removeLink = (index: number) => {
    const newLinks = [...value.links];
    newLinks.splice(index, 1);
    onChange?.({
      ...value,
      links: newLinks
    });
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  return (
    <div className="space-y-6" data-testid="moodboard-uploader">
      <div>
        <Label className="text-base font-medium mb-3 block">
          Visual Inspiration
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          Upload images or add links to communicate your project's visual direction
        </p>

        {/* File Upload Section */}
        <div className="space-y-4">
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={10485760} // 10MB
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Upload Images (PNG, JPEG)</span>
            </div>
          </ObjectUploader>

          {/* Uploaded Images Preview */}
          {value.files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="uploaded-files">
              {value.files.map((file, index) => (
                <Card key={index} className="relative group overflow-hidden aspect-square">
                  <img
                    src={file}
                    alt={`Mood board image ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg"
                    data-testid={`remove-file-${index}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* URL Links Section */}
        <div className="space-y-4 mt-8">
          <Label className="text-base font-medium mb-3 block">
            Inspiration Links
          </Label>
          
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/inspiration"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              disabled={disabled}
              data-testid="input-inspiration-link"
            />
            <Button
              onClick={addLink}
              disabled={!newLink.trim() || disabled}
              variant="outline"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
              data-testid="button-add-link"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Added Links */}
          {value.links.length > 0 && (
            <div className="space-y-2" data-testid="inspiration-links">
              {value.links.map((link, index) => (
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

        {/* Empty State */}
        {value.files.length === 0 && value.links.length === 0 && (
          <Card className="p-8 text-center border-dashed" data-testid="empty-moodboard">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No inspiration added yet. Upload images or add links to get started.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}