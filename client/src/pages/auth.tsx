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
import { signUpUser, loginUser } from "@/lib/firebase-auth";
import { requiresSubscription } from "@/lib/subscription-utils";

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
    registrationData?: any;
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

    // Handle subscription redirect after email verification
    const showSubscriptionParam = searchParams.get('showSubscription');
    const userIdParam = searchParams.get('userId');
    const roleParam = searchParams.get('role');
    const emailParam = searchParams.get('email');

    if (showSubscriptionParam === 'true' && userIdParam && roleParam && emailParam) {
      console.log(`Processing subscription redirect after email verification: UserID=${userIdParam}, Role=${roleParam}, Email=${emailParam}`);
      setShowSubscription(true);
      setRegisteredUser({
        id: parseInt(userIdParam),
        email: emailParam,
        username: emailParam.split('@')[0],
        role: roleParam
      });
      return; // Exit early to avoid other URL handling
    }

    // Handle project-specific invites (legacy system)
    const inviteParam = searchParams.get('invite');
    const inviteEmailParam = searchParams.get('email');

    // Handle business onboarding links
    const tokenParam = searchParams.get('token');
    const businessIdParam = searchParams.get('businessId');
    const workerParam = searchParams.get('worker');

    if (inviteParam && inviteEmailParam) {
      // Project-specific invitation with email
      console.log(`Processing project invitation: ID=${inviteParam}, Email=${inviteEmailParam}`);
      setInviteId(parseInt(inviteParam));
      setInviteEmail(inviteEmailParam);
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
    role: "business", // Default role for direct signups (only invites should be contractors)
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
          You've been invited to join a project on Interlinc
          <div className="mt-3 p-4 bg-black/30 rounded-lg border border-amber-500/20 backdrop-blur-sm">
            <h4 className="text-amber-200 font-medium mb-1.5 tracking-wide">{inviteData.projectName}</h4>
            {inviteData.message && (
              <p className="text-zinc-300/80 text-sm italic mb-1.5">{inviteData.message}</p>
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
          {isInviteDataLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading invitation details...
            </div>
          ) : (
            <>
              You've been invited to join a project on Interlinc
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
          You've been invited to join a business on Interlinc
          <div className="mt-3 p-4 bg-black/30 rounded-lg border border-amber-500/20 backdrop-blur-sm">
            <h4 className="text-amber-200 font-medium mb-1.5 tracking-wide">
              {businessInviteData.businessName || "A company"}
            </h4>
            <p className="text-zinc-300/80 text-sm mb-1.5">
              You are being invited as a <strong className="text-amber-300">{businessInviteData.workerType || "contractor"}</strong>
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
              You've been invited to join a business on Interlinc
              <p className="mt-1">Complete registration to accept this invitation.</p>
            </>
          )}
        </>
      );
    }

    // Regular registration
    return "Sign up to get started with Interlinc";
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
    setRegisterForm(prev => ({
      ...prev,
      role: value,
    }));
  };

  // Validate login form
  const validateLoginForm = () => {
    const errors: Record<string, string> = {};

    if (!loginForm.username.trim()) {
      errors.username = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(loginForm.username)) {
      errors.username = "Please enter a valid email address";
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

  // Handle login form submission with Firebase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    try {
      console.log("Attempting Firebase login with:", loginForm.username);

      // Use email directly since form now requires email format
      const result = await loginUser(loginForm.username, loginForm.password);
      console.log("Firebase login result:", { success: result.success, hasUser: !!result.user, error: result.error });

      if (result.success && result.user) {
        console.log("Firebase login successful, syncing with backend...");

        // After successful Firebase login, get the user data from our backend
        try {
          // Check if there's pending registration data in database using Firebase UID
          let registrationData = null;

          try {
            const pendingRegResponse = await fetch(`/api/pending-registrations/${result.user.uid}`);
            if (pendingRegResponse.ok) {
              registrationData = await pendingRegResponse.json();
              console.log("Found pending registration data for login:", {
                role: registrationData.role,
                email: registrationData.email
              });
            } else if (pendingRegResponse.status !== 404) {
              console.error("Error fetching pending registration:", await pendingRegResponse.text());
            }
          } catch (e) {
            console.error("Failed to fetch pending registration data:", e);
          }

          const syncPayload: any = {
            uid: result.user.uid,
            email: result.user.email,
            emailVerified: result.user.emailVerified,
            displayName: result.user.displayName || ""
          };

          // Include registration data if available (for first-time logins after registration)
          if (registrationData) {
            syncPayload.registrationData = registrationData;
            console.log("Including registration data in login sync - role:", registrationData.role);
          }

          console.log("Attempting to sync Firebase user with backend:", syncPayload);

          const syncResponse = await fetch("/api/sync-firebase-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(syncPayload),
            credentials: 'include'
          });

          console.log("Sync response status:", syncResponse.status);

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log("Backend sync successful:", syncData);

            // Clear pending registration data after successful sync
            if (registrationData && registrationData.firebaseUid) {
              try {
                await fetch(`/api/pending-registrations/${registrationData.firebaseUid}`, {
                  method: 'DELETE'
                });
                console.log("Cleared pending registration data from database");
              } catch (e) {
                console.error("Failed to delete pending registration:", e);
              }
            }

            // Now fetch the user data using Firebase UID header
            const userResponse = await fetch('/api/user', {
              headers: {
                'X-Firebase-UID': result.user.uid,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log("User data retrieved:", userData);

              // Store authentication data in localStorage for future requests
              localStorage.setItem('user_id', userData.id.toString());
              localStorage.setItem('firebase_uid', result.user.uid);
              console.log("Authentication data stored:");
              console.log("- user_id:", userData.id);
              console.log("- firebase_uid:", result.user.uid);

              toast({
                title: "Login Successful",
                description: "Welcome back!",
              });

              // Check if user requires subscription using the actual userData object
              console.log('Checking subscription for user:', {
                id: userData.id,
                subscriptionStatus: userData.subscriptionStatus,
                invited: userData.invited,
                role: userData.role
              });

              const needsSubscription = requiresSubscription(userData);

              console.log('Subscription check after sync:', {
                userId: userData.id,
                subscriptionStatus: userData.subscriptionStatus,
                invited: userData.invited,
                role: userData.role,
                needsSubscription
              });

              // Always redirect to dashboard after successful login
              console.log("Login successful, redirecting to dashboard");
              window.location.href = '/';
            } else {
              throw new Error("Failed to retrieve user data from backend");
            }
          } else {
            const syncErrorData = await syncResponse.json();
            console.error("Backend sync failed:", syncErrorData);
            throw new Error(`Failed to sync with backend: ${syncErrorData.details || syncErrorData.error || 'Unknown error'}`);
          }
        } catch (syncError: any) {
          console.error("Backend sync error:", syncError);

          // Try to get more specific error information
          let errorMessage = "Authentication succeeded but failed to sync with backend";
          if (syncError.message && syncError.message.includes('Failed to sync with backend:')) {
            errorMessage = syncError.message;
          }

          throw new Error(errorMessage);
        }
      } else {
        setLoginErrors({
          username: result.error || "Login failed",
          password: ""
        });
        toast({
          title: "Login Failed",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginErrors({
        username: "Login failed",
        password: ""
      });
      toast({
        title: "Login Failed", 
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  // Handle Firebase registration
  const handleFirebaseRegistration = async (registerData: any) => {
    try {
      // Create user with Firebase Auth
      const result = await signUpUser(registerData.email, registerData.password);

      if (result.success && result.user) {
        // Store registration data in database for email verification flow
        try {
          const pendingRegistrationData = {
            firebaseUid: result.user.uid,
            role: registerData.role,
            firstName: registerData.firstName,
            lastName: registerData.lastName,
            username: registerData.username,
            company: registerData.company,
            position: registerData.position,
            workerType: registerData.workerType,
            email: registerData.email
          };

          const storeResponse = await fetch('/api/pending-registrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingRegistrationData)
          });

          if (!storeResponse.ok) {
            console.error("Failed to store registration data:", await storeResponse.text());
          } else {
            console.log("Stored registration data in database for email verification:", {
              role: registerData.role,
              email: registerData.email
            });
          }
        } catch (e) {
          console.error("Failed to store pending registration:", e);
        }

        // Email verification is automatically sent by signUpUser function
        console.log("Verification email sent by Firebase");

        // Show email verification form
        setVerificationData({
          email: registerData.email,
          userId: 0, // Temporary - will be set after sync
          registrationData: registerData
        });
        setShowEmailVerification(true);
        toast({
          title: "Verification Email Sent",
          description: `Please check ${registerData.email} to verify your account.`,
        });
      } else {
        toast({
          title: "Registration Failed",
          description: result.error || "Could not create account",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    }
  };

  // Handle register form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      return;
    }

    console.log("Starting registration process with data:", {
      role: registerForm.role,
      email: registerForm.email,
      username: registerForm.username,
      hasInviteId: !!registerForm.inviteId,
      hasBusinessToken: !!registerForm.businessToken
    });

    // Use Firebase registration
    await handleFirebaseRegistration(registerForm);
  };

  // Handle forgot password form change
  const handleForgotPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForgotPasswordForm({
      ...forgotPasswordForm,
      [e.target.name]: e.target.value,
    });
    setForgotPasswordError("");
  };

  // Handle forgot password form submission
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordForm.email.trim()) {
      setForgotPasswordError("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(forgotPasswordForm.email)) {
      setForgotPasswordError("Please enter a valid email address");
      return;
    }

    forgotPasswordMutation.mutate(forgotPasswordForm.email);
  };

  // Redirect to home if user is already logged in
  if (user && !showSubscription) {
    return <Redirect to="/" />;
  }

  // Show subscription form if needed
  if (showSubscription && registeredUser) {
    console.log(`Showing subscription form for registered user: ID=${registeredUser.id}, Role=${registeredUser.role}`);
    return <SubscriptionForm user={registeredUser} />;
  }

  // Show email verification form if needed
  if (showEmailVerification && verificationData) {
    return <EmailVerificationForm verificationData={verificationData} />;
  }

  // Show forgot password form if requested
  if (showForgotPassword) {
    return <ForgotPasswordForm 
      email={forgotPasswordForm.email}
      onBack={() => setShowForgotPassword(false)}
    />;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Luxury background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-amber-500/5 via-transparent to-transparent blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/5 via-transparent to-transparent blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_50%)]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={Logo} 
              alt="Interlinc Logo" 
              className="h-16 w-auto drop-shadow-[0_0_25px_rgba(251,191,36,0.3)]" 
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/20 backdrop-blur-xl border border-white/5 p-1.5 rounded-xl">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-amber-600/10 data-[state=active]:text-amber-200 data-[state=active]:shadow-[0_0_20px_rgba(251,191,36,0.1)] text-zinc-400 font-medium transition-all duration-300 rounded-lg"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-amber-600/10 data-[state=active]:text-amber-200 data-[state=active]:shadow-[0_0_20px_rgba(251,191,36,0.1)] text-zinc-400 font-medium transition-all duration-300 rounded-lg"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card className="border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-slate-900/80">
                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                    Login to Interlinc
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-base">
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="username" className="text-sm font-medium text-zinc-200">
                        Email
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.username}
                        onChange={handleLoginChange}
                        className="h-12 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                      />
                      {loginErrors.username && (
                        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                          {loginErrors.username}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="password" className="text-sm font-medium text-zinc-200">
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        className="h-12 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                      />
                      {loginErrors.password && (
                        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                          {loginErrors.password}
                        </p>
                      )}
                      <div className="mt-2 text-right">
                        <button 
                          type="button" 
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-zinc-400 hover:text-amber-400 transition-colors duration-200"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] transition-all duration-300"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
              <Card className="border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-slate-900/80">
                <CardHeader className="space-y-2 pb-6">
                  <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                    Create an Account
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-base leading-relaxed">
                    {renderRegistrationDescription()}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="firstName" className="text-sm font-medium text-zinc-200">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          value={registerForm.firstName}
                          onChange={handleRegisterChange}
                          className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {registerErrors.firstName && (
                          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">
                            {registerErrors.firstName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="lastName" className="text-sm font-medium text-zinc-200">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          value={registerForm.lastName}
                          onChange={handleRegisterChange}
                          className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {registerErrors.lastName && (
                          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">
                            {registerErrors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="email" className="text-sm font-medium text-zinc-200">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                      />
                      {registerErrors.email && (
                        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                          {registerErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="username" className="text-sm font-medium text-zinc-200">
                        Username
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        placeholder="johndoe"
                        value={registerForm.username}
                        onChange={handleRegisterChange}
                        className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                      />
                      {registerErrors.username && (
                        <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                          {registerErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="password" className="text-sm font-medium text-zinc-200">
                          Password
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={registerForm.password}
                          onChange={handleRegisterChange}
                          className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {registerErrors.password && (
                          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">
                            {registerErrors.password}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-200">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={registerForm.confirmPassword}
                          onChange={handleRegisterChange}
                          className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {registerErrors.confirmPassword && (
                          <p className="text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded border border-red-500/20">
                            {registerErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="role" className="text-sm font-medium text-zinc-200">
                        Account Type
                      </Label>
                      <select
                        id="role"
                        name="role"
                        value={registerForm.role}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 hover:border-white/20"
                      >
                        <option value="business" className="bg-slate-900">Business</option>
                        <option value="contractor" className="bg-slate-900">Contractor</option>
                      </select>
                    </div>

                    {registerForm.role === "business" && (
                      <div className="space-y-2.5">
                        <Label htmlFor="company" className="text-sm font-medium text-zinc-200">
                          Company Name
                        </Label>
                        <Input
                          id="company"
                          name="company"
                          placeholder="Acme Inc."
                          value={registerForm.company}
                          onChange={handleRegisterChange}
                          className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {registerErrors.company && (
                          <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                            {registerErrors.company}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <Label htmlFor="position" className="text-sm font-medium text-zinc-200">
                        Position Title
                      </Label>
                      <Input
                        id="position"
                        name="position"
                        placeholder="CEO, Project Manager, etc."
                        value={registerForm.position}
                        onChange={handleRegisterChange}
                        className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] transition-all duration-300"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
              <Card className="border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-slate-900/80">
                <CardHeader className="space-y-2 pb-6">
                  <div className="flex items-center mb-2">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab("login")}
                      className="p-2 mr-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
                    >
                      <ArrowLeft className="h-4 w-4 text-zinc-400" />
                    </button>
                    <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                      Forgot Password
                    </CardTitle>
                  </div>
                  <CardDescription className="text-zinc-400 text-base">
                    Enter your email address and we'll send you a link to reset your password
                  </CardDescription>
                </CardHeader>
                {forgotPasswordSuccess ? (
                  <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-2 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                      <h3 className="text-xl font-medium text-white">Check Your Email</h3>
                      <p className="text-zinc-400">
                        We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                      </p>
                      <Button 
                        type="button" 
                        onClick={() => setActiveTab("login")}
                        className="mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                      >
                        Back to Login
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <form onSubmit={handleForgotPassword}>
                    <CardContent className="space-y-5">
                      <div className="space-y-2.5">
                        <Label htmlFor="email" className="text-sm font-medium text-zinc-200">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={forgotPasswordForm.email}
                          onChange={handleForgotPasswordChange}
                          className="h-12 bg-black/40 border-white/10 text-white placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 hover:border-white/20"
                        />
                        {forgotPasswordError && (
                          <div className="flex items-center mt-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {forgotPasswordError}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:shadow-[0_0_40px_rgba(251,191,36,0.4)] transition-all duration-300"
                        disabled={forgotPasswordMutation.isPending}
                      >
                        {forgotPasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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

      {/* Right Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
        {/* Luxury overlay effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.05),transparent_50%)]" />
        
        <div className="max-w-lg relative z-10">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.2)]">
            Interlinc
          </h1>
          <h2 className="text-3xl font-semibold mb-4 text-white">
            Connect. Create. Collaborate.
          </h2>
          <p className="text-zinc-300 mb-10 text-lg leading-relaxed">
            Outsourcing, Simplified. Manage people, payments, and projects with clarity, control, and zero invoicing.
          </p>
          <div className="space-y-6">
            <div className="flex items-start group">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full h-7 w-7 flex items-center justify-center text-slate-950 mr-4 mt-1 shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300">
                ✓
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">No Invoices. No Hassle.</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Streamline payments with built-in workflows and milestone approvals — no manual paperwork.
                </p>
              </div>
            </div>
            <div className="flex items-start group">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full h-7 w-7 flex items-center justify-center text-slate-950 mr-4 mt-1 shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300">
                ✓
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Real-Time Financial Visibility</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Track budgets, teams, and progress in one place with compliance-ready data capture.
                </p>
              </div>
            </div>
            <div className="flex items-start group">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full h-7 w-7 flex items-center justify-center text-slate-950 mr-4 mt-1 shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all duration-300">
                ✓
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Smarter Payouts. Faster Turnarounds.</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Trigger payments on your terms — once work is approved, your teams get paid seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
