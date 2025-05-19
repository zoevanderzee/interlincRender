import { useAuth } from "@/hooks/use-auth";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";
import { FindByProfileCodeDialog } from "@/components/contractors/FindByProfileCodeDialog";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const isContractor = user?.role === "contractor";

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
          <h1 className="text-2xl font-bold">Connection Requests</h1>
        </div>
        
        {!isContractor && (
          <FindByProfileCodeDialog
            trigger={
              <Button>
                <UserPlus size={16} className="mr-2" />
                Connect with Contractor
              </Button>
            }
            onSuccess={() => {
              // Refresh the page after success
              window.location.reload();
            }}
          />
        )}
      </div>
      
      <div className="grid gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {isContractor ? 'Connection Requests from Companies' : 'Manage Contractor Connections'}
          </h2>
          <p className="text-zinc-400 mb-6">
            {isContractor 
              ? 'Companies that would like to work with you will send connection requests. You can accept or decline them here.'
              : 'Connect with contractors using their profile code. Once connected, you can assign them to your projects.'}
          </p>
          
          <ConnectionRequestsList />
        </div>
      </div>
    </div>
  );
}