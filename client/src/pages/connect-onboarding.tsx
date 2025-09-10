// client/src/pages/ConnectOnboarding.tsx
import { useEffect, useRef } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js"; // <- correct SDK

const PK = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function assertStr(name: string, v: any) {
  if (typeof v !== "string" || v.length < 10) throw new Error(`${name} missing/invalid`);
}

export default function ConnectOnboarding() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // surface all errors (no silent fails)
    window.addEventListener("error", e => console.error("[window.error]", e.message, e.error));
    window.addEventListener("unhandledrejection", (e: any) => console.error("[unhandled]", e?.reason));

    (async () => {
      // 1) Keys & container
      assertStr("VITE_STRIPE_PUBLISHABLE_KEY", PK);
      const node = containerRef.current;
      if (!node) throw new Error("Missing onboarding container node");

      // 2) Get user info and existing Connect account
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

      // 3) Initialize Connect
      const connect = await loadConnectAndInitialize({
        publishableKey: PK,
        fetchClientSecret: async () => client_secret,
      });
      if (!connect || typeof connect.create !== "function") {
        throw new Error("Connect failed to initialize (check PK/mode and SDK import).");
      }

      // 4) Create component
      const comp = connect.create("account-onboarding");
      if (!comp || typeof (comp as any).mount !== "function") {
        console.error("component:", comp);
        throw new Error("Connect component not mountable (wrong SDK/init).");
      }

      // 5) Ensure container is visible (not display:none; has size)
      const ensureVisible = async () => {
        for (let i = 0; i < 30; i++) {
          const r = node.getBoundingClientRect();
          const cs = getComputedStyle(node);
          const visible = r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
          if (visible) return;
          await new Promise(req => requestAnimationFrame(req));
        }
        throw new Error("Container never became visible (layout/CSS collapses it).");
      };
      await ensureVisible();

      // 6) Mount (string selector first, then node fallback)
      comp.on?.("ready", () => console.log("[CONNECT] ready (embedded) for", accountId));

      try {
        comp.mount("#onboarding-container");        // primary (per Stripe docs)
      } catch (e) {
        console.warn("[CONNECT] selector mount failed, retrying with node:", e);
        comp.mount(node as any);                    // fallback: direct node
      }
      console.log("[CONNECT] mounted");
    })().catch(e => {
      console.error("[CONNECT] FAILED", e);
      // Show a friendly message in the container so the page isn't blank
      if (containerRef.current) containerRef.current.innerHTML =
        `<div style="padding:12px;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;">
           <strong>Embedded Connect failed:</strong> ${String(e?.message || e)}
         </div>`;
    });

    return () => {
      try {
        // avoid duplicate mounts in HMR/route changes
        const anyWin = window as any;
        if (anyWin.__connectOnboarding?.unmount) anyWin.__connectOnboarding.unmount();
      } catch {}
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Embedded Connect Onboarding</h1>
      <div
        id="onboarding-container"
        ref={containerRef}
        style={{
          minHeight: 520,
          width: "100%",
          display: "block",
          border: "1px solid #e5e7eb",
          background: "#fafafa"
        }}
      />
    </div>
  );
}