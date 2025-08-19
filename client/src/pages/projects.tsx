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
  
  const isContractor = user?.role === 'contractor';
  
  // Always call all hooks at the top level - never conditionally
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    enabled: !!user && !isContractor
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery<{
    contracts: any[];
    contractors: any[];
    stats: any;
  }>({
    queryKey: ['/api/dashboard'],
    enabled: !!user && isContractor
  });

  const { data: workRequests = [], isLoading: isLoadingAssignments } = useQuery<any[]>({
    queryKey: ['/api/work-requests'],
    select: (data) => {
      // Filter to show only accepted work requests for this contractor
      return data.filter((request: any) => 
        request.contractorUserId === user?.id && request.status === 'accepted'
      );
    },
    enabled: !!user?.id && isContractor
  });

  const projects = projectsData || [];
  const contracts = dashboardData?.contracts || [];
  const contractors = dashboardData?.contractors || [];
  
  const isLoading = isContractor ? isLoadingDashboard || isLoadingAssignments : isLoadingProjects;

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

  // SECURITY: Contractors should see their accepted work assignments only
  if (isContractor) {
    const activeAssignments = workRequests.filter((req: any) => req.status === 'accepted');

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">My Assignments</h1>
            <p className="text-gray-400 mt-1">Your accepted work assignments and deliverables</p>
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
                    {activeAssignments.length > 0 ? '100%' : '0%'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Assignments */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Active Assignments</h2>
          {activeAssignments.length > 0 ? (
            activeAssignments.map((assignment: any) => (
              <Card key={assignment.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{assignment.title}</CardTitle>
                      <p className="text-gray-400 text-sm mt-1">{assignment.description}</p>
                    </div>
                    <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-gray-400">
                        <DollarSign className="mr-1 h-4 w-4" />
                        <span>${assignment.budgetMin || assignment.budgetMax || 0}</span>
                      </div>
                      {assignment.deadline && (
                        <div className="flex items-center text-gray-400">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>{new Date(assignment.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setSubmitWorkModalOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Deliverable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
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
        {selectedAssignment && (
          <SubmitWorkModal
            isOpen={submitWorkModalOpen}
            onClose={() => {
              setSubmitWorkModalOpen(false);
              setSelectedAssignment(null);
            }}
            deliverableId={selectedAssignment.id}
            deliverableName={selectedAssignment.title}
          />
        )}
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
            Oversee your project portfolio and contractor relationships
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => navigate('/projects/new')}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-white">{projects.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Contracts</p>
                <p className="text-3xl font-bold text-white">{activeContracts.length}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Contractors</p>
                <p className="text-3xl font-bold text-white">{contractors.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-3xl font-bold text-white">${totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Your Projects</h2>
        </div>
        
        {projects.length > 0 ? (
          projects.map((project: any) => (
            <Card key={project.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white">{project.name}</CardTitle>
                    <p className="text-gray-400 text-sm mt-1">{project.description}</p>
                  </div>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-gray-400">
                      <DollarSign className="mr-1 h-4 w-4" />
                      <span>Budget: ${project.budget}</span>
                    </div>
                    {project.created_at && (
                      <div className="flex items-center text-gray-400">
                        <Calendar className="mr-1 h-4 w-4" />
                        <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="border-gray-700 text-white hover:bg-gray-800"
                    >
                      View Details
                    </Button>
                    <Button 
                      onClick={() => navigate(`/assign-contractor?projectId=${project.id}`)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Add Contractor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">No Projects Yet</h3>
              <p className="text-sm text-gray-400 mb-4">
                Create your first project to start working with contractors.
              </p>
              <Button 
                onClick={() => navigate('/projects/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}