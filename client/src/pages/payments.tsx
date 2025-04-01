import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
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
  Loader2,
  CreditCard
} from "lucide-react";
import PaymentsList from "@/components/dashboard/PaymentsList";
import PaymentProcessor from "@/components/payments/PaymentProcessor";

const Payments = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDateFilter, setFromDateFilter] = useState("");
  const [toDateFilter, setToDateFilter] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  
  // Check if payment success query parameter is present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const success = searchParams.get('success');
    const paymentId = searchParams.get('payment_id');
    
    if (success === 'true' && paymentId) {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully"
      });
      
      // Clear query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);
  
  // Fetch payments
  const { data: allPayments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery<Payment[]>({
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
  
  // Handle payment approval/execution with Stripe
  const handleExecutePayment = (id: number) => {
    const payment = allPayments.find(p => p.id === id);
    if (payment) {
      setSelectedPayment(payment);
      setPaymentModalOpen(true);
    } else {
      toast({
        title: "Payment Error",
        description: "Could not find the selected payment",
        variant: "destructive"
      });
    }
  };
  
  // Handle payment success
  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    refetchPayments();
    toast({
      title: "Payment Processed",
      description: "The payment has been successfully processed."
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
      {/* Payment Dialog */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-black text-white border border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Process Payment</DialogTitle>
            <DialogDescription>
              Complete the payment using our secure payment processor
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <PaymentProcessor 
              payment={selectedPayment} 
              onSuccess={handlePaymentSuccess}
              onCancel={() => setPaymentModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Payments</h1>
          <p className="text-gray-400 mt-1">Manage automated payments to contractors</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800"
            onClick={handleExportPayments}
          >
            <Download className="mr-2" size={16} />
            Export
          </Button>
          <Button 
            onClick={handleAddPayment}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="mr-2" size={16} />
            Add Payment
          </Button>
        </div>
      </div>
      
      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 bg-black border border-gray-800 text-white">
          <div className="flex justify-between mb-3">
            <div className="text-gray-400 text-sm">Scheduled</div>
            <div className="h-8 w-8 rounded-full bg-indigo-900/30 text-indigo-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-white">
            ${calculateTotal(scheduledPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-gray-400 mt-1">{scheduledPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 bg-black border border-gray-800 text-white">
          <div className="flex justify-between mb-3">
            <div className="text-gray-400 text-sm">Processing</div>
            <div className="h-8 w-8 rounded-full bg-amber-900/30 text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-white">
            ${calculateTotal(processingPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-gray-400 mt-1">{processingPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 bg-black border border-gray-800 text-white">
          <div className="flex justify-between mb-3">
            <div className="text-gray-400 text-sm">Completed</div>
            <div className="h-8 w-8 rounded-full bg-green-900/30 text-green-400 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-white">
            ${calculateTotal(completedPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-gray-400 mt-1">{completedPayments.length} payments</div>
        </Card>
        
        <Card className="p-5 bg-black border border-gray-800 text-white">
          <div className="flex justify-between mb-3">
            <div className="text-gray-400 text-sm">Failed</div>
            <div className="h-8 w-8 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center">
              <XCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-semibold text-white">
            ${calculateTotal(failedPayments).toLocaleString('en-US')}
          </div>
          <div className="text-sm text-gray-400 mt-1">{failedPayments.length} payments</div>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="bg-black p-4 rounded-lg border border-gray-800 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search payments..."
              className="pl-9 bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
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
                className="bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To Date"
                value={toDateFilter}
                onChange={(e) => setToDateFilter(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white"
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={clearFilters}
            className="border-gray-700 text-white hover:bg-gray-800"
          >
            <Filter size={18} />
          </Button>
        </div>
      </div>
      
      {/* Payments Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6 bg-gray-900 border border-gray-800">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-black data-[state=active]:text-white">Upcoming</TabsTrigger>
          <TabsTrigger value="processing" className="data-[state=active]:bg-black data-[state=active]:text-white">Processing</TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-black data-[state=active]:text-white">Completed</TabsTrigger>
          <TabsTrigger value="failed" className="data-[state=active]:bg-black data-[state=active]:text-white">Failed</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-black data-[state=active]:text-white">All Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="text-gray-300">Payment</TableHead>
                    <TableHead className="text-gray-300">Contractor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Scheduled Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(scheduledPayments).length > 0 ? (
                    filterPayments(scheduledPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-800">
                          <TableCell className="text-white">
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-gray-400">{payment.notes}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell className="text-white">{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/30 text-indigo-400 font-medium">
                              Scheduled
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-gray-700 text-white hover:bg-gray-800"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        <div className="flex flex-col items-center">
                          <Calendar className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-white font-medium">No upcoming payments</p>
                          <p className="text-sm text-gray-500 mt-1">
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
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="text-gray-300">Payment</TableHead>
                    <TableHead className="text-gray-300">Contractor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Scheduled Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(processingPayments).length > 0 ? (
                    filterPayments(processingPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-800">
                          <TableCell className="text-white">
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-gray-400">{payment.notes}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell className="text-white">{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-amber-900/30 text-amber-400 font-medium">
                              Processing
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-gray-700 text-white hover:bg-gray-800"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        <div className="flex flex-col items-center">
                          <Clock className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-white font-medium">No payments being processed</p>
                          <p className="text-sm text-gray-500 mt-1">
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
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="text-gray-300">Payment</TableHead>
                    <TableHead className="text-gray-300">Contractor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Completion Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(completedPayments).length > 0 ? (
                    filterPayments(completedPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-800">
                          <TableCell className="text-white">
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-gray-400">{payment.notes}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell className="text-white">{payment.completedDate ? formatDate(payment.completedDate) : "N/A"}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 font-medium">
                              Completed
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:text-white hover:bg-gray-800"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        <div className="flex flex-col items-center">
                          <CheckCircle className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-white font-medium">No completed payments</p>
                          <p className="text-sm text-gray-500 mt-1">
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
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="text-gray-300">Payment</TableHead>
                    <TableHead className="text-gray-300">Contractor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Scheduled Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(failedPayments).length > 0 ? (
                    filterPayments(failedPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-800">
                          <TableCell className="text-white">
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-gray-400">{payment.notes}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell className="text-white">{formatDate(payment.scheduledDate)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 font-medium">
                              Failed
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-gray-700 text-white hover:bg-gray-800"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        <div className="flex flex-col items-center">
                          <XCircle className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-white font-medium">No failed payments</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Great! You don't have any failed payments.
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
          <div className="bg-black rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-gray-800">
                    <TableHead className="text-gray-300">Payment</TableHead>
                    <TableHead className="text-gray-300">Contractor</TableHead>
                    <TableHead className="text-gray-300">Amount</TableHead>
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filterPayments(allPayments).length > 0 ? (
                    filterPayments(allPayments).map((payment) => {
                      const { contract, contractor } = getPaymentDetails(payment);
                      
                      const getStatusBadge = (status: string) => {
                        switch(status) {
                          case 'scheduled':
                            return <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/30 text-indigo-400 font-medium">Scheduled</span>;
                          case 'processing':
                            return <span className="px-2 py-1 text-xs rounded-full bg-amber-900/30 text-amber-400 font-medium">Processing</span>;
                          case 'completed':
                            return <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 font-medium">Completed</span>;
                          case 'failed':
                            return <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 font-medium">Failed</span>;
                          default:
                            return <span className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-400 font-medium">Unknown</span>;
                        }
                      };
                      
                      return (
                        <TableRow key={payment.id} className="border-b border-gray-800">
                          <TableCell className="text-white">
                            <div className="font-medium">{contract?.contractName || "Unknown Contract"}</div>
                            <div className="text-sm text-gray-400">{payment.notes}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {contractor ? `${contractor.firstName} ${contractor.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell className="text-white">
                            <div className="font-medium">${parseFloat(payment.amount.toString()).toLocaleString('en-US')}</div>
                          </TableCell>
                          <TableCell className="text-white">
                            {payment.status === 'completed' && payment.completedDate
                              ? formatDate(payment.completedDate)
                              : formatDate(payment.scheduledDate)}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              switch(payment.status) {
                                case 'scheduled':
                                  return <span className="px-2 py-1 text-xs rounded-full bg-indigo-900/30 text-indigo-400 font-medium">Scheduled</span>;
                                case 'processing':
                                  return <span className="px-2 py-1 text-xs rounded-full bg-amber-900/30 text-amber-400 font-medium">Processing</span>;
                                case 'completed':
                                  return <span className="px-2 py-1 text-xs rounded-full bg-green-900/30 text-green-400 font-medium">Completed</span>;
                                case 'failed':
                                  return <span className="px-2 py-1 text-xs rounded-full bg-red-900/30 text-red-400 font-medium">Failed</span>;
                                default:
                                  return <span className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-400 font-medium">Unknown</span>;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:text-white hover:bg-gray-800"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        <div className="flex flex-col items-center">
                          <DollarSign className="h-8 w-8 text-gray-500 mb-2" />
                          <p className="text-white font-medium">No payments found</p>
                          <p className="text-sm text-gray-500 mt-1">
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
