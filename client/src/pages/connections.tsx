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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
              <ConnectionRequestsList />
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
    </div>
  );
}