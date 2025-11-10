import { useAuth } from "@/hooks/use-auth";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";
import { FindByProfileCodeDialog } from "@/components/contractors/FindByProfileCodeDialog";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft } from "lucide-react";
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

      <div className="grid gap-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {isContractor ? 'Company Connections' : 'Contractor Connections'}
          </h2>
          <p className="text-zinc-400 mb-6">
            {isContractor
              ? 'Share your profile code with companies or enter a company\'s code to connect. Once connected, they can assign you to projects.'
              : 'Share your profile code with contractors or enter their code to connect. Once connected, you can assign them to your projects.'}
          </p>

          <ConnectionRequestsList />
        </div>
      </div>
    </div>
  );
}