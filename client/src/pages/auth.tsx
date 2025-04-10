import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
import { Loader2 } from "lucide-react";
import Logo from "@assets/CD_icon_light@2x.png";

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

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
    email: "",
    firstName: "",
    lastName: "",
    role: "business", // Default role
    company: "",
    position: "",
  });

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
      registerMutation.mutate(registerData);
    }
  };

  // Redirect if user is already logged in
  if (user && !isLoading) {
    return <Redirect to="/" />;
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
                    Sign up to get started with Creativ Linc
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
          </Tabs>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="w-full md:w-1/2 bg-zinc-900 p-12 flex items-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-bold text-white mb-6">
            Connect, Create, Collaborate
          </h1>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Revolutionizing outsourced work payments
          </h2>
          <p className="text-zinc-400 mb-6">
            Creativ Linc eliminates invoicing for businesses working with freelancers and contractors by 
            automating payments based on pre-agreed milestones and deliverables, providing financial 
            transparency and real-time budget control.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">Smart Contract Automation</h3>
                <p className="text-zinc-400">Eliminate manual invoicing with automated payments based on pre-agreed milestones</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">Financial Transparency</h3>
                <p className="text-zinc-400">Real-time budget control and finance-compliant data storage</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center text-black mr-4 mt-1">✓</div>
              <div>
                <h3 className="text-white font-medium text-lg">Faster Payment Cycles</h3>
                <p className="text-zinc-400">Guaranteed payments for outsourced workers with clear contract terms</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}