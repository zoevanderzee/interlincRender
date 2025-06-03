import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DialogClose,
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
  Loader2,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const DataRoom = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });
  
  // Fetch contracts for reference
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });
  
  // Fetch deleted contracts for "Deleted Projects" folder
  const { data: deletedContracts = [], isLoading: isLoadingDeleted } = useQuery<Contract[]>({
    queryKey: ['/api/deleted-contracts'],
  });
  
  // Fetch users for reference
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Mutation for permanently deleting a contract
  const permanentDeleteMutation = useMutation({
    mutationFn: async (contractId: number) => {
      const response = await apiRequest("DELETE", `/api/contracts/${contractId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to permanently delete the project");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Project Permanently Deleted",
        description: "The project and all associated data has been permanently deleted from the system.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deleted-contracts'] });
      setContractToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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
  
  // Confirmation dialog for permanent deletion
  const ConfirmationDialog = () => {
    if (!contractToDelete) return null;
    
    return (
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center">
              <AlertTriangle className="text-red-500 mr-2" size={20} />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You are about to permanently delete the project <span className="font-semibold text-white">{contractToDelete.contractName}</span>.
              This action cannot be undone and will remove all associated data including milestones, payments, and documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-900/20 border border-red-800/40 p-4 rounded-md my-4">
            <p className="text-red-400 text-sm">
              <span className="font-semibold">Warning:</span> Permanently deleted projects cannot be recovered.
              This data will be completely removed from the system.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setContractToDelete(null);
              }}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-red-900 hover:bg-red-800 text-white"
              onClick={() => contractToDelete && permanentDeleteMutation.mutate(contractToDelete.id)}
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Loading state
  if (isLoadingDocuments || isLoadingContracts || isLoadingUsers || isLoadingDeleted) {
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
          <p className="text-gray-400 mt-1">Secure repository of all automatically generated contracts organized by project</p>
        </div>
      </div>
      
      {/* Render confirmation dialog */}
      <ConfirmationDialog />
      
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
          <TabsTrigger value="contracts" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Contracts</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Compliance Documents</TabsTrigger>
          <TabsTrigger value="deleted" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400">Deleted Projects</TabsTrigger>
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
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white">{contract.contractName}</h3>
                      <p className="text-sm text-gray-400">Contract Code: {contract.contractCode}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            contract.status === 'Active' ? 'bg-green-900 text-green-200' :
                            contract.status === 'Draft' ? 'bg-yellow-900 text-yellow-200' :
                            contract.status === 'completed' ? 'bg-blue-900 text-blue-200' :
                            'bg-gray-900 text-gray-200'
                          }`}>
                            {contract.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Value:</span>
                          <span className="ml-2 text-white font-medium">${parseFloat(contract.value).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Start Date:</span>
                          <span className="ml-2 text-white">{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">End Date:</span>
                          <span className="ml-2 text-white">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProjectSelect(selectedProjectId === contract.id ? null : contract.id)}
                      className="border-gray-700 text-white hover:bg-gray-800 ml-4"
                    >
                      {selectedProjectId === contract.id ? "Hide Details" : "View Details"}
                    </Button>
                  </div>
                  
                  {selectedProjectId === contract.id && (
                    <div className="mt-4 border-t border-gray-800 pt-4">
                      {/* Full Compliance Details */}
                      <div className="mb-6 space-y-4">
                        <h4 className="text-white font-medium mb-3">Contract Details for Compliance</h4>
                        
                        {/* Contract Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="bg-gray-800 p-3 rounded">
                            <span className="text-gray-400 block">Contract ID:</span>
                            <span className="text-white font-mono">{contract.id}</span>
                          </div>
                          <div className="bg-gray-800 p-3 rounded">
                            <span className="text-gray-400 block">Created Date:</span>
                            <span className="text-white">{new Date(contract.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="bg-gray-800 p-3 rounded">
                            <span className="text-gray-400 block">Business ID:</span>
                            <span className="text-white font-mono">{contract.businessId}</span>
                          </div>
                          <div className="bg-gray-800 p-3 rounded">
                            <span className="text-gray-400 block">Contractor ID:</span>
                            <span className="text-white font-mono">{contract.contractorId || 'Not assigned'}</span>
                          </div>
                          {contract.contractorBudget && (
                            <div className="bg-gray-800 p-3 rounded">
                              <span className="text-gray-400 block">Contractor Budget:</span>
                              <span className="text-white font-medium">${parseFloat(contract.contractorBudget).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="bg-gray-800 p-3 rounded">
                            <span className="text-gray-400 block">Total Value:</span>
                            <span className="text-white font-medium">${parseFloat(contract.value).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Project Description */}
                        {contract.description && (
                          <div className="bg-gray-800 p-4 rounded">
                            <span className="text-gray-400 block mb-2">Project Description:</span>
                            <p className="text-white text-sm leading-relaxed">{contract.description}</p>
                          </div>
                        )}

                        {/* Contract Period */}
                        <div className="bg-gray-800 p-4 rounded">
                          <span className="text-gray-400 block mb-2">Contract Period:</span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                            <span className="text-white">
                              From: {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'Not specified'}
                            </span>
                            <span className="text-gray-400 hidden sm:inline">→</span>
                            <span className="text-white">
                              To: {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not specified'}
                            </span>
                            {contract.startDate && contract.endDate && (
                              <span className="text-gray-400 ml-auto">
                                Duration: {Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documents Section */}
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-white font-medium mb-3">Associated Documents</h4>
                        {documents.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-gray-800">
                                <TableHead className="text-gray-400">Document</TableHead>
                                <TableHead className="text-gray-400">Type</TableHead>
                                <TableHead className="text-gray-400">Upload Date</TableHead>
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
                          <div className="text-center py-6 text-gray-400 bg-gray-800 rounded">
                            <p>No contract documents available for this project.</p>
                            <p className="text-sm mt-1">Contract documents are automatically generated when contracts are created.</p>
                          </div>
                        )}
                      </div>
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
              <h3 className="text-lg font-medium text-white mb-2">No Contracts</h3>
              <p className="text-gray-400 mb-6">
                Contracts will appear here automatically when contracts are created in the system.
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
        
        <TabsContent value="deleted">
          {deletedContracts.length > 0 ? (
            <div className="grid gap-6">
              {deletedContracts.map((contract) => (
                <Card key={contract.id} className="border border-gray-800 bg-gray-900 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center">
                        <div className="h-10 w-10 mr-3 bg-red-900/30 border border-red-800/50 text-red-400 rounded-md flex items-center justify-center">
                          <Trash2 size={18} />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-white">{contract.contractName}</h3>
                          <p className="text-sm text-gray-400">Contract Code: {contract.contractCode}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProjectSelect(selectedProjectId === contract.id ? null : contract.id)}
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        {selectedProjectId === contract.id ? "Hide Details" : "View Details"}
                      </Button>
                    </div>
                  </div>
                  
                  {selectedProjectId === contract.id && (
                    <div className="mt-4 border-t border-gray-800 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Project Value</p>
                          <p className="text-white font-medium">${parseFloat(contract.value.toString()).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Deletion Date</p>
                          <p className="text-white font-medium">{formatDate(contract.endDate || new Date())}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Project Status</p>
                          <p className="text-white font-medium">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-800/50">
                              Deleted
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Created On</p>
                          <p className="text-white font-medium">{formatDate(contract.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Description</p>
                        <p className="text-white">{contract.description || "No description available"}</p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <div className="flex justify-end">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setContractToDelete(contract);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="bg-red-900 hover:bg-red-800 text-white"
                          >
                            <Trash2 size={16} className="mr-2" />
                            Permanently Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-gray-800 bg-gray-900 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Deleted Projects</h3>
              <p className="text-gray-400 mb-6">
                Deleted projects will appear here for reference purposes. They remain accessible for compliance and audit needs.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataRoom;
