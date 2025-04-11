import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
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

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/reset-password");
  const [token, setToken] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });
  
  // Get token from URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Password reset token is missing. Please check your reset link.");
    }
  }, [location]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Clear error when user types
    if (error) {
      setError("");
    }
  };
  
  // Validate form
  const validateForm = () => {
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsResetting(true);
    
    try {
      const response = await apiRequest("POST", "/api/reset-password", {
        token,
        password: formData.password
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset password");
      }
      
      // Password reset successful
      setResetSuccess(true);
      
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset. You can now login with your new password.",
        variant: "default",
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 3000);
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      setError(error.message || "Failed to reset password. Please try again.");
      
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
        </div>
        
        <Card className="border-zinc-700 bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription className="text-zinc-400">
              {resetSuccess 
                ? "Your password has been reset successfully" 
                : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          
          {resetSuccess ? (
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                <h3 className="text-xl font-medium text-white">Password Reset Successful</h3>
                <p className="text-zinc-400">
                  Your password has been reset successfully. You can now login with your new password.
                </p>
                <Button 
                  type="button" 
                  onClick={() => setLocation("/auth")}
                  className="mt-4 bg-white text-black hover:bg-zinc-200"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="flex items-center p-3 rounded-md bg-red-900/20 border border-red-900 text-red-500">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
                
                {!token ? (
                  <div className="flex items-center p-3 rounded-md bg-yellow-900/20 border border-yellow-900 text-yellow-500">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <p className="text-sm">
                      Password reset token is missing. Please check your reset link or request a new password reset.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">New Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your new password"
                        value={formData.password}
                        onChange={handleChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your new password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-zinc-200"
                  disabled={isResetting || !token}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
                
                <Link 
                  href="/auth" 
                  className="text-sm text-zinc-400 hover:text-white mt-4 text-center"
                >
                  Return to Login
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}