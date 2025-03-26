import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { User, insertUserSchema } from "@shared/schema";
import { Search, Plus, Mail, Phone, FileText, UserCheck, ArrowRight, User as UserIcon, Building, Briefcase, Loader2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

const Contractors = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewContractorDialogOpen, setIsNewContractorDialogOpen] = useState(
    location.includes("?action=new")
  );

  // Fetch contractors
  const { data: contractors = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users', { role: 'contractor' }],
  });

  // Fetch contracts to show count per contractor
  const { data: contracts = [] } = useQuery({
    queryKey: ['/api/contracts'],
  });

  // Filter contractors by search term
  const filteredContractors = contractors.filter((contractor) => {
    return (
      searchTerm === "" ||
      `${contractor.firstName} ${contractor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contractor.companyName && contractor.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Form schema for new contractor
  const formSchema = insertUserSchema
    .pick({
      firstName: true,
      lastName: true,
      email: true,
      companyName: true,
      title: true,
    })
    .extend({
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    });

  // Form for new contractor
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      title: "",
    },
  });

  // Create contractor mutation
  const createContractorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Generate a username from email
      const username = data.email.split("@")[0].toLowerCase();
      
      // Create the contractor with role set to contractor
      const contractor = {
        username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: "contractor" as const,
        companyName: data.companyName,
        title: data.title,
        profileImageUrl: "",
      };
      
      return apiRequest("POST", "/api/users", contractor);
    },
    onSuccess: () => {
      toast({
        title: "Contractor created",
        description: "The contractor has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsNewContractorDialogOpen(false);
      form.reset();
      
      // Remove the query param
      navigate("/contractors");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not create contractor. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createContractorMutation.mutate(data);
  };

  // Get contract count for a contractor
  const getContractCount = (contractorId: number) => {
    return contracts.filter(c => c.contractorId === contractorId).length;
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsNewContractorDialogOpen(false);
    navigate("/contractors", { replace: true });
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-primary-900">Contractors</h1>
          <p className="text-primary-500 mt-1">Manage your external workers and vendors</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isNewContractorDialogOpen} onOpenChange={setIsNewContractorDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" />
                Add Contractor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add New Contractor</DialogTitle>
                <DialogDescription>
                  Add a new contractor to work on your projects. They'll be able to view contracts and submit deliverables.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          They'll use this email to log in to the platform
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Web Developer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createContractorMutation.isPending}
                    >
                      {createContractorMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Contractor
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-400" size={18} />
        <Input
          placeholder="Search contractors..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Contractors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <Card className="p-5 h-64"></Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContractors.map((contractor) => (
            <Card 
              key={contractor.id} 
              className="p-5 border border-primary-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                    {contractor.profileImageUrl ? (
                      <img 
                        src={contractor.profileImageUrl} 
                        alt={`${contractor.firstName} ${contractor.lastName}`}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-900">
                      {contractor.firstName} {contractor.lastName}
                    </h3>
                    <p className="text-sm text-primary-500">{contractor.title}</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-primary-100 rounded-md text-xs font-medium text-primary-700">
                  {getContractCount(contractor.id)} {getContractCount(contractor.id) === 1 ? 'contract' : 'contracts'}
                </div>
              </div>
              
              {contractor.companyName && (
                <div className="flex items-center text-sm text-primary-600 mb-3">
                  <Building size={16} className="mr-2" />
                  {contractor.companyName}
                </div>
              )}
              
              <div className="flex items-center text-sm text-primary-600 mb-3">
                <Mail size={16} className="mr-2" />
                {contractor.email}
              </div>
              
              <div className="flex items-center text-sm text-primary-600 mb-4">
                <Briefcase size={16} className="mr-2" />
                {contractor.title}
              </div>
              
              <div className="flex justify-between mt-auto pt-4 border-t border-primary-100">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/contractors/${contractor.id}`)}
                >
                  <UserCheck size={16} className="mr-1" />
                  Profile
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/contracts?contractor=${contractor.id}`)}
                >
                  <FileText size={16} className="mr-1" />
                  Contracts
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-accent-500 hover:text-accent-600 hover:bg-accent-50"
                  onClick={() => navigate(`/contracts/new?contractor=${contractor.id}`)}
                >
                  Assign
                  <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
            </Card>
          ))}
          
          {/* Empty state */}
          {filteredContractors.length === 0 && (
            <div className="col-span-full bg-white rounded-lg shadow-sm border border-primary-100 p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary-50 flex items-center justify-center text-primary-500 mb-4">
                <UserIcon size={32} />
              </div>
              <h3 className="text-lg font-medium text-primary-900 mb-2">No contractors found</h3>
              <p className="text-primary-500 mb-6">
                {searchTerm ? 
                  "No contractors match your search criteria." : 
                  "Get started by adding your first contractor."}
              </p>
              {searchTerm ? (
                <Button variant="outline" onClick={() => setSearchTerm("")}>
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => setIsNewContractorDialogOpen(true)}>
                  <Plus size={16} className="mr-2" />
                  Add Contractor
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Contractors;
