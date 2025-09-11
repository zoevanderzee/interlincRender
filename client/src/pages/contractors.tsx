import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { User, Invite } from "@shared/schema";
import { Search, Plus, Mail, Building, Briefcase, UserIcon, ArrowRight, Copy, Share, ExternalLink, CheckCircle2, Fingerprint, CreditCard, Link as LinkIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FindByProfileCodeDialog } from "@/components/contractors/FindByProfileCodeDialog";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const Contractors = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isContractor = user?.role === "contractor";
  const [searchTerm, setSearchTerm] = useState("");
  

  
  // State for direct link dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [directLink, setDirectLink] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [inviteData, setInviteData] = useState<{ id: number, token: string } | null>(null);

  // Use dashboard data for consistency across all pages
  const { data: dashboardData, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['/api/dashboard'],
    enabled: !!user
  });

  // Fetch connection requests to get contractors connected to this business
  const { data: connectionRequests = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/connection-requests'],
    enabled: !isContractor && !!user,
  });
  
  // Get data from dashboard
  const externalWorkers = dashboardData?.contractors || [];
  const businessAccounts = dashboardData?.businesses || [];
  const contracts = dashboardData?.contracts || [];
  const isLoadingBusinesses = isLoadingWorkers;
  
  // Get contractor IDs from accepted connection requests
  const connectedContractorIds = new Set(
    (connectionRequests as any[])
      .filter((req: any) => req.status === 'accepted')
      .map((req: any) => req.contractorId)
  );

  // Filter contractors and freelancers - based on the tabs we've defined
  // "Sub Contractors" tab shows workers with role=contractor AND workerType=contractor
  const subContractors = externalWorkers.filter((worker: User) => 
    worker.role === 'contractor' && worker.workerType === 'contractor' && 
    (isContractor || connectedContractorIds.has(worker.id))
  );
  
  // "Contractors" tab shows workers with role=contractor who are either freelancers or don't have a workerType
  const contractors = externalWorkers.filter((worker: User) => 
    worker.role === 'contractor' && (worker.workerType === 'freelancer' || !worker.workerType || worker.workerType === '') &&
    (isContractor || connectedContractorIds.has(worker.id))
  );
  
  // Keep this for code compatibility - we'll update references from freelancers to contractors
  const freelancers = contractors;

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

  // Filter sub contractors by search term
  const filteredSubContractors = subContractors.filter((contractor: User) => {
    if (!contractor) return false;
    return (
      searchTerm === "" ||
      (contractor.companyName && contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contractor.title && contractor.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contractor.industry && contractor.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Filter regular contractors by search term
  const filteredContractors = contractors.filter((contractor: User) => {
    if (!contractor) return false;
    return (
      searchTerm === "" ||
      (contractor.companyName && contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contractor.title && contractor.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contractor.industry && contractor.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Filter businesses for contractors view
  const filteredBusinesses = businessAccounts.filter((business) => {
    if (!business) return false;
    return (
      searchTerm === "" ||
      (business.companyName && business.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (business.firstName && business.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (business.lastName && business.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (business.industry && business.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
      business.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
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

  // Get work request count for a contractor (updated for new work_requests system)
  const getContractCount = (userId: number) => {
    // Note: The new system uses work_requests with contractorUserId instead of contracts with contractorId
    // Since work requests are not included in dashboard data yet, return 0
    // TODO: Add work_requests to dashboard data and update this function
    return 0;
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  
  // Function to get or create the permanent business onboarding link
  const generateOnboardingLink = async () => {
    try {
      // Directly call the API with proper authentication headers
      const response = await apiRequest("POST", "/api/business/invite-link", {
        workerType: "contractor" // Default to contractor
      });
      const linkData = await response.json();
      
      if (!linkData.url) {
        throw new Error("Failed to get a valid onboarding link");
      }
      
      // Set the permanent link in the state
      setDirectLink(linkData.url);
      
      // Show the link dialog
      setIsLinkDialogOpen(true);
      
      console.log("Retrieved permanent business onboarding link:", linkData);
    } catch (error: any) {
      console.error("Error generating permanent onboarding link:", error);
      
      // Generate a fallback link using a fixed token format
      const currentUser = await queryClient.getQueryData<{id: number, role: string}>(["/api/user"]);
      
      if (currentUser && currentUser.id) {
        const appUrl = window.location.origin;
        const fallbackLink = `${appUrl}/auth?invite=contractor&email=direct&token=fallback-token-${currentUser.id}&businessId=${currentUser.id}&workerType=contractor`;
        
        setDirectLink(fallbackLink);
        setIsLinkDialogOpen(true);
        
        toast({
          title: "Using fallback link",
          description: "The server encountered an issue, but we generated a fallback link for you."
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Could not retrieve permanent onboarding link. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const isLoading = isLoadingWorkers || isLoadingInvites || (isContractor && isLoadingBusinesses);

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
            <div className="bg-green-50 p-4 rounded-md border border-green-100">
              <h3 className="text-sm font-medium flex items-center text-green-800">
                <CheckCircle2 size={16} className="mr-2" />
                Permanent Company Link
              </h3>
              <p className="text-sm mt-1 text-green-700">
                This is your company's permanent onboarding link. It will never change or expire, so you can bookmark it, save it in your hiring documents, or share it with all your workers.
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
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            {isContractor ? "Companies" : "External Workers"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isContractor 
              ? "View companies you work with and their projects" 
              : "Manage your contractors, freelancers, and project collaborators"}
          </p>
        </div>
        {!isContractor && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <FindByProfileCodeDialog 
              trigger={
                <Button variant="outline">
                  <Fingerprint size={16} className="mr-2" />
                  Connect by Code
                </Button>
              }
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
                toast({
                  title: "Connection request sent",
                  description: "We'll notify you when the contractor responds."
                });
              }}
            />
            <Button onClick={() => generateOnboardingLink()}>
              <Plus size={16} className="mr-2" />
              Invite
            </Button>
          </div>
        )}
      </div>

      {/* Tabs for Workers/Companies */}
      <Tabs defaultValue="contractors" className="mb-6">
        <TabsList className="mb-4">
          {isContractor ? (
            <>
              <TabsTrigger value="contractors">Active Companies</TabsTrigger>
              <TabsTrigger value="requests">Company Requests</TabsTrigger>
              <TabsTrigger value="freelancers">Previous Companies</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="contractors">Sub Contractors</TabsTrigger>
              <TabsTrigger value="freelancers">Contractors</TabsTrigger>
              <TabsTrigger value="invites">Pending Invites</TabsTrigger>
            </>
          )}
        </TabsList>
        
        <TabsContent value="contractors">
          {/* Search */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={isContractor ? "Search companies..." : "Search contractors..."}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Contractors/Companies Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="p-5 h-64 bg-zinc-900 border-border"></Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isContractor ? (
                // Companies view for contractors
                filteredBusinesses.map((company) => (
                  <Card 
                    key={company.id} 
                    className="p-5 animate-fade-in hover:animate-glow-pulse transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground mr-3 overflow-hidden">
                          {company.companyLogo ? (
                            <img 
                              src={company.companyLogo} 
                              alt={company.companyName || "Company logo"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building size={32} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {company.companyName || `${company.firstName} ${company.lastName}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">{company.industry || "Business"}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-foreground">
                        {getContractCount(company.id)} {getContractCount(company.id) === 1 ? 'project' : 'projects'}
                      </div>
                    </div>
                    
                    {company.email && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Mail size={16} className="mr-2" />
                        {company.email}
                      </div>
                    )}
                    
                    {(company as any).address && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Building size={16} className="mr-2" />
                        {(company as any).address}
                      </div>
                    )}
                    
                    <div className="border-t border-border pt-3 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-foreground hover:text-white w-full"
                        onClick={() => navigate(`/contracts`)}
                      >
                        View Projects
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                // Sub contractors view for business users (tab value="contractors" is for sub contractors)
                filteredSubContractors.map((contractor) => (
                  <Card 
                    key={contractor.id} 
                    className="p-5 border border-border bg-zinc-900 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground mr-3 overflow-hidden">
                          {contractor.companyLogo ? (
                            <img 
                              src={contractor.companyLogo} 
                              alt={contractor.companyName || "Company logo"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon size={32} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {contractor.firstName} {contractor.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{contractor.title || "Contractor"}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-foreground">
                        {getContractCount(contractor.id)} {getContractCount(contractor.id) === 1 ? 'contract' : 'contracts'}
                      </div>
                    </div>
                  
                    {contractor.industry && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Briefcase size={16} className="mr-2" />
                        {contractor.industry}
                      </div>
                    )}
                  
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <Mail size={16} className="mr-2" />
                      {contractor.email}
                    </div>
                  
                    {contractor.hourlyRate && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <CreditCard size={16} className="mr-2" />
                        ${contractor.hourlyRate}/hr
                      </div>
                    )}
                  
                    <div className="border-t border-border pt-3 mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-foreground hover:text-zinc-100"
                        onClick={() => navigate(`/assign-contractor/${contractor.id}`)}
                      >
                        Assign to Project
                        <ArrowRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
              
              {/* Empty state for business users */}
              {!isContractor && filteredContractors.length === 0 && (
                <EmptyState 
                  icon={UserIcon}
                  title="No contractors found"
                  description={searchTerm ? 
                    "No contractors match your search criteria." : 
                    "Start by inviting contractors to join your projects."}
                  action={
                    <Button onClick={() => navigate("/contractors")}>
                      <Plus size={16} className="mr-2" />
                      Invite Contractors
                    </Button>
                  }
                />
              )}
              
              {/* Empty state for contractors */}
              {isContractor && filteredBusinesses.length === 0 && (
                <EmptyState 
                  icon={Building}
                  title="No companies found"
                  description="You are not currently working with any companies on the platform."
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {/* Connection Requests Display */}
          {isContractor && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Company Connection Requests</h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
                  }}
                >
                  Refresh
                </Button>
              </div>
              
              <ConnectionRequestsList />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="freelancers">
          {/* Search for freelancers tab */}
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search contractors..."
              className="pl-9 bg-zinc-900 border-zinc-700 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <Card className="p-5 h-64 bg-zinc-900 border-border"></Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContractors
                .map((freelancer) => (
                  <Card 
                    key={freelancer.id} 
                    className="p-5 border border-border bg-zinc-900 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground mr-3 overflow-hidden">
                          {freelancer.profileImage ? (
                            <img 
                              src={freelancer.profileImage} 
                              alt={`${freelancer.firstName} ${freelancer.lastName}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon size={32} />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">
                            {freelancer.firstName} {freelancer.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{freelancer.title || "Freelancer"}</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-foreground">
                        {getContractCount(freelancer.id)} {getContractCount(freelancer.id) === 1 ? 'project' : 'projects'}
                      </div>
                    </div>
                    
                    {freelancer.industry && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <Briefcase size={16} className="mr-2" />
                        {freelancer.industry}
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <Mail size={16} className="mr-2" />
                      {freelancer.email}
                    </div>
                    
                    {freelancer.hourlyRate && (
                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <CreditCard size={16} className="mr-2" />
                        ${freelancer.hourlyRate}/hr
                      </div>
                    )}
                    
                    {!isContractor && (
                      <div className="border-t border-border pt-3 mt-3 flex justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                          onClick={() => navigate(`/pay-contractor/${freelancer.id}`)}
                        >
                          <CreditCard size={16} className="mr-1" />
                          Pay
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-foreground hover:text-zinc-100"
                          onClick={() => navigate(`/assign-contractor?contractorId=${freelancer.id}`)}
                        >
                          Assign
                          <ArrowRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
                
                {/* Empty State for Freelancers */}
                {freelancers.length === 0 && (
                  <div className="col-span-full bg-black text-white rounded-lg shadow-sm border border-border p-8 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-white mb-4">
                      <UserIcon size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No freelancers found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm ? 
                        "No freelancers match your search criteria." : 
                        "Start by inviting freelancers to join your projects."}
                    </p>
                    {!isContractor && (
                      <Button onClick={() => navigate("/contractors")}>
                        <Plus size={16} className="mr-2" />
                        Invite Freelancers
                      </Button>
                    )}
                  </div>
                )}
              </div>
          )}
        </TabsContent>
        
        {!isContractor && (
          <TabsContent value="invites">
            <div className="space-y-6">
              <div className="bg-black rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-white">Pending Invitations</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      These are invitations that have been sent but not yet accepted.
                    </p>
                  </div>
                </div>
                
                {isLoadingInvites ? (
                  <div className="animate-pulse p-6">
                    <div className="h-7 bg-zinc-800 rounded w-1/4 mb-3"></div>
                    <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-zinc-800 rounded w-2/4 mb-6"></div>
                    
                    <div className="h-7 bg-zinc-800 rounded w-1/3 mb-3"></div>
                    <div className="h-4 bg-zinc-800 rounded w-3/5 mb-2"></div>
                    <div className="h-4 bg-zinc-800 rounded w-2/5"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-800">
                      <thead className="bg-zinc-900">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Invitation
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Recipient
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Type
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Sent
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-zinc-950 divide-y divide-zinc-800">
                        {allInvites.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                              No pending invitations
                            </td>
                          </tr>
                        ) : (
                          allInvites.map((invite) => (
                            <tr key={invite.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {invite.contractId ? 'Project Invitation' : 'General Invitation'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {invite.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {invite.workerType === 'freelancer' ? 'Freelancer' : 'Contractor'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(invite.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => generateDirectLinkMutation.mutate({ inviteId: invite.id })}
                                  className="text-muted-foreground hover:text-white mr-2"
                                >
                                  <LinkIcon size={14} className="mr-1" />
                                  Get Link
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Connection Requests - Only show for contractors */}
              {isContractor && <ConnectionRequestsList />}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </>
  );
};

export default Contractors;