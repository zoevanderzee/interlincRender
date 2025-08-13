import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
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
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import Logo from "@assets/CD_icon_light@2x.png";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const auth = getAuth();
  
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<"checking" | "ready" | "done" | "invalid" | "error">("checking");
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  
  // Get Firebase parameters from URL
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode") || "";
  const apiKey = params.get("apiKey");
  const continueUrl = params.get("continueUrl") || "/auth";
  
  // Verify the reset code when component mounts
  useEffect(() => {
    console.log("Reset password page params:", { 
      mode, 
      oobCode: oobCode ? 'present' : 'missing',
      apiKey: apiKey ? 'present' : 'missing',
      continueUrl 
    });
    
    if (mode !== "resetPassword" || !oobCode) {
      console.log("Invalid parameters - mode:", mode, "oobCode:", oobCode ? 'present' : 'missing');
      setState("invalid");
      return;
    }
    
    console.log("Attempting to verify Firebase reset code...");
    console.log("Using Firebase config:", {
      apiKey: auth.config.apiKey,
      authDomain: auth.config.authDomain
    });
    
    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        console.log("Firebase reset code verified for email:", userEmail);
        setEmail(userEmail);
        setState("ready");
      })
      .catch((error) => {
        console.error("Firebase reset code verification failed:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        setState("invalid");
      });
  }, [auth, mode, oobCode, apiKey]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setIsResetting(true);
    setError("");
    
    try {
      // First, reset the Firebase password
      console.log("Updating Firebase password...");
      await confirmPasswordReset(auth, oobCode, password);
      console.log("Firebase password updated successfully");
      
      // Now sync the new password to our PostgreSQL database
      console.log("Syncing new password to database for email:", email);
      const syncResponse = await fetch("/api/sync-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          newPassword: password,
        }),
      });
      
      if (!syncResponse.ok) {
        const syncError = await syncResponse.json();
        console.error("Database password sync failed:", syncError);
        throw new Error(syncError.message || "Failed to sync password to database");
      }
      
      console.log("Password successfully synced to database");
      setState("done");
      
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now login with your new password.",
        variant: "default",
      });
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.assign(continueUrl);
      }, 2000);
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      setError(error.message || "Could not update password. Please request a new reset link.");
      setState("error");
      
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not update password. Please request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Loading state
  if (state === "checking") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardContent className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mr-4" />
              <p>Checking reset link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Invalid link state
  if (state === "invalid") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                Invalid Reset Link
              </CardTitle>
              <CardDescription className="text-zinc-400">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link 
                href="/auth" 
                className="w-full"
              >
                <Button className="w-full bg-white text-black hover:bg-zinc-200">
                  Return to Login
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (state === "done") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={Logo} alt="Creativ Linc Logo" className="h-16" />
          </div>
          <Card className="border-zinc-700 bg-zinc-900 text-white">
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                <h3 className="text-xl font-medium text-white">Password Reset Successful</h3>
                <p className="text-zinc-400">
                  Your password has been updated successfully. You can now login with your new password.
                </p>
                <Button 
                  type="button" 
                  onClick={() => window.location.assign(continueUrl)}
                  className="mt-4 bg-white text-black hover:bg-zinc-200"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
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
              {email ? `for ${email}` : "Enter your new password below"}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center p-3 rounded-md bg-red-900/20 border border-red-900 text-red-500">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-200"
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
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
        </Card>
      </div>
    </div>
  );
}