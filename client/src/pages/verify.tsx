import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getAuth, applyActionCode } from "firebase/auth";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const oobCode = urlParams.get('oobCode');
      const mode = urlParams.get('mode');

      if (mode === "verifyEmail" && oobCode) {
        const auth = getAuth();
        try {
          await applyActionCode(auth, oobCode);
          setStatus("✅ Email verified successfully! You can now log in.");
          setTimeout(() => setLocation("/auth"), 3000);
        } catch (error) {
          console.error("Verification error:", error);
          setStatus("❌ Verification link is invalid or expired.");
          setTimeout(() => setLocation("/auth"), 3000);
        }
      } else {
        setStatus("❌ Invalid verification link.");
        setTimeout(() => setLocation("/auth"), 3000);
      }
    };

    verify();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <h2 className="text-2xl font-bold">Email Verification</h2>
        <p className="text-lg">{status}</p>
        <p className="text-sm text-gray-600">Redirecting you to login...</p>
      </div>
    </div>
  );
}