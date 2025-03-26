import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download,
  ExternalLink,
  FileText
} from "lucide-react";

const Compliance = () => {
  const { toast } = useToast();
  
  // Mock compliance data
  const complianceStatus = [
    {
      id: 1,
      category: "Tax Compliance",
      status: "compliant",
      lastUpdated: "2023-07-15",
      nextReview: "2024-01-15",
      documents: [
        { id: 1, name: "Tax Registration Certificate", status: "valid", expiryDate: "2025-01-01" },
        { id: 2, name: "VAT Returns - Q2 2023", status: "submitted", expiryDate: null },
        { id: 3, name: "Tax Clearance Certificate", status: "valid", expiryDate: "2024-05-15" }
      ]
    },
    {
      id: 2,
      category: "Contractor Documentation",
      status: "attention",
      lastUpdated: "2023-08-02",
      nextReview: "2023-09-15",
      documents: [
        { id: 4, name: "Contractor Agreement - Alex Johnson", status: "expired", expiryDate: "2023-07-31" },
        { id: 5, name: "Contractor Agreement - Sarah Miller", status: "valid", expiryDate: "2024-02-28" },
        { id: 6, name: "Contractor Agreement - TechSolutions Inc", status: "valid", expiryDate: "2024-06-15" }
      ]
    },
    {
      id: 3,
      category: "Payment Regulations",
      status: "compliant",
      lastUpdated: "2023-08-10",
      nextReview: "2024-02-10",
      documents: [
        { id: 7, name: "Payment Processor Compliance Certificate", status: "valid", expiryDate: "2024-08-10" },
        { id: 8, name: "International Payment Regulations Checklist", status: "valid", expiryDate: null }
      ]
    },
    {
      id: 4,
      category: "GDPR & Data Protection",
      status: "pending",
      lastUpdated: "2023-06-20",
      nextReview: "2023-08-30",
      documents: [
        { id: 9, name: "Data Protection Impact Assessment", status: "in_review", expiryDate: null },
        { id: 10, name: "Privacy Policy", status: "valid", expiryDate: "2024-01-01" }
      ]
    }
  ];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'compliant':
      case 'valid':
      case 'submitted':
        return 'bg-success-100 text-success';
      case 'attention':
      case 'expired':
        return 'bg-destructive-100 text-destructive';
      case 'pending':
      case 'in_review':
        return 'bg-warning-100 text-warning';
      default:
        return 'bg-primary-100 text-primary-700';
    }
  };
  
  // Format status text
  const formatStatusText = (status: string) => {
    switch(status) {
      case 'in_review':
        return 'In Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Handle download document
  const handleDownload = (documentName: string) => {
    toast({
      title: "Document downloaded",
      description: `${documentName} has been downloaded.`
    });
  };
  
  // Handle view document
  const handleViewDocument = (documentName: string) => {
    toast({
      title: "Viewing document",
      description: `Opening ${documentName} for viewing.`
    });
  };
  
  // Handle export compliance report
  const handleExportReport = () => {
    toast({
      title: "Report exported",
      description: "Compliance report has been exported successfully."
    });
  };
  
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Compliance Management</h1>
          <p className="text-primary-500 mt-1">Track and manage regulatory compliance for all your contracts</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={handleExportReport}>
            <Download className="mr-2" size={16} />
            Export Compliance Report
          </Button>
        </div>
      </div>
      
      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center text-success">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Compliant</p>
              <h3 className="text-2xl font-semibold text-primary-900">
                {complianceStatus.filter(item => item.status === 'compliant').length}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-warning-50 flex items-center justify-center text-warning">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Pending Review</p>
              <h3 className="text-2xl font-semibold text-primary-900">
                {complianceStatus.filter(item => item.status === 'pending').length}
              </h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border border-primary-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-destructive-50 flex items-center justify-center text-destructive">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-primary-500 text-sm">Needs Attention</p>
              <h3 className="text-2xl font-semibold text-primary-900">
                {complianceStatus.filter(item => item.status === 'attention').length}
              </h3>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Compliance Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Compliance Documents</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card className="border border-primary-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compliance Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Next Review</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceStatus.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Shield className="mr-2 h-5 w-5 text-primary-500" />
                        <span className="font-medium">{item.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(item.status)}`}>
                        {formatStatusText(item.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(item.lastUpdated)}</TableCell>
                    <TableCell>{formatDate(item.nextReview)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-accent-500"
                        onClick={() => toast({
                          title: "Viewing details",
                          description: `Viewing details for ${item.category}`
                        })}
                      >
                        <ExternalLink size={16} className="mr-1" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          
          {/* Upcoming Reviews */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-primary-900 mb-4">Upcoming Reviews</h2>
            <Card className="border border-primary-100">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Review Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceStatus
                    .flatMap(category => 
                      category.documents.map(doc => ({
                        categoryName: category.category,
                        document: doc,
                        reviewDate: category.nextReview
                      }))
                    )
                    .sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime())
                    .slice(0, 5)
                    .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>{item.document.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(item.document.status)}`}>
                            {formatStatusText(item.document.status)}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.reviewDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(item.document.name)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="documents">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {complianceStatus.map((category) => (
              <AccordionItem 
                key={category.id} 
                value={category.id.toString()}
                className="border border-primary-100 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:bg-primary-50">
                  <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full mr-3 flex items-center justify-center ${
                      category.status === 'compliant' ? 'bg-success-50 text-success' :
                      category.status === 'attention' ? 'bg-destructive-50 text-destructive' :
                      'bg-warning-50 text-warning'
                    }`}>
                      {category.status === 'compliant' ? <CheckCircle size={16} /> :
                       category.status === 'attention' ? <AlertCircle size={16} /> :
                       <Clock size={16} />}
                    </div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="mr-2 h-5 w-5 text-primary-500" />
                                {doc.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeClass(doc.status)}`}>
                                {formatStatusText(doc.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {doc.expiryDate ? formatDate(doc.expiryDate) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocument(doc.name)}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(doc.name)}
                                >
                                  <Download size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
        
        <TabsContent value="checklists">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-primary-100 p-6">
              <h3 className="text-lg font-medium text-primary-900 flex items-center mb-4">
                <Shield className="mr-2 h-5 w-5 text-accent-500" />
                Contractor Onboarding Checklist
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Verify contractor identity</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Sign contractor agreement</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Collect tax information</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">Set up payment method</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">Configure access permissions</span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({
                    title: "Checklist downloaded",
                    description: "Contractor onboarding checklist has been downloaded."
                  })}
                >
                  <Download size={16} className="mr-2" />
                  Download Checklist
                </Button>
              </div>
            </Card>
            
            <Card className="border border-primary-100 p-6">
              <h3 className="text-lg font-medium text-primary-900 flex items-center mb-4">
                <Shield className="mr-2 h-5 w-5 text-accent-500" />
                Smart Contract Compliance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Payment terms defined</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Deliverables clearly specified</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Cancellation terms included</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Dispute resolution process</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-warning text-warning flex items-center justify-center mr-3">
                    <AlertCircle size={12} />
                  </div>
                  <span className="text-warning">Data protection clauses</span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({
                    title: "Checklist downloaded",
                    description: "Smart contract compliance checklist has been downloaded."
                  })}
                >
                  <Download size={16} className="mr-2" />
                  Download Checklist
                </Button>
              </div>
            </Card>
            
            <Card className="border border-primary-100 p-6">
              <h3 className="text-lg font-medium text-primary-900 flex items-center mb-4">
                <Shield className="mr-2 h-5 w-5 text-accent-500" />
                Tax Compliance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Contractor tax classification verified</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Tax identification number on file</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Payment reporting compliance</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">International tax treaties applied</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">Tax certificates collected</span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({
                    title: "Checklist downloaded",
                    description: "Tax compliance checklist has been downloaded."
                  })}
                >
                  <Download size={16} className="mr-2" />
                  Download Checklist
                </Button>
              </div>
            </Card>
            
            <Card className="border border-primary-100 p-6">
              <h3 className="text-lg font-medium text-primary-900 flex items-center mb-4">
                <Shield className="mr-2 h-5 w-5 text-accent-500" />
                Data Protection
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Privacy policy in place</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-success text-success flex items-center justify-center mr-3">
                    <CheckCircle size={12} />
                  </div>
                  <span>Data processing agreement signed</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-warning text-warning flex items-center justify-center mr-3">
                    <AlertCircle size={12} />
                  </div>
                  <span className="text-warning">Data protection impact assessment</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">Data breach response plan</span>
                </div>
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-full border border-primary-200 text-primary-400 flex items-center justify-center mr-3">
                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                  </div>
                  <span className="text-primary-500">Access controls implemented</span>
                </div>
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({
                    title: "Checklist downloaded",
                    description: "Data protection checklist has been downloaded."
                  })}
                >
                  <Download size={16} className="mr-2" />
                  Download Checklist
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Compliance;
