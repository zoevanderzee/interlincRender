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

  // TODO: Connect to real pending invitations API when implemented
  const pendingInvitations = [];

  const handleCancelInvite = async (inviteId: string) => {
    // TODO: Implement cancellation logic when API is ready
    console.log(`Cancelling invite: ${inviteId}`);
  };

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

        {/* Pending Invitations Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              These are invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invitation</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No pending invitations
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingInvitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.id}</TableCell>
                      <TableCell>{invite.recipientEmail || invite.recipientUserId}</TableCell>
                      <TableCell>
                        <Badge variant={invite.inviteType === 'project' ? 'default' : 'secondary'}>
                          {invite.inviteType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{invite.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}