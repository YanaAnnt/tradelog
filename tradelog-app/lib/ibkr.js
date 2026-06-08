/**
 * IBKR Flex Web Service v3 client.
 *
 * Two-step async API: SendRequest returns a ReferenceCode, then GetStatement
 * is polled until the report is ready. Returns the raw CSV/text statement.
 *
 * The user's Flex Query must be configured with Format = CSV (in IBKR's
 * Flex Queries UI). XML output is not currently handled by parseReport.
 */

const FLEX_BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

const xmlGet = (text, tag) => {
  const m = text.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return m ? m[1].trim() : null;
};

async function sendFlexRequest(token, queryId) {
  const url = `${FLEX_BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const status = xmlGet(text, "Status");
  if (status !== "Success") {
    const ec = xmlGet(text, "ErrorCode") || "?";
    const em = xmlGet(text, "ErrorMessage") || "unknown error";
    throw new Error(`SendRequest failed (${ec}): ${em}`);
  }
  const refCode = xmlGet(text, "ReferenceCode");
  if (!refCode) throw new Error("SendRequest succeeded but ReferenceCode missing");
  return refCode;
}

async function getFlexStatement(token, refCode, { maxAttempts = 12, intervalMs = 5000 } = {}) {
  const url = `${FLEX_BASE}/GetStatement?q=${encodeURIComponent(refCode)}&t=${encodeURIComponent(token)}&v=3`;
  for (let i = 0; i < maxAttempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, intervalMs));
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    // If response looks like XML with a status, it's still "in progress" or an error
    if (text.trim().startsWith("<")) {
      const ec = xmlGet(text, "ErrorCode");
      // 1019 = "Statement generation in progress", 1020 = "Statement is being generated"
      if (ec === "1019" || ec === "1020") continue;
      const em = xmlGet(text, "ErrorMessage") || "unknown error";
      throw new Error(`GetStatement failed (${ec || "?"}): ${em}`);
    }
    return text; // CSV / text statement body
  }
  throw new Error("Statement not ready after polling timeout");
}

/** Top-level helper: returns the CSV statement for a given Flex Query. */
export async function fetchFlexCsv(token, queryId, opts) {
  const refCode = await sendFlexRequest(token, queryId);
  return await getFlexStatement(token, refCode, opts);
}
