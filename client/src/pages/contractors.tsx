import { useState, useMemo, useRef } from "react";
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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, Invite, insertInviteSchema } from "@shared/schema";
import { Search, Plus, Mail, Send, FileText, UserCheck, ArrowRight, User as UserIcon, Building, Briefcase, Loader2, Clock, CheckCircle2, XCircle, CreditCard, ExternalLink, Copy, Link2, Share } from "lucide-react";
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
  // Double-check that users have 'contractor' role to ensure business accounts don't show up here
  const contractors = externalWorkers.filter(worker => 
    worker.role === 'contractor' && (worker.workerType === 'contractor' || !worker.workerType)
  );
  
  const freelancers = externalWorkers.filter(worker => 
    worker.role === 'contractor' && worker.workerType === 'freelancer'
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
      (contractor.companyName && contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contractor.industry && contractor.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // We've removed the project-specific invitation form

  // State for direct link dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [directLink, setDirectLink] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [inviteData, setInviteData] = useState<{ id: number, token: string } | null>(null);
  
  // Removed project-specific invitation mutation
  // We now only use the generateOnboardingLink function for company-wide invitations
  
  // Generate a direct link for an invitation
  const generateDirectLinkMutation = useMutation({
    mutationFn: async ({ inviteId }: { inviteId: number }) => {
      const response = await apiRequest("POST", `/api/invites/${inviteId}/generate-link`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // Create the direct link
      const baseUrl = window.location.origin;
      const directLinkUrl = `${baseUrl}/work-request-respond?token=${data.token}`;
      
      setDirectLink(directLinkUrl);
      setInviteData({ id: data.inviteId, token: data.token });
      setIsLinkDialogOpen(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not generate direct link. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Function to copy a link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied",
        description: "The invitation link has been copied to clipboard.",
      });
    }).catch(err => {
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to copy: ', err);
    });
  };

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
  
  // Function to directly generate onboarding link
  const generateOnboardingLink = async () => {
    try {
      // Create a basic invite with minimal information
      const invite: Partial<Invite> = {
        email: `onboarding-${Date.now()}@invitation.local`,
        workerType: "contractor", // Default to contractor, user can change later
        businessId: 1, // Use the current business ID
        status: "pending",
        message: "You have been invited to join our platform as a worker. Please sign up to connect with our team.",
        // Set expiration date to 30 days from now
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        projectName: "Onboarding"
      };
      
      // Create the invite
      const response = await apiRequest("POST", "/api/invites", invite);
      const data = await response.json();
      
      // Generate the link immediately
      const linkResponse = await apiRequest("POST", `/api/invites/${data.id}/generate-link`, {});
      const linkData = await linkResponse.json();
      
      // Create the direct onboarding link
      const baseUrl = window.location.origin;
      const directLinkUrl = `${baseUrl}/work-request-respond?token=${linkData.token}`;
      
      // Set the link in the state
      setDirectLink(directLinkUrl);
      setInviteData({ id: data.inviteId, token: linkData.token });
      
      // Show the link dialog
      setIsLinkDialogOpen(true);
      
      // Refresh invites list
      queryClient.invalidateQueries({ queryKey: ['/api/invites'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not generate onboarding link. Please try again.",
        variant: "destructive",
      });
    }
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
      {/* Direct Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Worker Onboarding Link</DialogTitle>
            <DialogDescription>
              Share this unique onboarding link with freelancers or contractors to invite them to your company's database. Once they register, you'll be able to assign them to projects.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Input
                ref={linkInputRef}
                value={directLink}
                readOnly
                className="pr-20"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="absolute right-1 top-1"
                      onClick={() => copyToClipboard(directLink)}
                    >
                      <Copy size={14} />
                      <span className="ml-1">Copy</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
              <h3 className="text-sm font-medium flex items-center">
                <Share size={16} className="mr-2" />
                How to share this link
              </h3>
              <p className="text-sm mt-1 text-primary-700">
                Send this link to your freelancer or contractor via any messaging platform (email, Slack, text message, etc.). When they click the link, they'll be able to sign up and join your project.
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
              <h3 className="text-sm font-medium flex items-center text-amber-800">
                <Clock size={16} className="mr-2" />
                Important
              </h3>
              <p className="text-sm mt-1 text-amber-700">
                This invitation link will expire in 7 days. Make sure your contact uses it before then.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.open(directLink, '_blank')}>
              <ExternalLink size={14} className="mr-2" />
              Open Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">External Workers</h1>
          <p className="text-primary-500 mt-1">Manage your contractors, freelancers, and project collaborators</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button onClick={() => generateOnboardingLink()}>
            <Plus size={16} className="mr-2" />
            Invite
          </Button>
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
                      <div className="h-16 w-16 rounded-md bg-primary-100 flex items-center justify-center text-primary-600 mr-3 overflow-hidden">
                        {contractor.companyLogo ? (
                          <img 
                            src={contractor.companyLogo} 
                            alt={contractor.companyName || "Company logo"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Building size={32} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary-900">
                          {contractor.companyName || "Company Name"}
                        </h3>
                        <p className="text-sm text-primary-500">{contractor.title}</p>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-primary-100 rounded-md text-xs font-medium text-primary-700">
                      {getContractCount(contractor.id)} {getContractCount(contractor.id) === 1 ? 'contract' : 'contracts'}
                    </div>
                  </div>
                  
                  {contractor.industry && (
                    <div className="flex items-center text-sm text-primary-600 mb-3">
                      <Building size={16} className="mr-2" />
                      {contractor.industry}
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
                  
                  <div className="flex flex-wrap justify-between mt-auto pt-4 border-t border-primary-100 gap-2">
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
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border-0"
                      onClick={() => navigate(`/contractors/${contractor.id}/connect`)}
                    >
                      <CreditCard size={16} className="mr-1" />
                      Connect
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
                  
                  <div className="flex flex-wrap justify-between mt-auto pt-4 border-t border-primary-100 gap-2">
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
                      variant="outline"
                      size="sm"
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border-0"
                      onClick={() => navigate(`/contractors/${freelancer.id}/connect`)}
                    >
                      <CreditCard size={16} className="mr-1" />
                      Connect
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
