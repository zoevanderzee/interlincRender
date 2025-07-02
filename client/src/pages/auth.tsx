import { useState, useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { EmailVerificationForm } from "@/components/auth/EmailVerificationForm";
import SubscriptionForm from "@/components/SubscriptionForm";
import Logo from "@assets/CD_icon_light@2x.png";

export default function AuthPage() {
  console.log("AuthPage component rendering");
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    email: string;
    userId: number;
    verificationToken?: string;
  } | null>(null);
  const [inviteId, setInviteId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [businessToken, setBusinessToken] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [isWorker, setIsWorker] = useState<boolean>(false);
  const [isInviteLoading, setIsInviteLoading] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{
    id: number;
    email: string;
    username: string;
    role: string;
  } | null>(null);
  const { toast } = useToast();
  
  // Forgot password form state
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
  });
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json();
    },
    onSuccess: () => {
      setForgotPasswordSuccess(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset link",
        variant: "destructive",
      });
      setForgotPasswordError(error.message || "Failed to send password reset link");
    },
  });

  // Get invite parameters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    // Handle project-specific invites (legacy system)
    const inviteParam = searchParams.get('invite');
    const emailParam = searchParams.get('email');
    
    // Handle business onboarding links
    const tokenParam = searchParams.get('token');
    const businessIdParam = searchParams.get('businessId');
    const workerParam = searchParams.get('worker');
    
    if (inviteParam && emailParam) {
      // Project-specific invitation with email
      console.log(`Processing project invitation: ID=${inviteParam}, Email=${emailParam}`);
      setInviteId(parseInt(inviteParam));
      setInviteEmail(emailParam);
      setActiveTab("register"); // Automatically switch to register tab for invites
    } 
    else if (tokenParam && businessIdParam) {
      // Business onboarding link
      console.log(`Processing business invite link: Token=${tokenParam}, BusinessID=${businessIdParam}, WorkerType=${searchParams.get('workerType')}`);
      setBusinessToken(tokenParam);
      setBusinessId(parseInt(businessIdParam));
      const workerTypeParam = searchParams.get('workerType');
      
      // Handle direct worker type parameter
      if (workerTypeParam) {
        setRegisterForm(prev => ({
          ...prev,
          role: "contractor",
          workerType: workerTypeParam
        }));
      }
      
      setIsWorker(true); // Always set as worker with the simplified format
      setActiveTab("register"); // Automatically switch to register tab for invites
    }
  }, [location]);

  // Fetch project invite details if we have an ID
  const { data: inviteData, isLoading: isInviteDataLoading } = useQuery({
    queryKey: ['/api/invites', inviteId],
    queryFn: async () => {
      if (!inviteId) return null;
      setIsInviteLoading(true);
      try {
        const response = await fetch(`/api/invites/${inviteId}`);
        if (!response.ok) throw new Error('Failed to fetch invite');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching invite:', error);
        return null;
      } finally {
        setIsInviteLoading(false);
      }
    },
    enabled: !!inviteId
  });
  
  // Fetch business invite token info
  const { data: businessInviteData, isLoading: isBusinessInviteLoading } = useQuery({
    queryKey: ['/api/business/verify-token', businessToken, businessId],
    queryFn: async () => {
      if (!businessToken || !businessId) return null;
      setIsInviteLoading(true);
      try {
        const response = await apiRequest('GET', 
          `/api/business/verify-token?token=${businessToken}&businessId=${businessId}`
        );
        if (!response.ok) throw new Error('Failed to verify business invite link');
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error verifying business invite token:', error);
        return null;
      } finally {
        setIsInviteLoading(false);
      }
    },
    enabled: !!businessToken && !!businessId
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: inviteEmail || "",
    firstName: "",
    lastName: "",
    role: "contractor", // Default role for invited users
    workerType: "", // Will be set from invite data
    company: "",
    position: "",
    inviteId: inviteId || undefined,
    // New fields for business invites
    businessToken: businessToken || null,
    businessId: businessId || null,
  });
  
  // Update register form when invite data is loaded
  useEffect(() => {
    if (inviteEmail) {
      setRegisterForm(prev => ({
        ...prev,
        email: inviteEmail,
        role: "contractor", // Most invites are for contractors
        inviteId: inviteId || undefined
      }));
    }
  }, [inviteEmail, inviteId]);
  
  // Further update form when full invite data is loaded
  useEffect(() => {
    if (inviteData) {
      setRegisterForm(prev => ({
        ...prev,
        email: inviteData.email || prev.email,
        role: "contractor",
        // Set the workerType from the invite data (contractor or freelancer)
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
        // We store business token in state but pass it during registration
        businessToken: businessToken,
        businessId: businessId
      }));
    }
  }, [businessInviteData, businessToken, businessId]);
  
  // Helper function to render the appropriate registration description
  const renderRegistrationDescription = () => {
    if (inviteData) {
      // Project-specific invitation with data loaded
      return (
        <>
          You've been invited to join a project on Creativ Linc
          <div className="mt-2 p-3 bg-zinc-800 rounded-md border border-zinc-700">
            <h4 className="text-white font-medium mb-1">Project: {inviteData.projectName}</h4>
            {inviteData.message && (
              <p className="text-zinc-400 text-sm italic mb-1">{inviteData.message}</p>
            )}
            <p className="text-zinc-400 text-sm">Complete registration to accept this invitation.</p>
          </div>
        </>
      );
    } 
    
    if (inviteId) {
      // Project invitation with ID only, waiting for data
      return (
        <>
          {isInviteLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading invitation details...
            </div>
          ) : (
            <>
              You've been invited to join a project on Creativ Linc
              <p className="mt-1">Complete registration to accept this invitation.</p>
            </>
          )}
        </>
      );
    }
    
    if (businessInviteData && businessInviteData.valid) {
      // Business invite with data loaded
      return (
        <>
          You've been invited to join a business on Creativ Linc
          <div className="mt-2 p-3 bg-zinc-800 rounded-md border border-zinc-700">
            <h4 className="text-white font-medium mb-1">
              Business: {businessInviteData.businessName || "A company"}
            </h4>
            <p className="text-zinc-400 text-sm mb-1">
              You are being invited as a <strong>{businessInviteData.workerType || "contractor"}</strong>
            </p>
            <p className="text-zinc-400 text-sm">
              Complete registration to join this business's team.
            </p>
          </div>
        </>
      );
    }
    
    if (businessToken && businessId) {
      // Business invite with token only, waiting for data
      return (
        <>
          {isBusinessInviteLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying business invitation...
            </div>
          ) : (
            <>
              You've been invited to join a business on Creativ Linc
              <p className="mt-1">Complete registration to accept this invitation.</p>
            </>
          )}
        </>
      );
    }
    
    // Regular registration
    return "Sign up to get started with Creativ Linc";
  };

  // Form Error States
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  // Handle login form input changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
    // Clear error when field is modified
    if (loginErrors[e.target.name]) {
      setLoginErrors({
        ...loginErrors,
        [e.target.name]: "",
      });
    }
  };

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

  // Handle role selection in register form
  const handleRoleChange = (value: string) => {
    setRegisterForm({
      ...registerForm,
      role: value,
    });
  };

  // Validate login form
  const validateLoginForm = () => {
    const errors: Record<string, string> = {};
    
    if (!loginForm.username.trim()) {
      errors.username = "Username is required";
    }
    
    if (!loginForm.password) {
      errors.password = "Password is required";
    }
    
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate register form
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
    
    if (registerForm.role === "business" && !registerForm.company.trim()) {
      errors.company = "Company name is required for business accounts";
    }
    
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle login form submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateLoginForm()) {
      loginMutation.mutate(loginForm);
    }
  };

  // Handle register form submission
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateRegisterForm()) {
      // Omit confirmPassword as it's not needed for the API
      const { confirmPassword, ...registerData } = registerForm;
      
      // Handle business invite link registration
      if (businessToken && businessId) {
        // Include business token information
        (registerData as any).token = businessToken;
        (registerData as any).businessId = businessId;
        registerData.role = 'contractor'; // Always contractor for business invites
        
        // Set worker type from business invite data
        if (businessInviteData && businessInviteData.workerType) {
          registerData.workerType = businessInviteData.workerType;
        } else if (!registerData.workerType) {
          // Default to contractor if not specified
          registerData.workerType = 'contractor';
        }
      }
      // Handle project-specific invite registration
      else if (inviteId || inviteEmail) {
        // If we have an invite ID, make sure it's included in the registration data
        if (inviteId && !registerData.inviteId) {
          registerData.inviteId = inviteId;
        }
        
        // If this is an invite registration, make sure the email matches the invited email
        if (inviteEmail && registerData.email !== inviteEmail) {
          setRegisterErrors({
            ...registerErrors,
            email: `You must use the invited email: ${inviteEmail}`
          });
          return;
        }
        
        registerData.role = 'contractor';
        
        // Make sure workerType is set properly from invite data
        if (inviteData && inviteData.workerType) {
          registerData.workerType = inviteData.workerType;
        } else if (!registerData.workerType) {
          // Default to contractor if not specified
          registerData.workerType = 'contractor';
        }
      }
      
      // If this is a business user direct registration, make sure company name is provided
      if (registerData.role === 'business' && !registerData.company) {
        setRegisterErrors({
          ...registerErrors,
          company: "Company name is required for business accounts"
        });
        return;
      }
      
      // Register user with email verification required
      registerMutation.mutate(registerData, {
        onSuccess: (data: any) => {
          console.log('Registration response:', data);
          console.log('requiresSubscription:', data.requiresSubscription);
          console.log('requiresEmailVerification:', data.requiresEmailVerification);
          
          if (data.requiresEmailVerification) {
            // Show email verification form
            setVerificationData({
              email: registerData.email,
              userId: data.id,
              verificationToken: data.emailVerificationToken
            });
            setShowEmailVerification(true);
          } else if (data.requiresSubscription) {
            // Registration successful, show subscription form
            // Don't update user cache - user isn't logged in yet
            setRegisteredUser({
              id: data.id,
              email: data.email,
              username: data.username,
              role: data.role
            });
            setShowSubscription(true);
            // Prevent cache update by not setting user data
            return;
          } else {
            // User already has subscription or is from invite - redirect to dashboard
            toast({
              title: "Welcome to Creativ Linc!",
              description: "Your account is ready.",
            });
            // The user is already logged in via the registration process
            window.location.href = "/";
          }
        }
      });
    }
  };
  
  // Handle forgot password form input change
  const handleForgotPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForgotPasswordForm({
      ...forgotPasswordForm,
      [e.target.name]: e.target.value,
    });
    setForgotPasswordError("");
  };
  
  // Validate forgot password form
  const validateForgotPasswordForm = () => {
    if (!forgotPasswordForm.email.trim()) {
      setForgotPasswordError("Email is required");
      return false;
    } else if (!/\S+@\S+\.\S+/.test(forgotPasswordForm.email)) {
      setForgotPasswordError("Email is invalid");
      return false;
    }
    return true;
  };
  
  // Handle forgot password form submission
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForgotPasswordForm()) {
      forgotPasswordMutation.mutate(forgotPasswordForm.email);
    }
  };

  // Redirect if user is already logged in
  if (user && !isLoading) {
    return <Redirect to="/" />;
  }

  // Show forgot password form if requested
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  // Show email verification form if requested
  if (showEmailVerification && verificationData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <EmailVerificationForm 
          email={verificationData.email}
          userId={verificationData.userId}
          verificationToken={verificationData.verificationToken}
          onBack={() => {
            setShowEmailVerification(false);
            setVerificationData(null);
          }}
          onVerified={() => {
            setShowEmailVerification(false);
            setVerificationData(null);
            // After verification, show subscription form
            setShowSubscription(true);
          }}
        />
      </div>
    );
  }

  // Show subscription form after successful registration
  if (showSubscription && registeredUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <SubscriptionForm
          userRole={registeredUser.role as 'business' | 'contractor'}
          userEmail={registeredUser.email}
          userName={registeredUser.username}
          userId={registeredUser.id}
          onSubscriptionComplete={() => {
            setShowSubscription(false);
            setRegisteredUser(null);
            toast({
              title: "Welcome to Creativ Linc!",
              description: "Your account is ready.",
            });
            // User is now logged in via the subscription completion, redirect to dashboard
            window.location.href = "/";
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row">
      {/* Auth Forms Section */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
              <TabsTrigger value="login" className="text-white">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-white">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card className="border-zinc-700 bg-zinc-900 text-white">
                <CardHeader>
                  <CardTitle>Login to Creativ Linc</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-white">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        placeholder="Enter your username"
                        value={loginForm.username}
                        onChange={handleLoginChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      {loginErrors.username && (
                        <p className="text-sm text-red-500">{loginErrors.username}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      {loginErrors.password && (
                        <p className="text-sm text-red-500">{loginErrors.password}</p>
                      )}
                      <div className="mt-2 text-right">
                        <button 
                          type="button" 
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-zinc-400 hover:text-white"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full bg-white text-black hover:bg-zinc-200"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card className="border-zinc-700 bg-zinc-900 text-white">
                <CardHeader>
                  <CardTitle>Create an Account</CardTitle>
                  <CardDescription className="text-zinc-400">
                    {renderRegistrationDescription()}
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
                          placeholder="John"
                          value={registerForm.firstName}
                          onChange={handleRegisterChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {registerErrors.firstName && (
                          <p className="text-sm text-red-500">{registerErrors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-white">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          value={registerForm.lastName}
                          onChange={handleRegisterChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {registerErrors.lastName && (
                          <p className="text-sm text-red-500">{registerErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-red-500">{registerErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-white">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        placeholder="johndoe"
                        value={registerForm.username}
                        onChange={handleRegisterChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                      {registerErrors.username && (
                        <p className="text-sm text-red-500">{registerErrors.username}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {registerErrors.password && (
                          <p className="text-sm text-red-500">{registerErrors.password}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={registerForm.confirmPassword}
                          onChange={handleRegisterChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {registerErrors.confirmPassword && (
                          <p className="text-sm text-red-500">{registerErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-white">Account Type</Label>
                      <Select 
                        value={registerForm.role} 
                        onValueChange={handleRoleChange}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {registerForm.role === "business" && (
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-white">Company Name</Label>
                        <Input
                          id="company"
                          name="company"
                          placeholder="Acme Inc."
                          value={registerForm.company}
                          onChange={handleRegisterChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {registerErrors.company && (
                          <p className="text-sm text-red-500">{registerErrors.company}</p>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="position" className="text-white">Position Title</Label>
                      <Input
                        id="position"
                        name="position"
                        placeholder="CEO, Project Manager, etc."
                        value={registerForm.position}
                        onChange={handleRegisterChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
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
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
            
            {/* Forgot Password Form */}
            <TabsContent value="forgot-password">
              <Card className="border-zinc-700 bg-zinc-900 text-white">
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab("login")}
                      className="p-1 mr-2 rounded-full hover:bg-zinc-800"
                    >
                      <ArrowLeft className="h-4 w-4 text-zinc-400" />
                    </button>
                    <CardTitle>Forgot Password</CardTitle>
                  </div>
                  <CardDescription className="text-zinc-400">
                    Enter your email address and we'll send you a link to reset your password
                  </CardDescription>
                </CardHeader>
                {forgotPasswordSuccess ? (
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                      <h3 className="text-xl font-medium text-white">Check Your Email</h3>
                      <p className="text-zinc-400">
                        We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                      </p>
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("login")}
                        className="mt-4 bg-white text-black hover:bg-zinc-200"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <form onSubmit={handleForgotPassword}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={forgotPasswordForm.email}
                          onChange={handleForgotPasswordChange}
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                        {forgotPasswordError && (
                          <div className="flex items-center mt-2 text-sm text-red-500">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {forgotPasswordError}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        type="submit" 
                        className="w-full bg-white text-black hover:bg-zinc-200"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending reset link...
                          </>
                        ) : (
                          "Send Reset Link"
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="w-full md:w-1/2 bg-zinc-900 p-12 flex items-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">
            Creativ Linc
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Connect. Create. Collaborate.
          </h2>
          <p className="text-zinc-400 mb-6">
            Outsourcing, Simplified.
            Manage people, payments, and projects with clarity, control, and zero invoicing.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">No Invoices. No Hassle.</h3>
                <p className="text-zinc-400">Streamline payments with built-in workflows and milestone approvals — no manual paperwork.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">Real-Time Financial Visibility</h3>
                <p className="text-zinc-400">Track budgets, teams, and progress in one place with compliance-ready data capture.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">Smarter Payouts. Faster Turnarounds.</h3>
                <p className="text-zinc-400">Trigger payments on your terms — once work is approved, your teams get paid seamlessly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}