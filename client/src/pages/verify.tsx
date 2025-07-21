import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getAuth, applyActionCode } from "firebase/auth";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get('oobCode');
    const mode = urlParams.get('mode');

    if (mode === "verifyEmail" && oobCode) {
      const auth = getAuth();
      applyActionCode(auth, oobCode)
        .then(async () => {
          // Sync to backend
          await fetch("/api/sync-email-verification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: auth.currentUser?.email })
          });
          setStatus("✅ Email verified successfully. You can now log in.");
          setTimeout(() => setLocation("/auth"), 3000);
        })
        .catch(() => {
          setStatus("❌ Verification failed. This link may be expired or already used.");
        });
    } else {
      setStatus("❌ Invalid verification link.");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <h2 className="text-2xl font-bold">Email Verification</h2>
        <p className="text-lg">{status}</p>
      </div>
    </div>
  );
}