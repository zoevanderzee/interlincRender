import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Document, Contract, User } from "@shared/schema";
import { 
  Search, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  File, 
  Image, 
  FileArchive, 
  Filter,
  Folder,
  Plus,
  Loader2
} from "lucide-react";

const DataRoom = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState<number | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });
  
  // Fetch contracts for reference
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });
  
  // Fetch users for reference
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Filter documents by search term
  const filteredDocuments = documents.filter((doc) => {
    return searchTerm === "" || 
      doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });
  
  // Get contract by id
  const getContract = (contractId: number) => {
    return contracts.find(contract => contract.id === contractId);
  };
  
  // Get user by id
  const getUser = (userId: number) => {
    return users.find(user => user.id === userId);
  };
  
  // Get document icon by file type
  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('image')) {
      return <Image size={20} />;
    } else if (fileType.includes('pdf')) {
      return <FileText size={20} />;
    } else if (fileType.includes('zip') || fileType.includes('rar')) {
      return <FileArchive size={20} />;
    } else {
      return <File size={20} />;
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format file size
  const formatFileSize = (size: number) => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Handle file upload
  const handleUpload = () => {
    if (!selectedFile || !uploadingContract) {
      toast({
        title: "Upload error",
        description: "Please select a file and contract",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadingContract(null);
      setUploadDescription("");
      
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully",
      });
    }, 1500);
  };
  
  // Handle document download
  const handleDownload = (document: Document) => {
    toast({
      title: "Download started",
      description: `Downloading ${document.fileName}`,
    });
  };
  
  // Handle document deletion
  const handleDelete = (documentId: number) => {
    toast({
      title: "Document deleted",
      description: "The document has been deleted successfully",
    });
  };
  
  // Handle document preview
  const handlePreview = (document: Document) => {
    toast({
      title: "Document preview",
      description: `Previewing ${document.fileName}`,
    });
  };
  
  // Loading state
  if (isLoadingDocuments || isLoadingContracts || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
      </div>
    );
  }
  
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Data Room</h1>
          <p className="text-primary-500 mt-1">Secure storage for all your contract documents</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2" size={16} />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a document to the secure data room. All files are encrypted and stored securely.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="contract" className="text-sm font-medium text-primary-900">
                    Related Contract
                  </label>
                  <select 
                    id="contract"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={uploadingContract || ""}
                    onChange={(e) => setUploadingContract(parseInt(e.target.value))}
                  >
                    <option value="">Select a contract</option>
                    {contracts.map(contract => (
                      <option key={contract.id} value={contract.id}>
                        {contract.contractName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="description" className="text-sm font-medium text-primary-900">
                    Document Description
                  </label>
                  <Input
                    id="description"
                    placeholder="Enter a description of the document"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="file" className="text-sm font-medium text-primary-900">
                    File
                  </label>
                  <div className="border-2 border-dashed border-primary-200 rounded-md px-6 py-8 text-center">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <FileText className="mx-auto h-8 w-8 text-primary-500" />
                        <p className="text-sm text-primary-900 font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-primary-500">{formatFileSize(selectedFile.size)}</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-primary-500 mb-2" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm text-primary-900 font-medium">
                            Drag 'n' drop a file here, or click to select a file
                          </p>
                          <p className="text-xs text-primary-500">
                            Supports PDFs, Word docs, Excel, images, and more. Max 10MB.
                          </p>
                        </div>
                        <Input 
                          id="file"
                          type="file"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => document.getElementById('file')?.click()}
                          className="mt-4"
                        >
                          Select File
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadingContract || isUploading}
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Document Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
        <Input
          placeholder="Search documents..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Document Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Documents</TabsTrigger>
          <TabsTrigger value="contracts">Contract Documents</TabsTrigger>
          <TabsTrigger value="invoices">Invoices & Receipts</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {filteredDocuments.length > 0 ? (
            <Card className="border border-primary-100">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Related Contract</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => {
                      const contract = getContract(document.contractId);
                      const uploader = getUser(document.uploadedBy);
                      
                      return (
                        <TableRow key={document.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="h-8 w-8 mr-3 bg-primary-100 text-primary-700 rounded-md flex items-center justify-center">
                                {getDocumentIcon(document.fileType)}
                              </div>
                              <div>
                                <div className="font-medium">{document.fileName}</div>
                                {document.description && (
                                  <div className="text-xs text-primary-500">{document.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{contract?.contractName || "Unknown"}</TableCell>
                          <TableCell>{document.fileType.split('/')[1].toUpperCase()}</TableCell>
                          <TableCell>{uploader ? `${uploader.firstName} ${uploader.lastName}` : "Unknown"}</TableCell>
                          <TableCell>{formatDate(document.uploadedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handlePreview(document)}
                                title="Preview"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDownload(document)}
                                title="Download"
                              >
                                <Download size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(document.id)}
                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <Card className="border border-primary-100 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
                <Folder size={24} />
              </div>
              <h3 className="text-lg font-medium text-primary-900 mb-2">No documents found</h3>
              <p className="text-primary-500 mb-6">
                {searchTerm ? "No documents match your search criteria." : "Start by uploading your first document."}
              </p>
              {searchTerm ? (
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Upload Document
                </Button>
              )}
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="contracts">
          <Card className="border border-primary-100 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">Contract Documents</h3>
            <p className="text-primary-500 mb-6">
              All contract-related documents will appear here.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Upload Contract Document
            </Button>
          </Card>
        </TabsContent>
        
        <TabsContent value="invoices">
          <Card className="border border-primary-100 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">Invoices & Receipts</h3>
            <p className="text-primary-500 mb-6">
              All payment-related documents will appear here.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Upload Invoice or Receipt
            </Button>
          </Card>
        </TabsContent>
        
        <TabsContent value="compliance">
          <Card className="border border-primary-100 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-primary-900 mb-2">Compliance Documents</h3>
            <p className="text-primary-500 mb-6">
              All compliance-related documents will appear here.
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Upload Compliance Document
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default DataRoom;
