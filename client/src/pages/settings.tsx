import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileCodeSection } from "@/components/profile/ProfileCodeSection";
import { ConnectionRequestsList } from "@/components/profile/ConnectionRequestsList";

import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2, User, Lock, Fingerprint, Bell, Settings as SettingsIcon, CreditCard } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const isContractor = user?.role === "contractor" || user?.role === "freelancer";

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}`, formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all queries that display user profile data (SSOT pattern)
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/integrated"] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.companyName) return user.companyName;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.username || "User";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Settings</h1>
          <p className="text-primary-500 mt-1">Manage your account preferences and settings</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="text-lg">{getInitials(getDisplayName())}</AvatarFallback>
                </Avatar>
                <h3 className="font-medium text-lg">{getDisplayName()}</h3>
                <p className="text-muted-foreground text-sm">{user.email}</p>
                <p className="text-sm mt-1 inline-block px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                  {user.role === "business" ? "Business Account" : user.workerType || "Contractor"}
                </p>
              </div>

              <div className="space-y-1">
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
                <Button
                  variant={activeTab === "security" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("security")}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Security
                </Button>
                {isContractor && (
                  <Button
                    variant={activeTab === "connections" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("connections")}
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Connections
                  </Button>
                )}

                <Button
                  variant={activeTab === "subscription" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("subscription")}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscription
                </Button>
                <Button
                  variant={activeTab === "preferences" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("preferences")}
                >
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Preferences
                </Button>
                <Button
                  variant={activeTab === "notifications" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal or business information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      defaultValue={user.firstName || ""}
                      placeholder="Your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      defaultValue={user.lastName || ""}
                      placeholder="Your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email}
                    placeholder="Your email address"
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Email changes require verification and are not available through this form.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title / Position</Label>
                  <Input
                    id="title"
                    defaultValue={user.title || ""}
                    placeholder="Your job title or position"
                  />
                </div>

                {user.role === "business" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      defaultValue={user.companyName || ""}
                      placeholder="Your company name"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => {
                      const firstName = (document.getElementById("firstName") as HTMLInputElement).value?.trim();
                      const lastName = (document.getElementById("lastName") as HTMLInputElement).value?.trim();
                      const title = (document.getElementById("title") as HTMLInputElement).value?.trim();
                      
                      const formData: any = {};
                      
                      // Always include firstName and lastName (can be empty strings)
                      formData.firstName = firstName || "";
                      formData.lastName = lastName || "";
                      
                      // Only include title if it has a value
                      if (title) {
                        formData.title = title;
                      }
                      
                      if (user.role === "business") {
                        const companyName = (document.getElementById("companyName") as HTMLInputElement)?.value?.trim();
                        // Only include companyName if it has a value
                        if (companyName) {
                          formData.companyName = companyName;
                        }
                      }
                      
                      updateProfileMutation.mutate(formData);
                    }}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and account security</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Password changes and security settings will be available in a future update.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === "connections" && isContractor && (
            <div className="space-y-6">
              <ProfileCodeSection />
              <ConnectionRequestsList />
            </div>
          )}

          {activeTab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Configure your account preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Account preferences will be available in a future update.
                </p>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscription" && (
            <SubscriptionSettings user={user} />
          )}



          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Notification settings will be available in a future update.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}