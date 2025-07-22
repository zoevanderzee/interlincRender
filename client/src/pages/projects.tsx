import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, Users, FileText, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SubmitWorkModal } from "@/components/SubmitWorkModal";
import { SubmittedWorkReview } from "@/components/SubmittedWorkReview";

export default function Projects() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [submitWorkModalOpen, setSubmitWorkModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  // Use dashboard data for consistency across all pages
  const { data: dashboardData, isLoading } = useQuery<{
    contracts: any[];
    contractors: any[];
    stats: any;
  }>({
    queryKey: ['/api/dashboard'],
    enabled: !!user
  });

  const contracts = dashboardData?.contracts || [];
  const contractors = dashboardData?.contractors || [];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-800 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const isContractor = user?.role === 'contractor';
  
  // SECURITY: Contractors should see their accepted work assignments only
  if (isContractor) {
    // Fetch contractor's accepted work requests
    const { data: workRequests = [], isLoading: isLoadingAssignments } = useQuery<any[]>({
      queryKey: ['/api/work-requests'],
      select: (data) => {
        // Filter to show only accepted work requests for this contractor
        return data.filter((request: any) => 
          (request.recipientEmail === user?.email || 
           (user?.email && request.recipientEmail?.toLowerCase() === user.email.toLowerCase())) &&
          request.status === 'accepted'
        );
      },
      enabled: !!user?.email
    });

    const activeAssignments = workRequests.filter((req: any) => req.status === 'accepted');

    if (isLoadingAssignments) {
      return (
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-800 rounded w-1/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">My Assignments</h1>
            <p className="text-gray-400 mt-1">Your accepted work assignments and tasks</p>
          </div>
        </div>

        {/* Assignment Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Assignments</p>
                  <p className="text-3xl font-bold text-white">{activeAssignments.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Value</p>
                  <p className="text-3xl font-bold text-white">
                    ${activeAssignments.reduce((sum: number, req: any) => sum + parseFloat(req.budgetMax || req.budgetMin || 0), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Completion Rate</p>
                  <p className="text-3xl font-bold text-white">
                    {workRequests.length > 0 ? 
                      Math.round((workRequests.filter((r: any) => r.status === 'completed').length / workRequests.length) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Current Assignments</h2>
          
          {activeAssignments.length > 0 ? (
            <div className="grid gap-6">
              {activeAssignments.map((assignment: any) => (
                <Card key={assignment.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{assignment.title}</CardTitle>
                        <p className="text-gray-400 text-sm">From: {assignment.businessName || 'Client'}</p>
                      </div>
                      <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-4">{assignment.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Payment:</span>
                        <p className="text-white font-medium">${parseFloat(assignment.budgetMax || assignment.budgetMin || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Deadline:</span>
                        <p className="text-white font-medium">
                          {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <p className="text-white font-medium">{assignment.workerType || 'General'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <p className="text-white font-medium capitalize">{assignment.status}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setSubmitWorkModalOpen(true);
                        }}
                      >
                        Submit Work
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-white">No Active Assignments</h3>
                <p className="text-sm text-gray-400 mb-4">
                  You don't have any accepted work assignments yet. Check your work requests to see available opportunities.
                </p>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/work-requests')}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  View Work Requests
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Submit Work Modal */}
        <SubmitWorkModal
          isOpen={submitWorkModalOpen}
          onClose={() => {
            setSubmitWorkModalOpen(false);
            setSelectedAssignment(null);
          }}
          workRequest={selectedAssignment}
        />
      </div>
    );
  }
  
  const activeContracts = contracts.filter((contract: any) => contract.status === 'active');
  const completedContracts = contracts.filter((contract: any) => contract.status === 'completed');
  const totalValue = contracts.reduce((sum: number, contract: any) => sum + parseFloat(contract.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">
            {isContractor ? "Manage your active contracts and deliverables" : "Oversee your project portfolio and contractor relationships"}
          </p>
        </div>
        {!isContractor && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/contracts/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-gray-800 bg-black">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Projects</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeContracts.length}</div>
            <p className="text-xs text-gray-400">
              {contracts.length} total contracts
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{completedContracts.length}</div>
            <p className="text-xs text-gray-400">
              Projects finished
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-gray-400">
              Portfolio value
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-black">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {isContractor ? "Active Clients" : "Contractors"}
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {isContractor ? 
                new Set(contracts.map((c: any) => c.businessId)).size : 
                contractors.length
              }
            </div>
            <p className="text-xs text-gray-400">
              {isContractor ? "Working relationships" : "In network"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          {isContractor ? "Your Contracts" : "Active Projects"}
        </h2>
        
        {contracts.length === 0 ? (
          <Card className="border-gray-800 bg-black p-8 text-center">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Projects Yet</h3>
            <p className="text-gray-400 mb-4">
              {isContractor 
                ? "You don't have any active contracts at the moment."
                : "Start by creating your first project and inviting contractors."
              }
            </p>
            {!isContractor && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate('/contracts/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-4">
            {contracts.map((contract: any) => (
              <Card key={contract.id} className="border-gray-800 bg-black">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{contract.contractName}</h3>
                      <p className="text-gray-300 mb-3">{contract.description}</p>
                    </div>
                    <Badge 
                      variant={contract.status === 'active' ? 'default' : 'secondary'}
                      className="ml-4 capitalize"
                    >
                      {contract.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 text-yellow-400 mr-2" />
                      <span className="text-gray-400">Value:</span>
                      <span className="text-white ml-2 font-medium">${parseFloat(contract.value || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-gray-400">End Date:</span>
                      <span className="text-white ml-2">
                        {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white ml-2 capitalize">{contract.status}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-gray-700 text-white hover:bg-gray-800"
                      onClick={() => navigate(`/contract/${contract.id}`)}
                    >
                      View Details
                    </Button>
                    {contract.status === 'active' && (
                      <Button 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isContractor ? "Submit Work" : "Review Progress"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}