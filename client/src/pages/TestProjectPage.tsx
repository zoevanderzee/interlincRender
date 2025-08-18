import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function TestProjectPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [workRequests, setWorkRequests] = useState([]);
  const [projectData, setProjectData] = useState({
    name: "Test Project",
    description: "Testing the new contractor assignment workflow",
    budget: "5000"
  });

  const [contractorData, setContractorData] = useState({
    contractorUserId: "30", // Test contractor
    inviteCode: ""
  });

  const [workRequestData, setWorkRequestData] = useState({
    businessWorkerId: "",
    title: "Test Work Request",
    description: "Testing work request creation",
    amount: "1000",
    currency: "USD",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Step 1: Create Project
  const createProject = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/projects", {
        ...projectData,
        businessId: 1, // Assuming user ID 1 is the business
        budget: parseFloat(projectData.budget)
      });
      
      setProject(response.data);
      toast({
        title: "Success",
        description: "Project created successfully"
      });
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Add Contractor to Business
  const addContractor = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/businesses/${project.businessId}/workers/join`, contractorData);
      
      toast({
        title: "Success",
        description: `Contractor added to business. Business Worker ID: ${response.data.businessWorkerId}`
      });
      
      // Refresh workers list
      loadWorkers();
    } catch (error) {
      console.error("Error adding contractor:", error);
      toast({
        title: "Error",
        description: `Failed to add contractor: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Create Work Request
  const createWorkRequest = async () => {
    if (!project) return;

    try {
      setIsLoading(true);
      const response = await apiRequest("POST", `/api/projects/${project.id}/work-requests`, {
        ...workRequestData,
        businessWorkerId: parseInt(workRequestData.businessWorkerId),
        amount: parseFloat(workRequestData.amount)
      });
      
      toast({
        title: "Success",
        description: `Work request created successfully. ID: ${response.data.workRequestId}`
      });
      
      // Refresh work requests list
      loadWorkRequests();
    } catch (error) {
      console.error("Error creating work request:", error);
      toast({
        title: "Error",
        description: `Failed to create work request: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load workers for dropdown
  const loadWorkers = async () => {
    if (!project) return;

    try {
      const response = await apiRequest("GET", `/api/businesses/${project.businessId}/workers`);
      setWorkers(response.data);
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  };

  // Load work requests
  const loadWorkRequests = async () => {
    if (!project) return;

    try {
      const response = await apiRequest("GET", `/api/projects/${project.id}/work-requests`);
      setWorkRequests(response.data);
    } catch (error) {
      console.error("Error loading work requests:", error);
    }
  };

  useEffect(() => {
    if (project) {
      loadWorkers();
      loadWorkRequests();
    }
  }, [project]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Test Contractor Assignment Workflow</h1>
      
      {/* Step 1: Create Project */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Create Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={projectData.name}
              onChange={(e) => setProjectData({...projectData, name: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="projectDescription">Description</Label>
            <Input
              id="projectDescription"
              value={projectData.description}
              onChange={(e) => setProjectData({...projectData, description: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="projectBudget">Budget ($)</Label>
            <Input
              id="projectBudget"
              value={projectData.budget}
              onChange={(e) => setProjectData({...projectData, budget: e.target.value})}
            />
          </div>
          <Button onClick={createProject} disabled={isLoading || project}>
            {project ? "✓ Project Created" : "Create Project"}
          </Button>
          {project && (
            <div className="text-sm text-green-600">
              Project ID: {project.id} | Business ID: {project.businessId}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Add Contractor to Business */}
      {project && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Contractor to Business</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contractorUserId">Contractor User ID</Label>
              <Input
                id="contractorUserId"
                value={contractorData.contractorUserId}
                onChange={(e) => setContractorData({...contractorData, contractorUserId: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="inviteCode">Business Profile Code</Label>
              <Input
                id="inviteCode"
                value={contractorData.inviteCode}
                onChange={(e) => setContractorData({...contractorData, inviteCode: e.target.value})}
                placeholder="Enter business profile code"
              />
            </div>
            <Button onClick={addContractor} disabled={isLoading}>
              Add Contractor to Business
            </Button>
            {workers.length > 0 && (
              <div className="text-sm text-green-600">
                Workers: {workers.map(w => `${w.name} (ID: ${w.businessWorkerId})`).join(", ")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Create Work Request */}
      {project && workers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Create Work Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessWorkerId">Business Worker</Label>
              <select
                id="businessWorkerId"
                value={workRequestData.businessWorkerId}
                onChange={(e) => setWorkRequestData({...workRequestData, businessWorkerId: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a worker</option>
                {workers.map(worker => (
                  <option key={worker.businessWorkerId} value={worker.businessWorkerId}>
                    {worker.name} (ID: {worker.businessWorkerId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="workTitle">Work Request Title</Label>
              <Input
                id="workTitle"
                value={workRequestData.title}
                onChange={(e) => setWorkRequestData({...workRequestData, title: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="workDescription">Description</Label>
              <Input
                id="workDescription"
                value={workRequestData.description}
                onChange={(e) => setWorkRequestData({...workRequestData, description: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="workAmount">Amount ($)</Label>
              <Input
                id="workAmount"
                value={workRequestData.amount}
                onChange={(e) => setWorkRequestData({...workRequestData, amount: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={workRequestData.dueDate}
                onChange={(e) => setWorkRequestData({...workRequestData, dueDate: e.target.value})}
              />
            </div>
            <Button onClick={createWorkRequest} disabled={isLoading || !workRequestData.businessWorkerId}>
              Create Work Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Work Requests List */}
      {workRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Work Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {workRequests.map(wr => (
              <div key={wr.id} className="p-3 border rounded mb-2">
                <div className="font-medium">{wr.title}</div>
                <div className="text-sm text-gray-600">
                  Amount: ${wr.amount} | Status: {wr.status} | Due: {new Date(wr.dueDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}