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
// V1 ConnectionRequestsList removed - using V2 data only
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const Contractors = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isContractor = user?.role === "contractor";
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingCompany, setViewingCompany] = useState<any>(null);
  const [viewingContractor, setViewingContractor] = useState<any>(null);



  // State for direct link dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [directLink, setDirectLink] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [inviteData, setInviteData] = useState<{ id: number, token: string } | null>(null);

  // V2 ONLY: Use dashboard data for consistency across all pages
  const { data: dashboardData, isLoading: isLoadingWorkers } = useQuery({
    queryKey: ['/api/dashboard'],
    enabled: !!user
  });

  // Fetch connection requests (both sent and received)
  const { data: connectionRequests = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/connection-requests'],
    enabled: !!user
  });

  // Fetch connected contractors from secure endpoint (business users only)
  const { data: connectedContractorsFromAPI = [], isLoading: isLoadingConnectedContractors } = useQuery({
    queryKey: ['/api/connected-contractors'],
    enabled: !!user && !isContractor
  });

  // Fetch connected businesses from secure endpoint (contractor users only)
  const { data: connectedBusinessesFromAPI = [], isLoading: isLoadingConnectedBusinesses } = useQuery({
    queryKey: ['/api/connected-businesses'],
    enabled: !!user && isContractor
  });

  // Get data from dashboard - use empty arrays as fallbacks since these properties may not exist
  const externalWorkers = (dashboardData as any)?.contractors || [];
  const businessAccounts = (dashboardData as any)?.businesses || [];
  const contracts = (dashboardData as any)?.contracts || [];
  const workRequests = (dashboardData as any)?.workRequests || [];
  const isLoadingBusinesses = isLoadingWorkers;

  // For contractors, merge connected businesses from API with dashboard businesses
  const connectedCompanies = isContractor ? (() => {
    const businessMap = new Map();
    
    // Add businesses from dashboard first
    businessAccounts.forEach((business: any) => {
      businessMap.set(business.id, business);
    });
    
    // Add businesses from connection requests API (will overwrite if duplicate)
    connectedBusinessesFromAPI.forEach((business: any) => {
      businessMap.set(business.id, business);
    });
    
    return Array.from(businessMap.values());
  })() : [];

  console.log('Debug contractor businesses:', {
    isContractor,
    businessAccountsLength: businessAccounts?.length,
    businessAccounts: businessAccounts,
    dashboardData: dashboardData
  });

  // For business users, merge contractors from API with existing dashboard contractors
  let allBusinessContractors: User[] = [];
  if (!isContractor && user) {
    // Merge with existing contractors from dashboard (deduplicate by ID)
    const contractorMap = new Map<number, User>();
    
    // Add contractors from dashboard first
    externalWorkers.forEach((worker: User) => {
      contractorMap.set(worker.id, worker);
    });
    
    // Add contractors from connection requests API (will overwrite if duplicate)
    connectedContractorsFromAPI.forEach((contractor: any) => {
      contractorMap.set(contractor.id, contractor);
    });
    
    allBusinessContractors = Array.from(contractorMap.values());
  }

  // All contractors from dashboard are already connected
  const connectedContractorIds = new Set(
    externalWorkers.map((worker: User) => worker.id)
  );

  // Filter contractors and freelancers - based on the tabs we've defined
  // "Sub Contractors" tab shows workers with role=contractor AND workerType=contractor
  const subContractors = !isContractor 
    ? allBusinessContractors.filter((worker: User) => 
        worker.role === 'contractor' && worker.workerType === 'contractor'
      )
    : externalWorkers.filter((worker: User) => 
        worker.role === 'contractor' && worker.workerType === 'contractor'
      );

  // "Contractors" tab shows workers with role=contractor who are either freelancers or don't have a workerType
  const contractors = !isContractor
    ? allBusinessContractors.filter((worker: User) => 
        worker.role === 'contractor' && (worker.workerType === 'freelancer' || !worker.workerType || worker.workerType === '')
      )
    : externalWorkers.filter((worker: User) => 
        worker.role === 'contractor' && (worker.workerType === 'freelancer' || !worker.workerType || worker.workerType === '')
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
  const filteredBusinesses = connectedCompanies.filter((business) => {
    if (!business) return false;
    return (
      searchTerm === "" ||
      (business.companyName && business.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (business.businessName && business.businessName.toLowerCase().includes(searchTerm.toLowerCase())) ||
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

  // Update connection request status (accept/decline)
  const updateConnectionRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: 'accepted' | 'declined' }) => {
      const response = await apiRequest("PATCH", `/api/connection-requests/${requestId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Connection request updated",
        description: "The connection request has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update connection request. Please try again.",
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
    if (!user) return 0;
    
    if (isContractor) {
      // For contractors, count contracts where the business is the given userId AND the contractor is the logged-in user
      return contracts.filter((contract: any) => 
        contract.businessUserId === userId && contract.contractorUserId === user.id
      ).length;
    } else {
      // For businesses, count work requests sent to the given contractor from the logged-in business
      return workRequests.filter((wr: any) => 
        wr.contractorUserId === userId && wr.businessUserId === user.id
      ).length;
    }
  };

  // Format date for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Function to generate the permanent company onboarding link
  const generateOnboardingLink = async () => {
    try {
      const response = await apiRequest("GET", "/api/business-onboarding-link", {});

      if (!response.ok) {
        throw new Error("Failed to get onboarding link");
      }

      const data = await response.json();
      const onboardingUrl = data.inviteUrl;

      setDirectLink(onboardingUrl);
      setIsLinkDialogOpen(true);

      console.log("Generated permanent company onboarding link:", onboardingUrl);

      toast({
        title: "Onboarding Link Ready",
        description: `Share this link with contractors to join ${user?.companyName || 'your company'}.`,
      });
    } catch (error: any) {
      console.error("Error generating permanent onboarding link:", error);
      toast({
        title: "Error",
        description: error.message || "Could not generate onboarding link. Please try again.",
        variant: "destructive",
      });
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

        {/* Profile Code and Connect Button - Show for both contractors and businesses */}
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row md:items-center gap-4">
          {/* Profile Code Display/Generate */}
          {user?.profileCode ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-lg px-4 py-2">
              <Fingerprint size={16} className="text-indigo-400" />
              <span className="text-sm text-zinc-400">Your Code:</span>
              <code className="font-mono text-white font-semibold">{user.profileCode}</code>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(user.profileCode || '');
                        toast({
                          title: "Code copied",
                          description: `Share this code with ${isContractor ? 'companies' : 'contractors'} to connect.`
                        });
                      }}
                      data-testid="button-copy-code"
                    >
                      <Copy size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy your profile code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await apiRequest("POST", "/api/profile-code/generate", {});
                  const data = await response.json();
                  if (data.code) {
                    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
                    toast({
                      title: "Profile code generated",
                      description: `Your code is ${data.code}. Share it with ${isContractor ? 'companies' : 'contractors'} to connect.`
                    });
                  }
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to generate profile code",
                    variant: "destructive"
                  });
                }
              }}
              data-testid="button-generate-code"
            >
              <Fingerprint size={16} className="mr-2" />
              Generate Profile Code
            </Button>
          )}

          <FindByProfileCodeDialog 
            trigger={
              <Button data-testid="button-connect-by-code">
                <Fingerprint size={16} className="mr-2" />
                Connect by Code
              </Button>
            }
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/connection-requests'] });
              toast({
                title: "Connection request sent",
                description: `We'll notify you when the ${isContractor ? 'company' : 'contractor'} responds.`
              });
            }}
          />
        </div>
      </div>

      {/* Tabs for Workers/Companies */}
      <Tabs defaultValue="freelancers" className="mb-6">
        <TabsList className="mb-4">
          {isContractor ? (
            <>
              <TabsTrigger value="contractors">Active Companies</TabsTrigger>
              <TabsTrigger value="requests">Company Requests</TabsTrigger>
              <TabsTrigger value="freelancers">Previous Companies</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="freelancers">Contractors</TabsTrigger>
              <TabsTrigger value="invites">Connection Requests</TabsTrigger>
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
                  <Card className="p-5 h-64 "></Card>
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
                            {company.businessName || company.companyName || `${company.firstName} ${company.lastName}`}
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
                        className="w-full"
                        onClick={() => setViewingCompany(company)}
                        data-testid={`button-view-projects-${company.id}`}
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

                    <div className="border-t border-border pt-3 mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setViewingContractor(contractor)}
                        data-testid={`button-view-work-requests-${contractor.id}`}
                      >
                        View Work Requests
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
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
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-white mb-2">Company Connections</h3>
                <p className="text-muted-foreground">Your connected companies will appear in the "Active Companies" tab.</p>
              </div>
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
                  <Card className="p-5 h-64 "></Card>
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
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => navigate(`/pay-contractor?contractorId=${freelancer.id}`)}
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
                  <div className="col-span-full bg-[#0f172a] text-white rounded-lg shadow-sm border border-zinc-800 p-8 text-center">
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
              <div className="bg-[hsl(215,50%,12%)] dark:bg-[hsl(215,50%,12%)] rounded-lg border border-[hsl(215,40%,22%)] dark:border-[hsl(215,40%,22%)] overflow-hidden">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-[hsl(215,50%,12%)] dark:bg-[hsl(215,50%,12%)]">
                  <div>
                    <h3 className="text-lg font-medium text-white">Connection Requests</h3>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Manage connection requests sent to and received from contractors.
                    </p>
                  </div>
                </div>

                {isLoadingConnections ? (
                  <div className="animate-pulse p-6">
                    <div className="h-7 bg-zinc-800 rounded w-1/4 mb-3"></div>
                    <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-zinc-800 rounded w-2/4 mb-6"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[hsl(215,40%,22%)]">
                      <thead className="bg-[hsl(215,50%,12%)] dark:bg-[hsl(215,50%,12%)]">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"
                          >
                            Direction
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Contractor
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Message
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
                            Date
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[hsl(215,50%,12%)] dark:bg-[hsl(215,50%,12%)] divide-y divide-[hsl(215,40%,22%)]">
                        {connectionRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                              No connection requests yet
                            </td>
                          </tr>
                        ) : (
                          connectionRequests.map((request: any) => (
                            <tr key={request.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  request.direction === 'sent' 
                                    ? 'bg-blue-900/30 text-blue-400' 
                                    : 'bg-green-900/30 text-green-400'
                                }`}>
                                  {request.direction === 'sent' ? 'Sent' : 'Received'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                {request.contractorName}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                                {request.message || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  request.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : request.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                {formatDate(request.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {request.direction === 'received' && request.status === 'pending' && (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateConnectionRequestMutation.mutate({ 
                                        requestId: request.id, 
                                        status: 'accepted' 
                                      })}
                                      className="text-green-400 hover:text-green-300"
                                      data-testid={`button-accept-${request.id}`}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateConnectionRequestMutation.mutate({ 
                                        requestId: request.id, 
                                        status: 'declined' 
                                      })}
                                      className="text-red-400 hover:text-red-300"
                                      data-testid={`button-decline-${request.id}`}
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                )}
                                {request.direction === 'sent' && request.status === 'pending' && (
                                  <span className="text-muted-foreground text-xs">Awaiting response</span>
                                )}
                                {request.status !== 'pending' && (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Company Projects Modal (for contractor viewing companies) */}
      {viewingCompany && (
        <Dialog open={!!viewingCompany} onOpenChange={() => setViewingCompany(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingCompany.businessName || viewingCompany.companyName || `${viewingCompany.firstName} ${viewingCompany.lastName}`}
              </DialogTitle>
              <DialogDescription>
                Active projects and tasks
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {contracts.filter((contract: any) => 
                contract.businessUserId === viewingCompany.id && contract.contractorUserId === user?.id
              ).length > 0 ? (
                contracts
                  .filter((contract: any) => contract.businessUserId === viewingCompany.id && contract.contractorUserId === user?.id)
                  .map((contract: any) => (
                    <Card key={contract.id} className="p-4" data-testid={`card-project-${contract.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold" data-testid={`text-project-title-${contract.id}`}>
                          {contract.title || contract.projectName || 'Untitled Project'}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-muted rounded" data-testid={`badge-project-status-${contract.id}`}>
                          {contract.status || 'active'}
                        </span>
                      </div>
                      {contract.description && (
                        <p className="text-sm text-muted-foreground mb-3">{contract.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        {contract.rate && (
                          <div className="flex items-center text-muted-foreground">
                            <CreditCard className="w-4 h-4 mr-1" />
                            <span>${contract.rate}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No projects or tasks yet</h3>
                  <p className="text-muted-foreground text-sm">
                    You haven't accepted any work from {viewingCompany.businessName || viewingCompany.companyName || 'this company'} yet.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Contractor Work Requests Modal (for business viewing contractors) */}
      {viewingContractor && (
        <Dialog open={!!viewingContractor} onOpenChange={() => setViewingContractor(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewingContractor.firstName} {viewingContractor.lastName}
              </DialogTitle>
              <DialogDescription>
                Work requests sent to this contractor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {workRequests.filter((wr: any) => 
                wr.contractorUserId === viewingContractor.id && wr.businessUserId === user?.id
              ).length > 0 ? (
                workRequests
                  .filter((wr: any) => wr.contractorUserId === viewingContractor.id && wr.businessUserId === user?.id)
                  .map((workRequest: any) => (
                    <Card key={workRequest.id} className="p-4" data-testid={`card-work-request-${workRequest.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold" data-testid={`text-work-request-title-${workRequest.id}`}>
                          {workRequest.title || 'Untitled Task'}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          workRequest.status === 'accepted' ? 'bg-green-900/30 text-green-400' :
                          workRequest.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                          workRequest.status === 'completed' ? 'bg-blue-900/30 text-blue-400' :
                          'bg-muted text-muted-foreground'
                        }`} data-testid={`badge-work-request-status-${workRequest.id}`}>
                          {workRequest.status}
                        </span>
                      </div>
                      {workRequest.description && (
                        <p className="text-sm text-muted-foreground mb-3">{workRequest.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        {workRequest.amount && (
                          <div className="flex items-center text-muted-foreground">
                            <CreditCard className="w-4 h-4 mr-1" />
                            <span>${workRequest.amount}</span>
                          </div>
                        )}
                        {workRequest.dueDate && (
                          <div className="text-xs text-muted-foreground">
                            Due: {new Date(workRequest.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No work requests yet</h3>
                  <p className="text-muted-foreground text-sm">
                    You haven't sent any work requests to {viewingContractor.firstName} {viewingContractor.lastName} yet.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Contractors;