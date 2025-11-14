import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, DollarSign, Users, FileText, TrendingUp, Eye, User, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SubmitWorkModal } from "@/components/SubmitWorkModal";
import { ReviewWorkRequestModal } from "@/components/ReviewWorkRequestModal";
import { WorkRequestDetailsModal } from "@/components/WorkRequestDetailsModal";
import { useIntegratedData } from "@/hooks/use-integrated-data";
import { formatCurrency, formatMultiCurrencyTotal } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";


export default function Projects() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [submitWorkModalOpen, setSubmitWorkModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedWorkRequest, setSelectedWorkRequest] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetailsWorkRequest, setSelectedDetailsWorkRequest] = useState<any>(null);
  const [assignmentsTab, setAssignmentsTab] = useState<string>("active");
  const { data: integratedData, isLoading } = useIntegratedData();

  const isContractor = user?.role === 'contractor';

  // Helper to identify tasks vs projects - tasks have taskId, projects have projectId
  const isTask = (workRequest: any) => {
    return !!workRequest.taskId; // If taskId exists, it's a task
  };

  // Fetch dedicated dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user && user.role === 'business'
  });

  const projects = integratedData?.projects || [];
  const contracts = integratedData?.contracts || [];
  const contractors = integratedData?.contractors || [];
  const workRequests = integratedData?.workRequests || [];

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
    // Filter out tasks - those appear in Tasks tab (tasks have taskId)
    // Active: assigned, accepted, submitted (excluding pending which shows in Work Requests)
    const activeAssignments = workRequests.filter((req: any) => 
      (req.status === 'assigned' || req.status === 'accepted' || req.status === 'submitted') && !isTask(req)
    );

    // Completed: completed, approved, paid
    const completedAssignments = workRequests.filter((req: any) => 
      (req.status === 'completed' || req.status === 'approved' || req.status === 'paid') && !isTask(req)
    );

    // Get assignments for current tab
    const displayedAssignments = assignmentsTab === 'active' ? activeAssignments : completedAssignments;

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
                    {formatMultiCurrencyTotal(displayedAssignments.map((req: any) => ({
                      amount: req.amount || 0,
                      currency: req.currency || 'USD'
                    })))}
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
                  <p className="text-sm text-gray-400">Connected Companies</p>
                  <p className="text-3xl font-bold text-white">
                    {integratedData?.businesses?.length || integratedData?.stats?.activeContractorsCount || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Tabs */}
        <Tabs value={assignmentsTab} onValueChange={setAssignmentsTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active" data-testid="tab-active-assignments">
              Active ({activeAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-assignments">
              Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeAssignments.length > 0 ? (
              activeAssignments.map((assignment: any) => {
              // Check if assignment is overdue
              const isOverdue = assignment.isOverdue || false;
              const daysOverdue = assignment.daysOverdue || 0;

              return (
                <Card key={assignment.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{assignment.title}</CardTitle>
                        <p className="text-gray-400 text-sm mt-1">{assignment.description}</p>
                        {(assignment.companyName || assignment.businessFirstName) && (
                          <p className="text-blue-400 text-sm mt-1">
                            From: {assignment.companyName || `${assignment.businessFirstName} ${assignment.businessLastName}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {isOverdue && assignment.status !== 'submitted' && (
                          <Badge className="bg-red-600 text-white hover:bg-red-700">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            OVERDUE
                            <span className="ml-1 text-xs text-red-200">{daysOverdue} days late</span>
                          </Badge>
                        )}
                        <Badge variant={assignment.status === 'accepted' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-gray-400">
                        <DollarSign className="mr-1 h-4 w-4" />
                        <span>{formatCurrency(assignment.amount || 0, assignment.currency || 'USD')}</span>
                      </div>
                      {assignment.dueDate && (
                        <div className="flex items-center text-gray-400">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    {assignment.status === 'submitted' ? (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedDetailsWorkRequest(assignment);
                          setDetailsModalOpen(true);
                        }}
                        className="border-gray-700"
                        data-testid={`view-submission-${assignment.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setSubmitWorkModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`submit-deliverable-${assignment.id}`}
                      >
                        Submit Deliverable
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })
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
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedAssignments.length > 0 ? (
              completedAssignments.map((assignment: any) => (
                <Card key={assignment.id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white">{assignment.title}</CardTitle>
                        <p className="text-gray-400 text-sm mt-1">{assignment.description}</p>
                        {(assignment.companyName || assignment.businessFirstName) && (
                          <p className="text-blue-400 text-sm mt-1">
                            From: {assignment.companyName || `${assignment.businessFirstName} ${assignment.businessLastName}`}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {assignment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-400">
                          <DollarSign className="mr-1 h-4 w-4" />
                          <span>{formatCurrency(assignment.amount || 0, assignment.currency || 'USD')}</span>
                        </div>
                        {assignment.dueDate && (
                          <div className="flex items-center text-gray-400">
                            <Calendar className="mr-1 h-4 w-4" />
                            <span>Completed: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedDetailsWorkRequest(assignment);
                          setDetailsModalOpen(true);
                        }}
                        className="border-gray-700"
                        data-testid={`view-details-${assignment.id}`}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-white">No Completed Assignments</h3>
                  <p className="text-sm text-gray-400">
                    Your completed work will appear here once you finish assignments.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

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

        {/* Work Request Details Modal */}
        {selectedDetailsWorkRequest && (
          <WorkRequestDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setSelectedDetailsWorkRequest(null);
            }}
            workRequestId={selectedDetailsWorkRequest.id}
          />
        )}
      </div>
    );
  }

  // Filter out Quick Tasks from project metrics
  const realProjects = projects.filter((project: any) => project.name !== 'Quick Tasks');
  const activeProjects = realProjects.filter((project: any) => project.status === 'active');
  const assignedProjects = realProjects.filter((project: any) => contracts.some((contract: any) => contract.projectId === project.id));
  const totalValue = realProjects.reduce((sum: number, project: any) => sum + parseFloat(project.budget || 0), 0);

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
          onClick={() => navigate('/projects/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
          <TabsTrigger value="projects" className="data-[state=active]:bg-zinc-700 text-white">
            <Users className="mr-2 h-4 w-4" />
            Projects Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-zinc-700 text-white">
            <User className="mr-2 h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Projects</p>
                <p className="text-3xl font-bold text-white">{activeProjects.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Completed Projects</p>
                <p className="text-3xl font-bold text-white">{realProjects.filter((project: any) => project.status === 'completed').length}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-white">{realProjects.length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Overdue Tasks</p>
                <p className="text-3xl font-bold text-white">
                  {(() => {
                    const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
                    const quickTasksProject = projects.find(p => p.name === 'Quick Tasks' && p.businessId === currentUserId);
                    const quickTasksProjectId = quickTasksProject?.id;
                    
                    // Count overdue work requests from ALL projects EXCEPT Quick Tasks
                    const projectWorkRequests = workRequests.filter(wr => 
                      wr.projectId !== quickTasksProjectId
                    );

                    return projectWorkRequests.filter((wr: any) => wr.isOverdue).length;
                  })()}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalValue, 'GBP')}</p>
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

        {projects.filter((project: any) => project.name !== 'Quick Tasks').length > 0 ? (
          projects.filter((project: any) => project.name !== 'Quick Tasks').map((project: any) => {
            const projectContracts = contracts.filter((contract: any) => contract.projectId === project.id);
            const isAssigned = projectContracts.length > 0;

            return (
              <Card key={project.id} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{project.name}</CardTitle>
                      <p className="text-gray-400 text-sm mt-1">{project.description || 'No description available'}</p>
                      {isAssigned && (
                        <p className="text-blue-400 text-sm mt-1">
                          {projectContracts.length} contractor{projectContracts.length !== 1 ? 's' : ''} assigned
                        </p>
                      )}
                    </div>
                    <Badge variant={isAssigned ? 'default' : 'secondary'}>
                      {isAssigned ? 'Assigned' : 'Unassigned'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-400">
                        <DollarSign className="mr-1 h-4 w-4" />
                        <span>Budget: {formatCurrency(project.budget || 0, 'GBP')}</span>
                      </div>
                      {project.createdAt && (
                        <div className="flex items-center text-gray-400">
                          <Calendar className="mr-1 h-4 w-4" />
                          <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-400">
                        <FileText className="mr-1 h-4 w-4" />
                        <span>Status: {project.status || 'Active'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {isAssigned && (
                        <>
                          <div className="flex items-center text-gray-400">
                            <Users className="mr-1 h-4 w-4" />
                            <span>{projectContracts.length} contractor{projectContracts.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <TrendingUp className="mr-1 h-4 w-4" />
                            <span>Total allocated: {formatCurrency(projectContracts.reduce((sum: number, contract: any) => sum + parseFloat(contract.value || 0), 0), 'GBP')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/project/${project.id}`)}
                        className="border-gray-700 text-white hover:bg-gray-800"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        More Info
                      </Button>
                      <Button 
                        onClick={() => navigate(`/assign-contractor?projectId=${project.id}`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isAssigned ? 'Add More Contractors' : 'Assign Contractor'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
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
                New Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="space-y-6">
            {/* Tasks Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-white">Quick Tasks</h2>
                <p className="text-gray-400 mt-1">Individual task assignments for contractors</p>
              </div>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => navigate('/tasks/new')}
              >
                <User className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>

            {/* Tasks Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {(() => {
                // Filter work requests for Quick Tasks project
                const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

                // Find Quick Tasks project first
                const quickTasksProject = projects.find(p => p.name === 'Quick Tasks' && p.businessId === currentUserId);

                // Filter work requests that belong to Quick Tasks project
                const taskWorkRequests = quickTasksProject 
                  ? workRequests.filter(wr => wr.projectId === quickTasksProject.id)
                  : [];

                console.log('Quick Tasks Project:', quickTasksProject);
                console.log('Task Work Requests:', taskWorkRequests);

                return (
                  <>
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Active Tasks</p>
                            <p className="text-3xl font-bold text-white">
                              {(() => {
                                const today = new Date();
                                const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                                return taskWorkRequests.filter((wr: any) => {
                                  const isActiveStatus = wr.status === 'accepted' || 
                                    wr.status === 'assigned' || 
                                    wr.status === 'pending' ||
                                    wr.status === 'in_review' ||
                                    wr.status === 'needs_revision';

                                  const isNotOverdue = !wr.dueDate || 
                                    new Date(new Date(wr.dueDate).getFullYear(), new Date(wr.dueDate).getMonth(), new Date(wr.dueDate).getDate()) >= normalizedToday;

                                  return isActiveStatus && isNotOverdue;
                                }).length;
                              })()}
                            </p>
                          </div>
                          <User className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Completed Tasks</p>
                            <p className="text-3xl font-bold text-white">
                              {taskWorkRequests.filter((wr: any) => wr.status === 'completed' || wr.status === 'paid').length}
                            </p>
                          </div>
                          <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Total Tasks</p>
                            <p className="text-3xl font-bold text-white">
                              {taskWorkRequests.length}
                            </p>
                          </div>
                          <FileText className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Overdue Tasks</p>
                            <p className="text-3xl font-bold text-white">
                              {taskWorkRequests.filter((wr: any) => wr.isOverdue).length}
                            </p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Total Task Value</p>
                            <p className="text-3xl font-bold text-white">
                              {formatMultiCurrencyTotal(taskWorkRequests.map((wr: any) => ({
                                amount: wr.amount || 0,
                                currency: wr.currency || 'USD'
                              })))}
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
              {(() => {
                // Filter work requests for Quick Tasks project
                const currentUserId = parseInt(localStorage.getItem('user_id') || '0');

                // Find Quick Tasks project first
                const quickTasksProject = projects.find(p => p.name === 'Quick Tasks' && p.businessId === currentUserId);

                // Filter work requests that belong to Quick Tasks project
                const taskWorkRequests = quickTasksProject 
                  ? workRequests.filter(wr => wr.projectId === quickTasksProject.id)
                  : [];

                return taskWorkRequests.length > 0 ? (
                  taskWorkRequests.slice(0, 10).map((task: any) => {
                    // Get contractor info
                    const contractor = contractors.find(c => c.id === task.contractorUserId);
                    const contractorName = contractor ? 
                      (contractor.firstName && contractor.lastName ? 
                        `${contractor.firstName} ${contractor.lastName}` : 
                        contractor.username) : 
                      'Unknown Contractor';

                    // Check if task is overdue
                    const isOverdue = task.isOverdue || false;
                    const daysOverdue = task.daysOverdue || 0;

                    return (
                      <Card key={task.id} className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-white">{task.title}</CardTitle>
                              <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                              <p className="text-blue-400 text-sm mt-1">
                                Assigned to: {contractorName}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {isOverdue && (
                                <Badge className="bg-red-600 text-white hover:bg-red-700">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  OVERDUE
                                  <span className="ml-1 text-xs text-red-200">{daysOverdue} days late</span>
                                </Badge>
                              )}
                              <Badge variant={
                                task.status === 'assigned' ? 'default' : 
                                task.status === 'accepted' ? 'default' :
                                task.status === 'in_review' ? 'secondary' :
                                task.status === 'approved' ? 'default' :
                                task.status === 'paid' ? 'default' : 'secondary'
                              }>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center text-gray-400">
                                <DollarSign className="mr-1 h-4 w-4" />
                                <span>{formatCurrency(task.amount || 0, task.currency || 'USD')}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center text-gray-400">
                                  <Calendar className="mr-1 h-4 w-4" />
                                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            {task.status === 'submitted' ? (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedWorkRequest(task);
                                  setReviewModalOpen(true);
                                }}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-review-${task.id}`}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Review
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedDetailsWorkRequest(task);
                                  setDetailsModalOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                data-testid={`button-view-details-${task.id}`}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                      <User className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-white">No Tasks Yet</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Create your first task to assign quick jobs to contractors.
                    </p>
                    <Button 
                      onClick={() => navigate('/tasks/new')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </CardContent>
                </Card>
                );
              })()}
            </div>
          </div>
        </TabsContent>


      </Tabs>

      {/* Review Work Request Modal */}
      {selectedWorkRequest && (
        <ReviewWorkRequestModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedWorkRequest(null);
          }}
          workRequestId={selectedWorkRequest.id}
          workRequestTitle={selectedWorkRequest.title}
        />
      )}

      {/* Work Request Details Modal */}
      {selectedDetailsWorkRequest && (
        <WorkRequestDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedDetailsWorkRequest(null);
          }}
          workRequestId={selectedDetailsWorkRequest.id}
        />
      )}
    </div>
  );
}