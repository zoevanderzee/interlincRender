import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  User,
  Shield,
  CreditCard,
  Bell,
  Lock,
  UserCog,
  Building,
  Mail,
  Phone,
  Loader2,
  Save,
} from "lucide-react";

const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  companyName: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  contractUpdates: z.boolean().default(true),
  paymentNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  milestoneReminders: z.boolean().default(true),
});

const Settings = () => {
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "Sarah",
      lastName: "Thompson",
      email: "sarah@creativelinc.com",
      companyName: "CreativLinc Inc.",
      title: "Project Manager",
      phone: "+1 (555) 123-4567",
    },
  });

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification settings form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      contractUpdates: true,
      paymentNotifications: true,
      marketingEmails: false,
      milestoneReminders: true,
    },
  });

  // Handle profile form submission
  const onSubmitProfile = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      setIsUpdatingProfile(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
      
      console.log("Profile updated:", values);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle password form submission
  const onSubmitPassword = async (values: z.infer<typeof passwordFormSchema>) => {
    try {
      setIsUpdatingPassword(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle notification settings form submission
  const onSubmitNotifications = async (values: z.infer<typeof notificationFormSchema>) => {
    try {
      setIsUpdatingNotifications(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
      });
      
      console.log("Notification settings updated:", values);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error updating your notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Settings</h1>
        <p className="text-primary-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="flex items-center">
            <User size={16} className="mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Lock size={16} className="mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell size={16} className="mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center">
            <CreditCard size={16} className="mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center">
            <Building size={16} className="mr-2" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 overflow-hidden">
                      <User size={32} />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary-900">Profile Picture</h3>
                      <p className="text-sm text-primary-500 mb-2">
                        Upload a new profile picture
                      </p>
                      <Button variant="outline" size="sm">
                        Change Avatar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdatingProfile}>
                      {isUpdatingProfile && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password & Security</CardTitle>
              <CardDescription>
                Update your password and manage security settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 8 characters long
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdatingPassword}>
                      {isUpdatingPassword && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Update Password
                    </Button>
                  </div>
                </form>
              </Form>

              <Separator className="my-8" />

              <div>
                <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                <p className="text-primary-500 mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <Button variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  Enable 2FA
                </Button>
              </div>

              <Separator className="my-8" />

              <div>
                <h3 className="text-lg font-medium mb-4">Login Sessions</h3>
                <p className="text-primary-500 mb-4">
                  These are the devices that have logged into your account. Revoke any sessions that you do not recognize.
                </p>
                <div className="bg-primary-50 p-4 rounded-md mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-primary-900">Chrome on Windows</p>
                      <p className="text-sm text-primary-500">Last active: Today at 11:23 AM</p>
                    </div>
                    <div className="px-2 py-1 bg-success-100 text-success text-xs rounded-full font-medium">
                      Current
                    </div>
                  </div>
                </div>
                <div className="bg-primary-50 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-primary-900">Safari on iPhone</p>
                      <p className="text-sm text-primary-500">Last active: Yesterday at 3:45 PM</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email notifications for important updates
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="contractUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Contract Updates</FormLabel>
                            <FormDescription>
                              Get notified when contracts are created or updated
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="paymentNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Payment Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications about payment processing and completion
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="milestoneReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Milestone Reminders</FormLabel>
                            <FormDescription>
                              Get reminders about upcoming and overdue milestones
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="marketingEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Marketing Emails</FormLabel>
                            <FormDescription>
                              Receive product updates and promotional offers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isUpdatingNotifications}>
                      {isUpdatingNotifications && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Preferences
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription plan and payment methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Current Plan</h3>
                <div className="bg-primary-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-primary-900">Business Pro</p>
                      <p className="text-sm text-primary-500">
                        $49.99/month, billed annually
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-success-100 text-success font-medium rounded-full text-sm">
                      Active
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="text-sm text-primary-700">
                    <p className="mb-2">Your plan includes:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center">
                        <CheckIcon className="mr-2 h-4 w-4 text-success" />
                        Unlimited smart contracts
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2 h-4 w-4 text-success" />
                        Up to 25 team members
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2 h-4 w-4 text-success" />
                        Advanced reporting
                      </li>
                      <li className="flex items-center">
                        <CheckIcon className="mr-2 h-4 w-4 text-success" />
                        Priority support
                      </li>
                    </ul>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/subscribe'}>
                      Change Plan
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-medium mb-2">Payment Methods</h3>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-primary-100 rounded-md flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-700">
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <line x1="2" x2="22" y1="10" y2="10" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Visa ending in 4242</p>
                          <p className="text-sm text-primary-500">Expires 12/2025</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                        Default
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Billing History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-primary-200">
                      <thead className="bg-primary-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-primary-500 uppercase tracking-wider">
                            Invoice
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-primary-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            Aug 1, 2023
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            Business Pro (Annual)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            $599.88
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-100 text-success">
                              Paid
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-accent-500 hover:text-accent-600">
                              Download
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            Jul 1, 2022
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            Business Pro (Annual)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                            $499.88
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-100 text-success">
                              Paid
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-accent-500 hover:text-accent-600">
                              Download
                            </a>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>
                Manage your company information and team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Company Name
                    </label>
                    <Input defaultValue="CreativLinc Inc." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Industry
                    </label>
                    <Input defaultValue="Software & Technology" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Business Email
                    </label>
                    <Input defaultValue="info@creativlinc.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Business Phone
                    </label>
                    <Input defaultValue="+1 (555) 987-6543" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Business Address
                    </label>
                    <Input defaultValue="123 Tech Street, Suite 400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      City
                    </label>
                    <Input defaultValue="San Francisco" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      State/Province
                    </label>
                    <Input defaultValue="CA" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Postal Code
                    </label>
                    <Input defaultValue="94103" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">
                      Country
                    </label>
                    <Input defaultValue="United States" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Company Information
                  </Button>
                </div>
              </div>

              <Separator className="my-8" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Team Members</h3>
                  <Button variant="outline">
                    <UserCog className="mr-2 h-4 w-4" />
                    Invite Team Member
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 overflow-hidden mr-3">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Sarah Thompson</p>
                          <p className="text-sm text-primary-500">sarah@creativlinc.com • Administrator</p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                        Owner
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 overflow-hidden mr-3">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Michael Chen</p>
                          <p className="text-sm text-primary-500">michael@creativlinc.com • Finance</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 overflow-hidden mr-3">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-medium">Jessica Rodriguez</p>
                          <p className="text-sm text-primary-500">jessica@creativlinc.com • Project Manager</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

// CheckIcon component
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default Settings;
