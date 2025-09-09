import { useEffect, useRef } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout/Layout';

const PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function assertPattern(name: string, value: any, re: RegExp) {
  if (typeof value !== "string") throw new Error(`${name} not a string`);
  if (!re.test(value)) throw new Error(`${name} invalid: ${value.slice(0,24)}…`);
}

export default function ConnectOnboarding() {
  const { user } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // guard React StrictMode/HMR double-run
    started.current = true;

    // Global error taps (so we never see "{}" again)
    window.addEventListener("error", (e) =>
      console.error("[window.error]", e.message, e.error)
    );
    window.addEventListener("unhandledrejection", (e: any) =>
      console.error("[unhandledrejection]", e?.reason)
    );

    (async () => {
      try {
        // 1) Validate publishable key
        assertPattern("PUBLISHABLE_KEY", PK, /^pk_(test|live)_[A-Za-z0-9]+/);

        // 2) Ask server for account + fresh Account Session client secret
        const resp = await fetch("/api/connect/create-account-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: null, country: "GB" }),
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(errorText);
        }

        const { accountId, client_secret } = await resp.json();

        // 3) Validate shapes before initializing
        assertPattern("accountId", accountId, /^acct_[A-Za-z0-9]+/);
        assertPattern("client_secret", client_secret, /^seti_[A-Za-z0-9_]+/);

        // 4) Initialize Connect.js (NOT @stripe/stripe-js)
        const connect = await loadConnectAndInitialize({
          publishableKey: PK,
          fetchClientSecret: async () => client_secret,
        });

        // 5) Create & mount embedded onboarding (no appendChild)
        const onboarding = connect.create("account-onboarding");
        if (typeof (onboarding as any).mount !== "function") {
          console.error("Component:", onboarding);
          throw new Error("Connect component not mountable (wrong library/init).");
        }

        (onboarding as any).on("ready", () => console.log("[Connect] ready for", accountId));
        (onboarding as any).mount("#onboarding-container"); // CSS selector string required

      } catch (e: any) {
        console.error("Embedded onboarding failed:", e);
        alert(e.message);
      }
    })();
  }, []);

  return (
    <Layout>
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1>Embedded Connect Onboarding</h1>
        <div id="onboarding-container" style={{ minHeight: 520 }} />
      </div>
    </Layout>
  );
}