import { useAuth } from "@/hooks/use-auth";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";
import { FindByProfileCodeDialog } from "@/components/contractors/FindByProfileCodeDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Building, Mail, XCircle, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { useQuery } from "@tanstack/react-query";

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isContractor = user?.role === "contractor";

  // Fetch connection requests
  const { data: connectionRequests = [] } = useQuery({
    queryKey: ["/api/connection-requests"],
    enabled: !!user
  });

  // Fetch work requests
  const { data: workRequests = [] } = useQuery({
    queryKey: ['/api/work-requests'],
    enabled: !!user
  });

  // Fetch users to get company details
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user
  });

  const [searchTerm, setSearchTerm] = React.useState("");

  // Get accepted connections only
  const acceptedConnections = React.useMemo(() => {
    return (connectionRequests as any[]).filter((req: any) => req.status === 'accepted');
  }, [connectionRequests]);

  // Get unique companies from accepted connections with their work counts
  const uniqueCompanies = React.useMemo(() => {
    const companies = new Map();

    acceptedConnections.forEach((connection: any) => {
      const companyId = isContractor ? connection.businessId : connection.contractorId;
      if (!companies.has(companyId)) {
        // Find company details from users list
        const companyUser = (users as any[]).find((u: any) => u.id === companyId);
        
        // Count accepted work for this company
        const companyWork = (workRequests as any[])?.filter((wr: any) => {
          // For contractors: filter by businessUserId
          // For businesses: filter by contractorUserId
          const matchesCompany = isContractor 
            ? wr.businessUserId === companyId 
            : wr.contractorUserId === companyId;
          
          return matchesCompany && 
            (wr.status === 'accepted' || wr.status === 'in_review' || wr.status === 'approved' || wr.status === 'paid');
        }) || [];

        companies.set(companyId, {
          id: companyId,
          name: companyUser?.username || companyUser?.firstName || 'Unknown',
          role: isContractor ? 'Business' : 'Contractor',
          email: companyUser?.email || 'N/A',
          projectCount: companyWork.length,
          projects: companyWork
        });
      }
    });

    return Array.from(companies.values());
  }, [acceptedConnections, workRequests, users, isContractor]);

  // Filter companies based on search
  const filteredCompanies = uniqueCompanies.filter((company: any) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // State for viewing company projects
  const [viewingCompany, setViewingCompany] = React.useState<any>(null);


  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mr-2"
            data-testid="button-back"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{isContractor ? "Companies" : "Connections"}</h1>
        </div>

        <FindByProfileCodeDialog
          trigger={
            <Button>
              <UserPlus size={16} className="mr-2" />
              Connect by Code
            </Button>
          }
          onSuccess={() => {
            // Refresh the page after success
            window.location.reload();
          }}
        />
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connections">
            {isContractor ? "Company Connections" : "Contractor Connections"}
          </TabsTrigger>
          <TabsTrigger value="requests">Connection Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isContractor ? "Active Companies" : "Active Contractors"}
              </CardTitle>
              <CardDescription>
                {isContractor
                  ? "View companies you work with and their projects"
                  : "View contractors you work with and their projects"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label htmlFor="company-search" className="sr-only">Search</label>
                <input
                  type="text"
                  id="company-search"
                  placeholder={isContractor ? "Search companies..." : "Search contractors..."}
                  className="w-full p-2 rounded-md bg-background text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-companies"
                />
              </div>
              {filteredCompanies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCompanies.map((company: any) => (
                    <Card key={company.id} className="bg-card border-border" data-testid={`card-company-${company.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Building className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold" data-testid={`text-company-name-${company.id}`}>{company.name}</h3>
                              <p className="text-sm text-muted-foreground">{company.role}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid={`badge-project-count-${company.id}`}>
                            {company.projectCount || 0} {company.projectCount === 1 ? 'project' : 'projects'}
                          </Badge>
                        </div>

                        <div className="flex items-center text-muted-foreground mb-4">
                          <Mail className="w-4 h-4 mr-2" />
                          <span className="text-sm">{company.email}</span>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setViewingCompany(company)}
                          data-testid={`button-view-company-${company.id}`}
                        >
                          View Projects
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <h3 className="font-medium mb-1">No {isContractor ? "companies" : "contractors"} found</h3>
                  <p className="text-muted-foreground text-sm">
                    {isContractor 
                      ? "Connect with companies to see them listed here."
                      : "Connect with contractors to see them listed here."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connection Requests</CardTitle>
              <CardDescription>
                Manage connection requests sent to and received from contractors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionRequestsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Projects Modal */}
      {viewingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingCompany(null)}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{viewingCompany.name}</CardTitle>
                  <CardDescription>Active projects and tasks</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingCompany(null)}
                  data-testid="button-close-modal"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {viewingCompany.projects && viewingCompany.projects.length > 0 ? (
                <div className="space-y-4">
                  {viewingCompany.projects.map((work: any) => (
                    <Card key={work.id} className="bg-card border-border" data-testid={`card-project-${work.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold" data-testid={`text-project-title-${work.id}`}>{work.title}</h4>
                          <Badge variant={
                            work.status === 'accepted' ? 'default' :
                            work.status === 'in_review' ? 'secondary' :
                            work.status === 'approved' ? 'default' : 'default'
                          } data-testid={`badge-project-status-${work.id}`}>
                            {work.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{work.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span>${work.amount || 0}</span>
                          </div>
                          {work.dueDate && (
                            <div className="flex items-center text-muted-foreground">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>Due: {new Date(work.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No projects or tasks yet</h3>
                  <p className="text-muted-foreground text-sm">
                    You haven't accepted any work from {viewingCompany.name} yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}