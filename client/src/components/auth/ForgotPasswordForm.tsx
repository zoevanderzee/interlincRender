import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendPasswordReset } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage("");

    try {
      // First check if user exists in our system
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to process request");
        setIsSuccess(false);
        return;
      }

      // Send Firebase password reset email
      const firebaseResult = await sendPasswordReset(email);
      
      if (firebaseResult.success) {
        setMessage("Password reset email sent! Check your inbox for instructions.");
        setIsSuccess(true);
      } else {
        setMessage(firebaseResult.message || "Failed to send reset email");
        setIsSuccess(false);
      }
    } catch (error) {
      setMessage("Connection error. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you instructions to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          {message && (
            <Alert variant={isSuccess ? "default" : "destructive"}>
              {isSuccess ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Email"}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={onBack}
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}