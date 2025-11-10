import { useAuth } from "@/hooks/use-auth";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";
import { FindByProfileCodeDialog } from "@/components/contractors/FindByProfileCodeDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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
import { Building, Mail, XCircle, Calendar, DollarSign, Briefcase } from 'lucide-react';

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isContractor = user?.role === "contractor";

  // Mock data for acceptedConnections and workRequests - replace with actual data fetching
  const acceptedConnections = [
    { businessId: "company1", businessName: "TechCorp", businessRole: "Client", businessEmail: "contact@techcorp.com" },
    { businessId: "company2", businessName: "Innovate Solutions", businessRole: "Client", businessEmail: "info@innovatesolutions.com" },
    { businessId: "company1", businessName: "TechCorp", businessRole: "Client", businessEmail: "contact@techcorp.com" }, // Duplicate to test de-duplication
  ];

  const workRequests = [
    { id: "wr1", businessUserId: "company1", title: "Website Redesign", description: "Redesign the company website.", status: "accepted", amount: 5000, dueDate: "2024-08-01" },
    { id: "wr2", businessUserId: "company1", title: "Mobile App Development", description: "Develop a new mobile application.", status: "in_review", amount: 15000, dueDate: "2024-10-01" },
    { id: "wr3", businessUserId: "company2", title: "API Integration", description: "Integrate third-party API.", status: "approved", amount: 3000, dueDate: "2024-07-15" },
    { id: "wr4", businessUserId: "company1", title: "SEO Optimization", description: "Improve search engine ranking.", status: "paid", amount: 2000, dueDate: "2024-07-30" },
  ];

  const [searchTerm, setSearchTerm] = React.useState("");

  // Get unique companies from accepted connections with their work counts
  const uniqueCompanies = React.useMemo(() => {
    const companies = new Map();

    acceptedConnections.forEach((connection: any) => {
      const companyId = connection.businessId;
      if (!companies.has(companyId)) {
        // Count accepted work for this company
        const companyWork = workRequests?.filter((wr: any) =>
          wr.businessUserId === companyId &&
          (wr.status === 'accepted' || wr.status === 'in_review' || wr.status === 'approved' || wr.status === 'paid')
        ) || [];

        companies.set(companyId, {
          id: companyId,
          name: connection.businessName || connection.companyName || 'Unknown Company',
          role: connection.businessRole || 'Business',
          email: connection.businessEmail,
          projectCount: companyWork.length,
          projects: companyWork
        });
      }
    });

    return Array.from(companies.values());
  }, [acceptedConnections, workRequests]);

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
          >
            <ArrowLeft size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Connections</h1>
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
                {isContractor ? "Company Connections" : "Contractor Connections"}
              </CardTitle>
              <CardDescription>
                {isContractor
                  ? "Share your profile code with companies or enter a company's code to connect. Once connected, they can assign you to projects."
                  : "Share your profile code with contractors or enter their code to connect. Once connected, you can assign them to your projects."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label htmlFor="company-search" className="sr-only">Search</label>
                <input
                  type="text"
                  id="company-search"
                  placeholder="Search companies..."
                  className="w-full p-2 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {filteredCompanies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCompanies.map((company: any) => (
                    <Card key={company.id} className="bg-zinc-800 border-zinc-700">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <Building className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                              <p className="text-sm text-gray-400">{company.role}</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            {company.projectCount || 0} {company.projectCount === 1 ? 'project' : 'projects'}
                          </Badge>
                        </div>

                        <div className="flex items-center text-gray-400 mb-4">
                          <Mail className="w-4 h-4 mr-2" />
                          <span className="text-sm">{company.email}</span>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                          onClick={() => setViewingCompany(company)}
                        >
                          View
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <h3 className="text-white font-medium mb-1">No companies found</h3>
                  <p className="text-gray-400 text-sm">
                    Connect with companies to see them listed here.
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{viewingCompany.name}</CardTitle>
                  <CardDescription>Active projects and tasks</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingCompany(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {viewingCompany.projects && viewingCompany.projects.length > 0 ? (
                <div className="space-y-4">
                  {viewingCompany.projects.map((work: any) => (
                    <Card key={work.id} className="bg-zinc-800 border-zinc-700">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-white">{work.title}</h4>
                          <Badge variant={
                            work.status === 'accepted' ? 'default' :
                            work.status === 'in_review' ? 'secondary' :
                            work.status === 'approved' ? 'default' : 'default'
                          }>
                            {work.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">{work.description}</p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-400">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span>${work.amount || 0}</span>
                          </div>
                          {work.dueDate && (
                            <div className="flex items-center text-gray-400">
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
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="w-6 h-6 text-gray-500" />
                  </div>
                  <h3 className="text-white font-medium mb-1">No projects or tasks yet</h3>
                  <p className="text-gray-400 text-sm">
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