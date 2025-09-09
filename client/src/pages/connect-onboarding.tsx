// client/src/pages/ConnectOnboarding.tsx
import { useEffect, useRef } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js"; // ✅ correct SDK

const PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function assertPattern(name: string, val: any, re: RegExp) {
  if (typeof val !== "string") throw new Error(`${name} not a string`);
  if (!re.test(val)) throw new Error(`${name} invalid: ${String(val).slice(0,24)}…`);
}

export default function ConnectOnboarding() {
  const started = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      // 1) Validate PK
      assertPattern("VITE_STRIPE_PUBLISHABLE_KEY", PK, /^pk_(test|live)_[A-Za-z0-9]+/);

      // 2) Fetch Account Session client_secret with authentication headers
      const userId = localStorage.getItem('user_id');
      const firebaseUid = localStorage.getItem('firebase_uid');
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      
      if (userId) {
        headers['X-User-ID'] = userId;
      }
      
      if (firebaseUid) {
        headers['X-Firebase-UID'] = firebaseUid;
      }
      
      const r = await fetch("/api/connect/create-account-session", {
        method: "POST",
        headers,
        body: JSON.stringify({ accountId: null, country: "GB", publishableKey: PK }),
      });
      if (!r.ok) throw new Error(`API ${r.status}: ${await r.text()}`);
      const { accountId, client_secret } = await r.json();

      // 3) Validate response shapes (this prevents the "wrong SDK/init" symptom)
      assertPattern("accountId", accountId, /^acct_[A-Za-z0-9]+/);
      assertPattern("client_secret", client_secret, /^accs_secret_[A-Za-z0-9_]+/);

      // 4) Initialize Connect
      const connect = await loadConnectAndInitialize({
        publishableKey: PK,
        fetchClientSecret: async () => client_secret,
      });
      if (!connect || typeof connect.create !== "function") {
        throw new Error("Connect failed to initialize (check SDK import and PK/secret mode).");
      }

      // 5) Create component
      const comp = connect.create("account-onboarding"); // ✅ correct component id
      if (!comp || typeof (comp as any).mount !== "function") {
        console.error("component object:", comp);
        throw new Error("Connect component not mountable (wrong SDK/import or bad init).");
      }

      // 6) Mount into a real, visible node (not a selector string)
      const el = containerRef.current;
      if (!el) throw new Error("Missing container node");
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        // Make sure the container isn't collapsed
        el.style.minHeight = "520px";
        el.style.display = "block";
        el.style.width = "100%";
      }

      comp.on?.("ready", () => console.log("[connect] ready (embedded) for", accountId));
      comp.mount(el);
    })().catch((e) => {
      console.error("[embedded connect failed]", e);
      alert(String(e?.message || e));
    });
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Embedded Connect Onboarding</h1>
      <div
        id="onboarding-container"
        ref={containerRef}
        style={{ minHeight: 520, width: "100%", border: "1px solid #e5e7eb", background: "#fafafa" }}
      />
    </div>
  );
}