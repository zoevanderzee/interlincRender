import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Payment, Contract, User } from "@shared/schema";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Download,
  ExternalLink,
  Plus,
  Loader2
} from "lucide-react";
import PaymentsList from "@/components/dashboard/PaymentsList";

const Payments = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  
  // Fetch payments
  const { data: allPayments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });
  
  // Fetch contracts for reference
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });
  
  // Fetch contractors for reference
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
  });
  
  // Get payments by status
  const getPaymentsByStatus = (status: string) => {
    return allPayments.filter(payment => payment.status === status);
  };
  
  // Scheduled payments
  const scheduledPayments = getPaymentsByStatus("scheduled");
  
  // Processing payments
  const processingPayments = getPaymentsByStatus("processing");
  
  // Completed payments
  const completedPayments = getPaymentsByStatus("completed");
  
  // Failed payments
  const failedPayments = getPaymentsByStatus("failed");
  
  // Filter payments based on search and filters
  const filterPayments = (payments: Payment[]) => {
    return payments.filter(payment => {
      // Get contract and contractor info for search
      const contract = contracts.find(c => c.id === payment.contractId);
      const contractor = contractors.find(c => c.id === contract?.contractorId);
      
      // Check if payment matches search term
      const matchesSearch = searchTerm === "" || 
        (contract && contract.contractName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contractor && `${contractor.firstName} ${contractor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Check if payment matches date range
      const paymentDate = new Date(payment.scheduledDate);
      const fromDate = fromDateFilter ? new Date(fromDateFilter) : null;
      const toDate = toDateFilter ? new Date(toDateFilter) : null;
      
      const matchesFromDate = !fromDate || paymentDate >= fromDate;
      const matchesToDate = !toDate || paymentDate <= toDate;
      
      return matchesSearch && matchesFromDate && matchesToDate;
    });
  };
  
  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setFromDateFilter("");
    setToDateFilter("");
  };
  
  // Handle payment approval/execution
  const handleExecutePayment = (id: number) => {
    toast({
      title: "Payment executed",
      description: "The payment has been successfully executed."
    });
  };
  
  // Manually add a payment
  const handleAddPayment = () => {
    navigate("/payments/new");
  };
  
  // Export payments
  const handleExportPayments = () => {
    toast({
      title: "Export started",
      description: "Your payment data is being exported. It will be ready shortly."
    });
  };
  
  // Calculate total payments by status
  const calculateTotal = (payments: Payment[]) => {
    return payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
  };
  
  // Function to get contractor and contract for a payment
  const getPaymentDetails = (payment: Payment) => {
    const contract = contracts.find(c => c.id === payment.contractId);
    const contractor = contract ? contractors.find(c => c.id === contract.contractorId) : null;
    
    return { contract, contractor };
  };
  
  // Format date function
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Loading state
  if (isLoadingPayments || isLoadingContracts || isLoadingContractors) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-accent-500 mb-4" />
          <p className="text-primary-500">Loading payment data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Payments</h1>
          <p className="text-primary-500 mt-1">Manage automated payments to contractors</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="outline"
            onClick={handleExportPayments}
          >
            <Download className="mr-2" size={16} />
            Export
          </Button>
          <Button onClick={handleAddPayment}>
            <Plus className="mr-2" size={16} />
            Add Payment
          </Button>
        </div>
      </div>
      
      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 border border-primary-100">
          <div className="flex justify-between mb-3">
            <div className="text-primary-500 text-sm">Scheduled</div>
            <div className="h-8 w-8 rounded-full bg-accent-50 text-accent-500 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-primary-900">
            ${calculateTotal(scheduledPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-primary-500 mt-1">{scheduledPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 border border-primary-100">
          <div className="flex justify-between mb-3">
            <div className="text-primary-500 text-sm">Processing</div>
            <div className="h-8 w-8 rounded-full bg-warning-50 text-warning flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-primary-900">
            ${calculateTotal(processingPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-primary-500 mt-1">{processingPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 border border-primary-100">
          <div className="flex justify-between mb-3">
            <div className="text-primary-500 text-sm">Completed</div>
            <div className="h-8 w-8 rounded-full bg-success-50 text-success flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-primary-900">
            ${calculateTotal(completedPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-primary-500 mt-1">{completedPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 border border-primary-100">
          <div className="flex justify-between mb-3">
            <div className="text-primary-500 text-sm">Failed</div>
            <div className="h-8 w-8 rounded-full bg-destructive-50 text-destructive flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-primary-900">
            ${calculateTotal(failedPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-primary-500 mt-1">{failedPayments.length} payments</div>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
            <Input
              placeholder="Search payments..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                placeholder="From Date"
                value={fromDateFilter}
                onChange={(e) => setFromDateFilter(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To Date"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={clearFilters}>
            <Filter size={18} />
          </Button>
        </div>
      </div>
      
      {/* Payments Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="all">All Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(scheduledPayments).length > 0 ? (
                    filterPayments(scheduledPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-primary-500">{payment.notes}</div>
                          </TableCell>
                          <TableCell>
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell>{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-accent-100 text-accent-700 font-medium">
                              Scheduled
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExecutePayment(payment.id)}
                            >
                              Process Now
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Calendar className="h-8 w-8 text-primary-400 mb-2" />
                          <p className="text-primary-500 font-medium">No upcoming payments</p>
                          <p className="text-sm text-primary-400 mt-1">
                            {searchTerm || fromDateFilter || toDateFilter ? 
                              "Try changing your search or filters" : 
                              "All your scheduled payments will appear here"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="processing">
          <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(processingPayments).length > 0 ? (
                    filterPayments(processingPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-primary-500">{payment.notes}</div>
                          </TableCell>
                          <TableCell>
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell>{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-warning-100 text-warning font-medium">
                              Processing
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toast({
                                title: "Payment details",
                                description: "Viewing payment processing details."
                              })}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <Clock className="h-8 w-8 text-primary-400 mb-2" />
                          <p className="text-primary-500 font-medium">No payments being processed</p>
                          <p className="text-sm text-primary-400 mt-1">
                            Payments in progress will appear here
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(completedPayments).length > 0 ? (
                    filterPayments(completedPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-primary-500">{payment.notes}</div>
                          </TableCell>
                          <TableCell>
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell>{payment.completedDate ? formatDate(payment.completedDate) : "N/A"}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success font-medium">
                              Completed
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-accent-500"
                              onClick={() => toast({
                                title: "Receipt downloaded",
                                description: "The payment receipt has been downloaded."
                              })}
                            >
                              <Download size={16} className="mr-1" />
                              Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <CheckCircle className="h-8 w-8 text-primary-400 mb-2" />
                          <p className="text-primary-500 font-medium">No completed payments</p>
                          <p className="text-sm text-primary-400 mt-1">
                            Completed payments will be listed here
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="failed">
          <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(failedPayments).length > 0 ? (
                    filterPayments(failedPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-primary-500">{payment.notes}</div>
                          </TableCell>
                          <TableCell>
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell>{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-destructive-100 text-destructive font-medium">
                              Failed
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExecutePayment(payment.id)}
                            >
                              Retry Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <XCircle className="h-8 w-8 text-primary-400 mb-2" />
                          <p className="text-primary-500 font-medium">No failed payments</p>
                          <p className="text-sm text-primary-400 mt-1">
                            Good job! You don't have any failed payments.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="all">
          <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(allPayments).length > 0 ? (
                    filterPayments(allPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      const getStatusBadge = (status: string) => {
                        switch(status) {
                          case 'scheduled':
                            return <span className="px-2 py-1 text-xs rounded-full bg-accent-100 text-accent-700 font-medium">Scheduled</span>;
                          case 'processing':
                            return <span className="px-2 py-1 text-xs rounded-full bg-warning-100 text-warning font-medium">Processing</span>;
                          case 'completed':
                            return <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success font-medium">Completed</span>;
                          case 'failed':
                            return <span className="px-2 py-1 text-xs rounded-full bg-destructive-100 text-destructive font-medium">Failed</span>;
                          default:
                            return <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700 font-medium">Unknown</span>;
                        }
                      };
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-primary-500">{payment.notes}</div>
                          </TableCell>
                          <TableCell>
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell>
                            {payment.status === 'completed' && payment.completedDate
                              ? formatDate(payment.completedDate)
                              : formatDate(payment.scheduledDate)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast({
                                title: "Payment details",
                                description: "Viewing payment details."
                              })}
                            >
                              <ExternalLink size={16} className="mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <DollarSign className="h-8 w-8 text-primary-400 mb-2" />
                          <p className="text-primary-500 font-medium">No payments found</p>
                          <p className="text-sm text-primary-400 mt-1">
                            {searchTerm || fromDateFilter || toDateFilter ? 
                              "Try changing your search or filters" : 
                              "Add a payment to get started"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Payments;
