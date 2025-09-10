// client/src/pages/ConnectOnboarding.tsx
import { useEffect, useState } from "react";
import { loadConnectAndInitialize, type ConnectInstance } from "@stripe/connect-js";
import { ConnectComponentsProvider, ConnectAccountOnboarding } from "@stripe/react-connect-js";

const PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function assertStr(name: string, v: any) {
  if (typeof v !== "string" || v.length < 10) throw new Error(`${name} missing/invalid`);
}

export default function ConnectOnboarding() {
  const [connect, setConnect] = useState<ConnectInstance | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1) Key present
        assertStr("VITE_STRIPE_PUBLISHABLE_KEY", PK);

        // 2) Get user info and authentication headers
        const userId = localStorage.getItem('user_id');
        const firebaseUid = localStorage.getItem('firebase_uid');
        
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        
        if (userId) {
          headers['X-User-ID'] = userId;
        }
        
        if (firebaseUid) {
          headers['X-Firebase-UID'] = firebaseUid;
        }

        // Get user data to check for existing Connect account
        const userResponse = await fetch("/api/user", { headers });
        if (!userResponse.ok) throw new Error(`Failed to get user data: ${userResponse.status}`);
        const userData = await userResponse.json();

        // 3) Get a fresh Account Session client secret
        const r = await fetch("/api/connect/create-account-session", {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            accountId: userData.stripeConnectAccountId, // use existing account
            allowCreate: !userData.stripeConnectAccountId, // only allow create if no existing account
            country: "GB", 
            publishableKey: PK 
          }),
        });
        if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
        const { accountId, client_secret } = await r.json();
        assertStr("accountId", accountId);
        assertStr("client_secret", client_secret);
        console.log("[CONNECT] session", { accountId, secret_prefix: client_secret.slice(0, 6) });

        // 4) Initialize the Connect instance
        const instance = await loadConnectAndInitialize({
          publishableKey: PK,
          fetchClientSecret: async () => client_secret,
        });
        if (!instance || typeof instance.create !== "function") {
          throw new Error("Connect failed to initialize (check SDK import / PK vs SK mode).");
        }
        // Sanity: creation must return a mountable object
        const probe = instance.create("account-onboarding");
        if (!probe || typeof (probe as any).mount !== "function") {
          throw new Error("account-onboarding did not return a mountable component.");
        }
        setConnect(instance);
      } catch (e: any) {
        console.error("[CONNECT] early failure:", e);
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  if (err) {
    return (
      <div style={{ padding: 12, color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8 }}>
        <strong>Embedded Connect failed:</strong> {err}
      </div>
    );
  }

  if (!connect) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Embedded Connect Onboarding</h1>
        <div style={{ minHeight: 520, border: "1px solid #eee", background: "#fafafa", borderRadius: 8, padding: 12 }}>
          Loading Connect…
        </div>
      </div>
    );
  }

  return (
    <ConnectComponentsProvider connectInstance={connect}>
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Embedded Connect Onboarding</h1>
        <div id="onboarding-container" style={{ minHeight: 520, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <ConnectAccountOnboarding
            onReady={() => console.log("[CONNECT] ready (embedded)")}
            onExit={() => console.log("[CONNECT] exit")}
          />
        </div>
      </div>
    </ConnectComponentsProvider>
  );
}