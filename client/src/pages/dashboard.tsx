import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  FileText, 
  Clock, 
  DollarSign, 
  Users, 
  Plus, 
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/dashboard/StatsCard";
import ContractsTable from "@/components/dashboard/ContractsTable";
import MilestonesList from "@/components/dashboard/MilestonesList";
import PaymentsList from "@/components/dashboard/PaymentsList";
import { Contract, User, Payment, Milestone } from "@shared/schema";

interface DashboardData {
  stats: {
    activeContractsCount: number;
    pendingApprovalsCount: number;
    paymentsProcessed: number;
    activeContractorsCount: number;
  };
  contracts: Contract[];
  contractors: User[];
  milestones: Milestone[];
  payments: Payment[];
}

const Dashboard = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: false
  });

  // Handle errors
  if (error) {
    toast({
      title: "Error loading dashboard",
      description: "Could not load dashboard data. Please try again.",
      variant: "destructive",
    });
  }

  // Navigate to create contract page
  const handleNewContract = () => {
    navigate('/contracts/new');
  };

  // Navigate to add contractor page
  const handleAddContractor = () => {
    navigate('/contractors?action=new');
  };

  // Navigate to export reports page
  const handleExportReports = () => {
    navigate('/reports?action=export');
  };

  // View contract details
  const handleViewContract = (id: number) => {
    navigate(`/contracts/${id}`);
  };

  // Edit contract
  const handleEditContract = (id: number) => {
    navigate(`/contracts/${id}/edit`);
  };

  // View milestone details
  const handleViewMilestone = (id: number) => {
    navigate(`/milestones/${id}`);
  };

  // Approve milestone
  const handleApproveMilestone = (id: number) => {
    toast({
      title: "Milestone approved",
      description: "The milestone has been approved successfully.",
    });
  };

  // Request update for milestone
  const handleRequestUpdate = (id: number) => {
    toast({
      title: "Update requested",
      description: "A request for update has been sent to the contractor.",
    });
  };

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-1/4 bg-zinc-800 rounded mb-2"></div>
        <div className="h-4 w-2/3 bg-zinc-800 rounded mb-8"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-900 h-32 rounded-lg shadow-sm border border-zinc-800"></div>
          ))}
        </div>
        
        <div className="h-10 w-1/3 bg-zinc-800 rounded mb-6"></div>
        <div className="bg-zinc-900 h-64 rounded-lg shadow-sm border border-zinc-800 mb-8"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 h-96 rounded-lg shadow-sm border border-zinc-800"></div>
          <div className="bg-zinc-900 h-96 rounded-lg shadow-sm border border-zinc-800"></div>
        </div>
      </div>
    );
  }

  // Calculate total upcoming payments
  const totalUpcomingPayments = data?.payments.reduce((sum: number, payment: any) => 
    sum + Number(payment.amount), 0) || 0;

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, Sarah. Here's what's happening with your contracts.</p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Active Contracts"
          value={data?.stats.activeContractsCount || 0}
          icon={<FileText size={20} />}
          iconBgColor="bg-accent-50"
          iconColor="text-accent-500"
          changeValue={8}
          changeText="from last month"
        />
        
        <StatsCard 
          title="Pending Approvals"
          value={data?.stats.pendingApprovalsCount || 0}
          icon={<Clock size={20} />}
          iconBgColor="bg-warning-50"
          iconColor="text-warning"
          changeValue={12}
          changeText="from last month"
        />
        
        <StatsCard 
          title="Payments Processed"
          value={`$${data?.stats.paymentsProcessed?.toLocaleString('en-US') || '0'}`}
          icon={<DollarSign size={20} />}
          iconBgColor="bg-success-50"
          iconColor="text-success"
          changeValue={22}
          changeText="from last month"
        />
        
        <StatsCard 
          title="Active Contractors"
          value={data?.stats.activeContractorsCount || 0}
          icon={<Users size={20} />}
          iconBgColor="bg-primary-50"
          iconColor="text-primary-500"
          changeValue={4}
          changeText="from last month"
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button 
          className="bg-accent-500 hover:bg-accent-600 text-white"
          onClick={handleNewContract}
        >
          <Plus className="mr-2" size={16} />
          New Contract
        </Button>
        
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
          onClick={handleAddContractor}
        >
          <Plus className="mr-2" size={16} />
          Add Contractor
        </Button>
        
        <Button 
          variant="outline"
          className="text-white border-zinc-700 hover:bg-zinc-800 hover:text-white"
          onClick={handleExportReports}
        >
          <Download className="mr-2" size={16} />
          Export Reports
        </Button>
      </div>
      
      {/* Smart Contracts Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Smart Contracts</h2>
          <Button variant="link" className="text-accent-500 hover:text-accent-600 text-sm font-medium" onClick={() => navigate('/contracts')}>
            View All
          </Button>
        </div>
        
        <ContractsTable 
          contracts={data?.contracts || []}
          contractors={data?.contractors || []}
          onViewContract={handleViewContract}
          onEditContract={handleEditContract}
        />
      </section>
      
      {/* Two Column Layout for Project Milestones and Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Milestones */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Upcoming Milestones</h2>
            <Button variant="link" className="text-accent-500 hover:text-accent-600 text-sm font-medium" onClick={() => navigate('/projects')}>
              View All
            </Button>
          </div>
          
          <MilestonesList 
            milestones={data?.milestones || []}
            contracts={data?.contracts || []}
            contractors={data?.contractors || []}
            onViewDetails={handleViewMilestone}
            onApprove={handleApproveMilestone}
            onRequestUpdate={handleRequestUpdate}
          />
        </section>
        
        {/* Upcoming Payments */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Upcoming Payments</h2>
            <Button variant="link" className="text-accent-500 hover:text-accent-600 text-sm font-medium" onClick={() => navigate('/payments')}>
              View All
            </Button>
          </div>
          
          <PaymentsList 
            payments={data?.payments || []}
            contracts={data?.contracts || []}
            contractors={data?.contractors || []}
            totalUpcoming={totalUpcomingPayments}
          />
        </section>
      </div>
    </>
  );
};

export default Dashboard;
