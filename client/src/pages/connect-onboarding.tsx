import { useEffect, useRef } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";

const PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function assertPattern(name: string, val: any, re: RegExp) {
  if (typeof val !== "string") throw new Error(`${name} not a string`);
  if (!re.test(val)) throw new Error(`${name} invalid: ${String(val).slice(0,24)}…`);
}

export default function ConnectOnboarding() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;            // guard React StrictMode/HMR double-run
    started.current = true;

    // Surface JS errors (no silent fails)
    window.addEventListener("error", (e) => console.error("[error]", e.message, e.error));
    window.addEventListener("unhandledrejection", (e: any) => console.error("[unhandled]", e?.reason));

    (async () => {
      // 1) Validate publishable key
      assertPattern("VITE_STRIPE_PUBLISHABLE_KEY", PK, /^pk_(test|live)_[A-Za-z0-9]+/);

      // 2) Ask server for { accountId, client_secret }
      const resp = await fetch("/api/connect/create-account-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: null, country: "GB", publishableKey: PK }),
      });
      if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text()}`);
      const { accountId, client_secret } = await resp.json();

      // 3) Validate shapes
      assertPattern("accountId", accountId, /^acct_[A-Za-z0-9]+/);
      assertPattern("client_secret", client_secret, /^accs_[A-Za-z0-9_]+/);

      // 4) Initialize Connect (NOT @stripe/stripe-js)
      const connect = await loadConnectAndInitialize({
        publishableKey: PK,
        fetchClientSecret: async () => client_secret,
      });

      // 5) Create & mount (no appendChild)
      const onboarding = connect.create("account-onboarding");
      if (typeof (onboarding as any).mount !== "function") {
        console.error("component:", onboarding);
        throw new Error("Connect component not mountable (wrong SDK/import or bad init)");
      }

      (onboarding as any).on("ready", () => console.log("[connect] ready (embedded) for", accountId));
      (onboarding as any).mount("#onboarding-container");
    })().catch((e) => {
      console.error("[embedded connect failed]", e);
      alert(String(e?.message || e));
    });
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Embedded Connect Onboarding</h1>
      <div id="onboarding-container" style={{ minHeight: 520 }} />
    </div>
  );
}