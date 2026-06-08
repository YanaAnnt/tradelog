/* parseReport - accepts a CSV/text statement (IBKR Flex or generic broker CSV)
 * and returns an array of normalized trade rows. */

const HEADERS = {
  date: ["date", "time", "opened", "open time", "close time", "date/time", "datetime", "day", "exit time"],
  symbol: ["symbol", "ticker", "instrument", "pair", "asset", "market", "stock"],
  side: ["side", "type", "action", "direction", "b/s", "buy/sell", "position"],
  qty: ["qty", "quantity", "size", "volume", "lots", "shares", "units", "amount"],
  entry: ["entry", "entry price", "open", "open price", "price in", "buy price", "avg entry"],
  exit: ["exit", "exit price", "close", "close price", "price out", "sell price", "avg exit"],
  pnl: ["pnl", "p/l", "profit", "profit/loss", "net", "net p/l", "realized", "result", "p&l", "gain", "gain/loss", "net pnl", "realized p/l"],
  fees: ["fee", "fees", "commission", "commissions", "comm"],
};

const num = (raw) => {
  if (raw === undefined || raw === null) return 0;
  const n = parseFloat(String(raw).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const detectDelim = (line) => {
  const counts = { ",": (line.match(/,/g) || []).length, "\t": (line.match(/\t/g) || []).length, ";": (line.match(/;/g) || []).length };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
};

const matchHeader = (h) => {
  const clean = h.trim().toLowerCase().replace(/["']/g, "");
  for (const [field, alts] of Object.entries(HEADERS)) {
    if (alts.includes(clean)) return field;
  }
  return null;
};

const normSide = (raw) => {
  if (!raw) return "Long";
  const s = String(raw).trim().toLowerCase();
  if (["sell", "short", "s", "sld", "sale"].includes(s)) return "Short";
  return "Long";
};

const toISODate = (raw) => {
  if (!raw) return new Date().toISOString().slice(0, 10);
  let s = String(raw).trim().split(";")[0].trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let [_, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    const dd = new Date(`${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
    if (!isNaN(dd.getTime())) return dd.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

function parseIBKR(lines, delim) {
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const idx = (names) => { for (const n of names) { const i = headers.indexOf(n); if (i >= 0) return i; } return -1; };
  const iDate = idx(["tradedate", "datetime", "date/time", "date"]);
  const iSym = idx(["symbol", "underlyingsymbol"]);
  const iBS = idx(["buy/sell", "buysell"]);
  const iQty = idx(["quantity", "qty"]);
  const iPrice = idx(["tradeprice", "price"]);
  const iPnl = idx(["fifopnlrealized", "realizedpnl", "fifopnl", "realized p/l"]);
  const iOC = idx(["open/closeindicator", "opencloseindicator", "open/close", "code"]);
  const iComm = idx(["ibcommission", "commission", "comm"]);
  const iTradeId = idx(["tradeid", "transactionid", "executionid"]);
  const trades = [];
  for (let r = 1; r < lines.length; r++) {
    const c = lines[r].split(delim);
    if (c.every((x) => !x.trim())) continue;
    const oc = iOC >= 0 ? String(c[iOC] || "").toUpperCase() : "";
    const pnlRaw = iPnl >= 0 ? num(c[iPnl]) : 0;
    const isClose = iOC >= 0 ? oc.includes("C") : pnlRaw !== 0;
    if (!isClose) continue;
    const bs = iBS >= 0 ? String(c[iBS] || "").toUpperCase() : "";
    const side = bs.includes("SELL") ? "Long" : bs.includes("BUY") ? "Short" : "Long";
    trades.push({
      broker_trade_id: iTradeId >= 0 ? (c[iTradeId] || "").toString().trim() || null : null,
      date: toISODate(iDate >= 0 ? c[iDate] : ""),
      symbol: (iSym >= 0 ? c[iSym] : "-").trim().toUpperCase() || "-",
      side,
      qty: Math.abs(iQty >= 0 ? num(c[iQty]) : 0),
      entry: iPrice >= 0 ? num(c[iPrice]) : 0,
      exit: 0,
      fees: iComm >= 0 ? Math.abs(num(c[iComm])) : 0,
      pnl: pnlRaw,
    });
  }
  return trades;
}

export function parseReport(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { trades: [], error: "Need a header row and at least one trade row." };
  const delim = detectDelim(lines[0]);
  const headers = lines[0].split(delim).map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());
  const isIBKR = ["buy/sell", "fifopnlrealized", "tradeprice", "open/closeindicator", "ibcommission"].some((h) => lower.includes(h));
  if (isIBKR) {
    const t = parseIBKR(lines, delim);
    return { trades: t, error: t.length ? null : "Detected an IBKR Flex file but found no closing trades.", mode: "IBKR" };
  }
  const map = {};
  headers.forEach((h, i) => {
    const f = matchHeader(h);
    if (f && map[f] === undefined) map[f] = i;
  });
  if (map.pnl === undefined && (map.entry === undefined || map.exit === undefined)) {
    return { trades: [], error: "Couldn't find a P&L column, or Entry+Exit columns to compute it." };
  }
  const trades = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(delim);
    if (cells.every((c) => !c.trim())) continue;
    const side = normSide(map.side !== undefined ? cells[map.side] : "");
    const qty = map.qty !== undefined ? num(cells[map.qty]) : 0;
    const entry = map.entry !== undefined ? num(cells[map.entry]) : 0;
    const exit = map.exit !== undefined ? num(cells[map.exit]) : 0;
    const fees = map.fees !== undefined ? num(cells[map.fees]) : 0;
    let pnl;
    if (map.pnl !== undefined) pnl = num(cells[map.pnl]);
    else pnl = (exit - entry) * qty * (side === "Short" ? -1 : 1) - fees;
    trades.push({
      broker_trade_id: null,
      date: toISODate(map.date !== undefined ? cells[map.date] : ""),
      symbol: (map.symbol !== undefined ? cells[map.symbol] : "-").trim().toUpperCase() || "-",
      side,
      qty,
      entry,
      exit,
      fees,
      pnl,
    });
  }
  return { trades, error: trades.length ? null : "No valid trade rows found.", mode: "CSV" };
}
