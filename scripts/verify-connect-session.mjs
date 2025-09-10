import fetch from "node-fetch";

const url = "http://localhost:5000/api/connect/create-account-session";
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ accountId: null, country: "GB" })
});
if (!res.ok) {
  console.error("❌ API failed:", await res.text());
  process.exit(1);
}
const j = await res.json();
const ok = typeof j.accountId === "string" && /^acct_/.test(j.accountId)
        && typeof j.client_secret === "string" && /^accs_/.test(j.client_secret);
if (!ok) {
  console.error("❌ Bad response shape:", j);
  process.exit(1);
}
console.log("✅ Session OK:", { accountId: j.accountId, client_secret_prefix: j.client_secret.slice(0,5) });