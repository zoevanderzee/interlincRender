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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
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
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
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
  
  // Handle project selection
  const handleProjectSelect = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };
  
  // Group documents by project/contract
  const documentsByProject = contracts.map(contract => {
    const projectDocs = documents.filter(doc => doc.contractId === contract.id);
    return {
      contract,
      documents: projectDocs
    };
  });
  
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
    <div className="bg-black text-white min-h-screen p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Data Room</h1>
          <p className="text-gray-400 mt-1">Secure repository of all automatically generated smart contracts organized by project</p>
        </div>
      </div>
      
      {/* Document Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search documents..."
          className="pl-9 bg-gray-900 border-gray-700 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Document Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-gray-900 border border-gray-800">
          <TabsTrigger value="all" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">All Documents</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Smart Contracts</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Compliance Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {filteredDocuments.length > 0 ? (
            <Card className="border border-gray-800 bg-gray-900 text-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-400">Document Name</TableHead>
                      <TableHead className="text-gray-400">Related Contract</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Uploaded By</TableHead>
                      <TableHead className="text-gray-400">Upload Date</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((document) => {
                      const contract = getContract(document.contractId);
                      const uploader = getUser(document.uploadedBy);
                      
                      return (
                        <TableRow key={document.id} className="border-gray-800">
                          <TableCell>
                            <div className="flex items-center">
                              <div className="h-8 w-8 mr-3 bg-gray-800 text-white rounded-md flex items-center justify-center">
                                {getDocumentIcon(document.fileType)}
                              </div>
                              <div>
                                <div className="font-medium text-white">{document.fileName}</div>
                                {document.description && (
                                  <div className="text-xs text-gray-400">{document.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white">{contract?.contractName || "Unknown"}</TableCell>
                          <TableCell className="text-white">{document.fileType.split('/')[1].toUpperCase()}</TableCell>
                          <TableCell className="text-white">{uploader ? `${uploader.firstName} ${uploader.lastName}` : "Unknown"}</TableCell>
                          <TableCell className="text-white">{formatDate(document.uploadedAt || new Date())}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handlePreview(document)}
                                title="Preview"
                                className="text-white hover:text-white hover:bg-gray-800"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDownload(document)}
                                title="Download"
                                className="text-white hover:text-white hover:bg-gray-800"
                              >
                                <Download size={16} />
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
            <Card className="border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                <Folder size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No documents found</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm ? "No documents match your search criteria." : "Documents will appear here automatically when contracts are created."}
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm("")}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  Clear Search
                </Button>
              )}
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="contracts">
          {contracts.length > 0 ? (
            <div className="grid gap-6">
              {documentsByProject.map(({ contract, documents }) => (
                <Card key={contract.id} className="border border-gray-800 bg-gray-900 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">{contract.contractName}</h3>
                      <p className="text-sm text-gray-400">Contract Code: {contract.contractCode}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProjectSelect(selectedProjectId === contract.id ? null : contract.id)}
                      className="border-gray-700 text-white hover:bg-gray-800"
                    >
                      {selectedProjectId === contract.id ? "Hide Details" : "View Details"}
                    </Button>
                  </div>
                  
                  {selectedProjectId === contract.id && (
                    <div className="mt-4 border-t border-gray-800 pt-4">
                      {documents.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-800">
                              <TableHead className="text-gray-400">Document</TableHead>
                              <TableHead className="text-gray-400">Type</TableHead>
                              <TableHead className="text-gray-400">Date</TableHead>
                              <TableHead className="text-gray-400 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {documents.map((document) => (
                              <TableRow key={document.id} className="border-gray-800">
                                <TableCell>
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 mr-3 bg-gray-800 text-white rounded-md flex items-center justify-center">
                                      {getDocumentIcon(document.fileType)}
                                    </div>
                                    <div>
                                      <div className="font-medium text-white">{document.fileName}</div>
                                      {document.description && (
                                        <div className="text-xs text-gray-400">{document.description}</div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-white">{document.fileType.split('/')[1].toUpperCase()}</TableCell>
                                <TableCell className="text-white">{formatDate(document.uploadedAt || new Date())}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handlePreview(document)}
                                      title="Preview"
                                      className="text-white hover:text-white hover:bg-gray-800"
                                    >
                                      <Eye size={16} />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleDownload(document)}
                                      title="Download"
                                      className="text-white hover:text-white hover:bg-gray-800"
                                    >
                                      <Download size={16} />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <p>No smart contract documents available for this project.</p>
                          <p className="text-sm mt-1">Smart contracts are automatically generated when contracts are created.</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Smart Contracts</h3>
              <p className="text-gray-400 mb-6">
                Smart contracts will appear here automatically when contracts are created in the system.
              </p>
            </Card>
          )}
        </TabsContent>
        

        <TabsContent value="compliance">
          <Card className="border border-gray-800 bg-gray-900 p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Compliance Documents</h3>
            <p className="text-gray-400 mb-6">
              Compliance documents are automatically generated to ensure legal and regulatory requirements are met.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataRoom;
