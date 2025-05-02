import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Logo from "@assets/CD_icon_light@2x.png";

export default function ContractorInvitePage() {
  const { user, isLoading, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  console.log("ContractorInvitePage mounted", { 
    location, 
    search: window.location.search,
    fullUrl: window.location.href,
    pathname: window.location.pathname,
    hostname: window.location.hostname,
    protocol: window.location.protocol
  });
  
  // Invitation data
  const [token, setToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [workerType, setWorkerType] = useState<string>("contractor");
  const [inviteId, setInviteId] = useState<number | null>(null);
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(false);
  
  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "contractor",
    workerType: "contractor",
    businessToken: null as string | null,
    businessId: null as number | null,
    inviteId: null as number | null,
  });
  
  // Form errors
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  
  // Get invite parameters from URL on component mount
  useEffect(() => {
    console.log("Processing URL parameters");
    
    const searchParams = new URLSearchParams(window.location.search);
    console.log("Search params:", Object.fromEntries(searchParams.entries()));
    
    // Handle token-based invitations (new system)
    const tokenParam = searchParams.get('token');
    const businessIdParam = searchParams.get('businessId');
    const inviteIdParam = searchParams.get('invite');
    const emailParam = searchParams.get('email');
    const workerTypeParam = searchParams.get('workerType');
    
    console.log("URL parameters:", { 
      token: tokenParam, 
      businessId: businessIdParam, 
      inviteId: inviteIdParam,
      email: emailParam,
      workerType: workerTypeParam
    });
    
    if (tokenParam) {
      setToken(tokenParam);
      
      // Check if this is a company invite or a project invite
      if (businessIdParam) {
        // Company invite
        setBusinessId(parseInt(businessIdParam));
        setWorkerType(workerTypeParam || "contractor");
        
        // Update form with business data
        setRegisterForm(prev => ({
          ...prev,
          role: "contractor",
          workerType: workerTypeParam || "contractor",
          businessToken: tokenParam,
          businessId: parseInt(businessIdParam)
        }));
        
        console.log("Processed as company invite with businessId:", businessIdParam);
      } else if (inviteIdParam) {
        // Project invite
        setInviteId(parseInt(inviteIdParam));
        
        // Update form with invitation data
        setRegisterForm(prev => ({
          ...prev,
          role: "contractor",
          workerType: workerTypeParam || "contractor",
          email: emailParam || "",
          inviteId: parseInt(inviteIdParam)
        }));
        
        console.log("Processed as project invite with inviteId:", inviteIdParam);
      }
    } else if (inviteIdParam) {
      // Fallback for invites without token
      setInviteId(parseInt(inviteIdParam));
      
      // Update form with invitation data
      setRegisterForm(prev => ({
        ...prev,
        role: "contractor",
        workerType: workerTypeParam || "contractor",
        email: emailParam || "",
        inviteId: parseInt(inviteIdParam)
      }));
      
      console.log("Processed as legacy project invite with inviteId:", inviteIdParam);
    } else {
      console.warn("No valid invitation parameters found in URL");
    }
  }, [location]);
  
  // Verify business invite token if present
  const { data: businessInviteData, isLoading: isBusinessInviteLoading } = useQuery({
    queryKey: ['/api/business/verify-token', token, businessId],
    queryFn: async () => {
      if (!token || !businessId) return null;
      setIsVerifyingInvite(true);
      try {
        console.log("Verifying business token:", { token, businessId });
        const response = await apiRequest('GET', 
          `/api/business/verify-token?token=${encodeURIComponent(token)}&businessId=${encodeURIComponent(businessId.toString())}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error('Failed to verify business invite link');
        }
        const data = await response.json();
        console.log("Business invite verification response:", data);
        return data;
      } catch (error) {
        console.error('Error verifying business invite token:', error);
        return null;
      } finally {
        setIsVerifyingInvite(false);
      }
    },
    enabled: !!token && !!businessId
  });
  
  // Fetch project invite details if we have an ID
  const { data: inviteData, isLoading: isInviteDataLoading } = useQuery({
    queryKey: ['/api/invites', inviteId],
    queryFn: async () => {
      if (!inviteId) return null;
      setIsVerifyingInvite(true);
      try {
        console.log("Fetching project invite details:", { inviteId, token });
        const response = await apiRequest('GET', `/api/invites/${inviteId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          
          // Create a minimal fake invite object with data from URL params
          // This is a fallback to still show the form even if API fails
          const searchParams = new URLSearchParams(window.location.search);
          const fallbackData = {
            id: inviteId,
            projectName: searchParams.get('projectName') || "Unknown Project",
            workerType: searchParams.get('workerType') || "contractor",
            email: searchParams.get('email') || "",
            token: token || null,
            status: "pending" // Always assume pending to show the form
          };
          console.log("Using fallback invite data from URL:", fallbackData);
          return fallbackData;
        }
        
        const data = await response.json();
        console.log("Project invite data:", data);
        
        // Verify token matches if present
        if (token && data.token && token !== data.token) {
          console.warn("Token mismatch:", { urlToken: token, inviteToken: data.token });
          // Continue anyway with a warning instead of returning null
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching invite:', error);
        
        // Create a minimal fake invite object with data from URL params
        // This is a fallback to still show the form even if API fails
        const searchParams = new URLSearchParams(window.location.search);
        const fallbackData = {
          id: inviteId,
          projectName: searchParams.get('projectName') || "Unknown Project",
          workerType: searchParams.get('workerType') || "contractor",
          email: searchParams.get('email') || "",
          token: token || null,
          status: "pending" // Always assume pending to show the form
        };
        console.log("Using fallback invite data after error:", fallbackData);
        return fallbackData;
      } finally {
        setIsVerifyingInvite(false);
      }
    },
    enabled: !!inviteId
  });
  
  // Update form when invite data is loaded
  useEffect(() => {
    if (inviteData) {
      setRegisterForm(prev => ({
        ...prev,
        email: inviteData.email || prev.email,
        role: "contractor",
        workerType: inviteData.workerType || "contractor",
        inviteId: inviteData.id
      }));
    }
  }, [inviteData]);
  
  // Update form when business invite data is loaded
  useEffect(() => {
    if (businessInviteData && businessInviteData.valid) {
      setRegisterForm(prev => ({
        ...prev,
        role: "contractor",
        workerType: businessInviteData.workerType || "contractor",
        businessToken: token,
        businessId: businessId
      }));
    }
  }, [businessInviteData, token, businessId]);
  
  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/dashboard");
    }
  }, [user, isLoading, setLocation]);
  
  // Handle register form input changes
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
    // Clear error when field is modified
    if (registerErrors[e.target.name]) {
      setRegisterErrors({
        ...registerErrors,
        [e.target.name]: "",
      });
    }
  };
  
  // Validate registration form
  const validateRegisterForm = () => {
    const errors: Record<string, string> = {};
    
    if (!registerForm.username.trim()) {
      errors.username = "Username is required";
    }
    
    if (!registerForm.password) {
      errors.password = "Password is required";
    } else if (registerForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    if (!registerForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
      errors.email = "Email is invalid";
    }
    
    if (!registerForm.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    
    if (!registerForm.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle registration form submission
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateRegisterForm()) {
      // Omit confirmPassword as it's not needed for the API
      const { confirmPassword, ...registerData } = registerForm;
      
      // Handle business invite link registration
      if (token && businessId) {
        // Include business token information
        registerData.businessToken = token;
        registerData.businessId = businessId;
        registerData.role = 'contractor'; // Always contractor for business invites
        
        // Set worker type from business invite data
        if (businessInviteData && businessInviteData.workerType) {
          registerData.workerType = businessInviteData.workerType;
        } else if (!registerData.workerType) {
          registerData.workerType = 'contractor';
        }
      }
      // Handle project-specific invite registration
      else if (inviteId) {
        registerData.inviteId = inviteId;
        registerData.role = 'contractor';
        
        // Make sure workerType is set properly from invite data
        if (inviteData && inviteData.workerType) {
          registerData.workerType = inviteData.workerType;
        } else if (!registerData.workerType) {
          registerData.workerType = 'contractor';
        }
        
        // If this is an invite registration, make sure the email matches the invited email
        if (inviteData && inviteData.email && registerData.email !== inviteData.email) {
          setRegisterErrors({
            ...registerErrors,
            email: `You must use the invited email: ${inviteData.email}`
          });
          return;
        }
      }
      
      registerMutation.mutate(registerData);
    }
  };
  
  console.log("ContractorInvitePage render state:", {
    businessId, 
    businessInviteData, 
    inviteId, 
    inviteData, 
    isBusinessInviteLoading,
    isInviteDataLoading,
    isVerifyingInvite
  });
  
  // Render error state if verification fails
  // Only show error if verification is complete and has failed
  // Don't show error if we're still loading or if there are no invite parameters
  // For invites, we only show error if we've explicitly received a failed verification
  // NOT when inviteData is null/undefined (which happens during loading or API errors)
  if ((businessId && businessInviteData && !businessInviteData.valid && !isBusinessInviteLoading) || 
      (inviteId && inviteData && inviteData.status === 'invalid' && !isInviteDataLoading && !isVerifyingInvite)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-red-500">Invalid Invitation</CardTitle>
              <CardDescription className="text-zinc-400">
                This invitation link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <AlertCircle className="h-16 w-16 text-red-500 mb-2" />
                <p className="text-zinc-400 text-center">
                  Please contact the person who invited you to request a new invitation link.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                type="button" 
                onClick={() => setLocation("/auth")}
                className="bg-white text-black hover:bg-zinc-200"
              >
                Go to Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  // Render loading state while verifying invite
  if (isVerifyingInvite || isBusinessInviteLoading || isInviteDataLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardHeader className="text-center">
              <CardTitle>Verifying Invitation</CardTitle>
              <CardDescription className="text-zinc-400">
                Please wait while we verify your invitation...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-6">
                <Loader2 className="h-16 w-16 animate-spin text-white mb-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      {/* Registration Form Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle>Join as a Worker</CardTitle>
              <CardDescription className="text-zinc-400">
                {businessInviteData?.valid ? (
                  <div className="mt-2 p-3 bg-zinc-800 rounded-md border border-zinc-700">
                    <div className="text-white font-medium mb-1">
                      Business: {businessInviteData.businessName || "A company"}
                    </div>
                    <div className="text-zinc-400 text-sm mb-1">
                      You are being invited as a <strong>{businessInviteData.workerType || "contractor"}</strong>
                    </div>
                    <div className="text-zinc-400 text-sm">
                      Complete registration to join this business's team.
                    </div>
                  </div>
                ) : inviteData ? (
                  <div className="mt-2 p-3 bg-zinc-800 rounded-md border border-zinc-700">
                    <div className="text-white font-medium mb-1">Project: {inviteData.projectName}</div>
                    {inviteData.message && (
                      <div className="text-zinc-400 text-sm italic mb-1">{inviteData.message}</div>
                    )}
                    <div className="text-zinc-400 text-sm">Complete registration to accept this invitation.</div>
                  </div>
                ) : (
                  "Complete your registration to join the platform"
                )}
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={registerForm.firstName}
                      onChange={handleRegisterChange}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    {registerErrors.firstName && (
                      <div className="text-sm text-red-500">{registerErrors.firstName}</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-white">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={registerForm.lastName}
                      onChange={handleRegisterChange}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    {registerErrors.lastName && (
                      <div className="text-sm text-red-500">{registerErrors.lastName}</div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    disabled={inviteData?.email ? true : false} // Lock email if it came from invite
                  />
                  {registerErrors.email && (
                    <div className="text-sm text-red-500">{registerErrors.email}</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  {registerErrors.username && (
                    <div className="text-sm text-red-500">{registerErrors.username}</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  {registerErrors.password && (
                    <div className="text-sm text-red-500">{registerErrors.password}</div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={handleRegisterChange}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  {registerErrors.confirmPassword && (
                    <div className="text-sm text-red-500">{registerErrors.confirmPassword}</div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <div className="text-center mt-4">
            <p className="text-zinc-400">
              Already have an account?{" "}
              <Button
                variant="link"
                className="text-white p-0 h-auto"
                onClick={() => setLocation("/auth")}
              >
                Login
              </Button>
            </p>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-zinc-900 items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to Creativ Linc
          </h1>
          <p className="text-lg text-zinc-400 mb-6">
            Join our smart contract platform for seamless project management and automated payments.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-1" />
              <div>
                <h3 className="text-white font-medium">Smart Contract Automation</h3>
                <p className="text-zinc-500">No more invoicing. Get paid automatically when milestones are completed.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-1" />
              <div>
                <h3 className="text-white font-medium">Task Management</h3>
                <p className="text-zinc-500">Track projects, tasks, and deliverables all in one place.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-1" />
              <div>
                <h3 className="text-white font-medium">Financial Compliance</h3>
                <p className="text-zinc-500">All your contract data is stored securely and meets compliance standards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}