import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Invite, insertInviteSchema } from "@shared/schema";
import { Search, Plus, Mail, Send, FileText, UserCheck, ArrowRight, User as UserIcon, Building, Briefcase, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const Contractors = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(
    location.includes("?action=invite")
  );

  // Fetch all external workers (both contractors and freelancers)
  const { data: externalWorkers = [], isLoading: isLoadingWorkers } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
  });
  
  // Filter contractors and freelancers
  const contractors = externalWorkers.filter(worker => 
    worker.workerType === 'contractor' || !worker.workerType // Handle existing data without workerType
  );
  
  const freelancers = externalWorkers.filter(worker => 
    worker.workerType === 'freelancer'
  );

  // Fetch pending invites
  const { data: allInvites = [], isLoading: isLoadingInvites } = useQuery<Invite[]>({
    queryKey: ['/api/invites', { pending: true }],
  });
  
  // Filter invites by worker type
  const contractorInvites = allInvites.filter(invite => 
    invite.workerType === 'contractor' || !invite.workerType // Handle existing data without workerType
  );
  
  const freelancerInvites = allInvites.filter(invite => 
    invite.workerType === 'freelancer'
  );

  // Fetch contracts to show count per contractor and for project dropdown
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ['/api/contracts'],
  });

  // Filter contractors by search term
  const filteredContractors = contractors.filter((contractor) => {
    return (
      searchTerm === "" ||
      `${contractor.firstName} ${contractor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contractor.companyName && contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Form schema for new invite
  const formSchema = z.object({
    email: z.string().email("Invalid email address"),
    projectId: z.number().optional(),
    projectName: z.string().min(3, "Project name must be at least 3 characters"),
    workerType: z.enum(["contractor", "freelancer"]),
    paymentAmount: z.string().min(1, "Payment amount is required"),
    businessId: z.number().default(1), // Currently hardcoded to business ID 1
    contractDetails: z.string().optional(),
    message: z.string().optional(),
  });

  // Form for new invite
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      projectId: undefined,
      projectName: "",
      workerType: "contractor",
      paymentAmount: "",
      businessId: 1,
      contractDetails: "",
      message: "We'd like to invite you to join our project. Please sign up to view the details and connect with our team.",
    },
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Create a more detailed contract object if provided
      let contractDetailsString = data.contractDetails;
      if (data.contractDetails) {
        try {
          // Try to parse as JSON if it's a valid JSON string
          JSON.parse(data.contractDetails);
        } catch (e) {
          // If not valid JSON, create a simple JSON object
          contractDetailsString = JSON.stringify({
            description: data.contractDetails
          });
        }
      }
      
      // Create the invite
      const invite: any = {
        email: data.email,
        projectName: data.projectName,
        projectId: data.projectId,
        workerType: data.workerType,
        businessId: data.businessId,
        status: "pending",
        message: data.message,
        contractDetails: contractDetailsString,
        paymentAmount: data.paymentAmount
      };
      
      // Set expiration date to 7 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7);
      invite.expiresAt = expirationDate;
      
      return apiRequest("POST", "/api/invites", invite);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The contractor has been invited to join the project.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
      setIsInviteDialogOpen(false);
      form.reset({
        email: "",
        projectId: undefined,
        projectName: "",
        workerType: "contractor",
        paymentAmount: "",
        businessId: 1,
        contractDetails: "",
        message: "We'd like to invite you to join our project. Please sign up to view the details and connect with our team.",
      });
      
      // Remove the query param
      navigate("/contractors");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not send invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createInviteMutation.mutate(data);
  };

  // Get contract count for a contractor
  const getContractCount = (contractorId: number) => {
    return contracts.filter(c => c.contractorId === contractorId).length;
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsInviteDialogOpen(false);
    navigate("/contractors", { replace: true });
  };
  
  // Function to open the invite dialog with a specific worker type
  const openInviteDialog = (workerType: 'contractor' | 'freelancer') => {
    form.setValue("workerType", workerType);
    setIsInviteDialogOpen(true);
  };

  // Handle project selection
  const handleProjectSelect = (contractId: number) => {
    const selectedContract = contracts.find((c: any) => c.id === contractId);
    if (selectedContract) {
      form.setValue("projectId", selectedContract.id);
      form.setValue("projectName", selectedContract.contractName);
      form.setValue("contractDetails", selectedContract.description || "");
      
      // Format the contract value as payment amount (if available)
      if (selectedContract.value) {
        form.setValue("paymentAmount", String(selectedContract.value));
      }
    }
  };

  const isLoading = isLoadingWorkers || isLoadingInvites || isLoadingContracts;

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">External Workers</h1>
          <p className="text-primary-500 mt-1">Manage your contractors, freelancers, and project collaborators</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.reset()}>
                <Plus size={16} className="mr-2" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Invite to Project</DialogTitle>
                <DialogDescription>
                  Send an invitation to a contractor or freelancer to join your project. They'll receive an email with instructions to create an account.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="worker@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          We'll send an invitation to this email address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Project</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value) {
                                handleProjectSelect(parseInt(value));
                              } else {
                                form.setValue("projectId", undefined);
                                form.setValue("projectName", "");
                                form.setValue("contractDetails", "");
                                form.setValue("paymentAmount", "");
                              }
                            }}
                          >
                            <option value="">Select a project...</option>
                            {contracts.map((contract: any) => (
                              <option key={contract.id} value={contract.id}>
                                {contract.contractName}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          Select an existing project to auto-fill details or enter manually
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Website Redesign" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400">$</span>
                            <Input
                              type="text"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Enter the total payment amount for this worker
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Worker Type</FormLabel>
                        <div className="flex gap-4">
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="radio"
                                checked={field.value === 'contractor'}
                                onChange={() => field.onChange('contractor')}
                                className="w-4 h-4"
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Sub Contractor
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="radio"
                                checked={field.value === 'freelancer'}
                                onChange={() => field.onChange('freelancer')}
                                className="w-4 h-4"
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Freelancer
                            </FormLabel>
                          </FormItem>
                        </div>
                        <FormDescription>
                          Select whether you're inviting a sub contractor or an individual freelancer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contractDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Details (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the project scope, timeline, and compensation details..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add a personal note to the worker..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createInviteMutation.isPending}
                    >
                      {createInviteMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs for Workers Types and Invites */}
      <Tabs defaultValue="contractors" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="contractors">Sub Contractors</TabsTrigger>
          <TabsTrigger value="freelancers">Freelancers</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contractors">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
            <Input
              placeholder="Search contractors..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Contractors Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="p-5 h-64"></Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContractors.map((contractor) => (
                <Card 
                  key={contractor.id} 
                  className="p-5 border border-primary-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                        {contractor.profileImageUrl ? (
                          <img 
                            src={contractor.profileImageUrl} 
                            alt={`${contractor.firstName} ${contractor.lastName}`}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary-900">
                          {contractor.firstName} {contractor.lastName}
                        </h3>
                        <p className="text-sm text-primary-500">{contractor.title}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-primary-100 rounded-md text-xs font-medium text-primary-700">
                      {getContractCount(contractor.id)} {getContractCount(contractor.id) === 1 ? 'contract' : 'contracts'}
                    </div>
                  </div>
                  
                  {contractor.companyName && (
                    <div className="flex items-center text-sm text-primary-600 mb-3">
                      <Building size={16} className="mr-2" />
                      {contractor.companyName}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-primary-600 mb-3">
                    <Mail size={16} className="mr-2" />
                    {contractor.email}
                  </div>
                  
                  <div className="flex items-center text-sm text-primary-600 mb-4">
                    <Briefcase size={16} className="mr-2" />
                    {contractor.title}
                  </div>
                  
                  <div className="flex justify-between mt-auto pt-4 border-t border-primary-100">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/contractors/${contractor.id}`)}
                    >
                      <UserCheck size={16} className="mr-1" />
                      Profile
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/contracts?contractor=${contractor.id}`)}
                    >
                      <FileText size={16} className="mr-1" />
                      Contracts
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-accent-500 hover:text-accent-600 hover:bg-accent-50"
                      onClick={() => navigate(`/contracts/new?contractor=${contractor.id}`)}
                    >
                      Assign
                      <ArrowRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {/* Empty state */}
              {filteredContractors.length === 0 && (
                <div className="col-span-full bg-black text-white rounded-lg shadow-sm border border-zinc-800 p-8 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white mb-4">
                    <UserIcon size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No contractors found</h3>
                  <p className="text-zinc-400 mb-6">
                    {searchTerm ? 
                      "No contractors match your search criteria." : 
                      "You don't have any active contractors yet. Send invites to start collaborating."}
                  </p>
                  {searchTerm ? (
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Clear Search
                    </Button>
                  ) : (
                    <Button onClick={() => openInviteDialog('contractor')}>
                      <Send size={16} className="mr-2" />
                      Invite Sub Contractor
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="freelancers">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
            <Input
              placeholder="Search freelancers..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Freelancers Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="p-5 h-64"></Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freelancers.map((freelancer) => (
                <Card 
                  key={freelancer.id} 
                  className="p-5 border border-primary-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                        {freelancer.profileImageUrl ? (
                          <img 
                            src={freelancer.profileImageUrl} 
                            alt={`${freelancer.firstName} ${freelancer.lastName}`}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon size={24} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary-900">
                          {freelancer.firstName} {freelancer.lastName}
                        </h3>
                        <p className="text-sm text-primary-500">{freelancer.title}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-primary-100 rounded-md text-xs font-medium text-primary-700">
                      {getContractCount(freelancer.id)} {getContractCount(freelancer.id) === 1 ? 'contract' : 'contracts'}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-primary-600 mb-3">
                    <Mail size={16} className="mr-2" />
                    {freelancer.email}
                  </div>
                  
                  {freelancer.title && (
                    <div className="flex items-center text-sm text-primary-600 mb-4">
                      <Briefcase size={16} className="mr-2" />
                      {freelancer.title}
                    </div>
                  )}
                  
                  <div className="flex justify-between mt-auto pt-4 border-t border-primary-100">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/contractors/${freelancer.id}`)}
                    >
                      <UserCheck size={16} className="mr-1" />
                      Profile
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/contracts?contractor=${freelancer.id}`)}
                    >
                      <FileText size={16} className="mr-1" />
                      Contracts
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-accent-500 hover:text-accent-600 hover:bg-accent-50"
                      onClick={() => navigate(`/contracts/new?contractor=${freelancer.id}`)}
                    >
                      Assign
                      <ArrowRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}
              
              {/* Empty state */}
              {freelancers.length === 0 && (
                <div className="col-span-full bg-black text-white rounded-lg shadow-sm border border-zinc-800 p-8 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white mb-4">
                    <UserIcon size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No freelancers found</h3>
                  <p className="text-zinc-400 mb-6">
                    You don't have any active freelancers yet. Send invites to start collaborating.
                  </p>
                  <Button onClick={() => openInviteDialog('freelancer')}>
                    <Send size={16} className="mr-2" />
                    Invite Freelancer
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="invites">
          {/* Invites List */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="p-5 h-28"></Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {allInvites.map((invite) => (
                <Card
                  key={invite.id}
                  className="p-5 border border-primary-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="flex items-center mb-2">
                        <h3 className="font-semibold text-primary-900 mr-3">
                          {invite.email}
                        </h3>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-medium">
                            Pending
                          </span>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            invite.workerType === 'freelancer' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {invite.workerType === 'freelancer' ? 'Freelancer' : 'Sub Contractor'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-primary-600 mb-2">
                        <span className="font-medium">Project: </span>
                        {invite.projectName}
                      </p>
                      {invite.paymentAmount && (
                        <p className="text-sm text-primary-600 mb-2">
                          <span className="font-medium">Payment: </span>
                          ${invite.paymentAmount}
                        </p>
                      )}
                      <div className="flex items-center text-xs text-primary-500">
                        <Clock size={14} className="mr-1" />
                        Sent on {formatDate(invite.createdAt)} • Expires {formatDate(invite.expiresAt)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary-600"
                        onClick={() => {
                          // Re-send invitation logic
                          toast({
                            title: "Invitation resent",
                            description: "The invitation has been sent again to " + invite.email,
                          });
                        }}
                      >
                        <Send size={14} className="mr-1" />
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          // Cancel invitation logic
                          // This would typically call an API to update the invite status
                          apiRequest("PATCH", `/api/invites/${invite.id}`, { status: "cancelled" })
                            .then(() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
                              toast({
                                title: "Invitation cancelled",
                                description: "The invitation has been cancelled.",
                              });
                            })
                            .catch((error) => {
                              toast({
                                title: "Error",
                                description: "Failed to cancel invitation. Please try again.",
                                variant: "destructive",
                              });
                            });
                        }}
                      >
                        <XCircle size={14} className="mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Empty state for invites */}
              {allInvites.length === 0 && (
                <div className="col-span-full bg-black text-white rounded-lg shadow-sm border border-zinc-800 p-8 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white mb-4">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No pending invites</h3>
                  <p className="text-zinc-400 mb-6">
                    You haven't sent any invitations to contractors or freelancers yet.
                  </p>
                  <Button onClick={() => openInviteDialog('contractor')}>
                    <Send size={16} className="mr-2" />
                    Send New Invitation
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Contractors;
