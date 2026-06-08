export const CCY = { USD: "$", EUR: "€", GBP: "£", ILS: "₪", JPY: "¥" };

export const num = (v) => {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const fmtMoney = (v, ccy = "USD") => {
  const s = CCY[ccy] || ccy + " ";
  const n = Number(v) || 0;
  const sign = n < 0 ? "-" : "";
  return sign + s + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const fmtPct = (v) => {
  const n = Number(v) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
};

export const fmtNum = (v, dp = 2) => {
  const n = Number(v) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
};

// Detect futures vs stock from the symbol
const FUT_ROOTS = ["MES", "MNQ", "MGC", "MCL", "M2K", "MYM", "MBT", "MET", "ES", "NQ", "GC", "CL", "RTY", "YM", "SI", "ZB", "ZN", "ZF", "ZT", "HG", "NG", "ZC", "ZS", "ZW", "6E", "6J", "6B"];
const CME_MONTH = /[FGHJKMNQUVXZ]\d{1,2}$/;

export const assetOf = (t) => {
  if (t.asset === "Futures" || t.asset === "Stock") return t.asset;
  const sym = (t.symbol || "").toUpperCase();
  if (CME_MONTH.test(sym)) return "Futures";
  if (FUT_ROOTS.some((r) => sym.startsWith(r))) return "Futures";
  return "Stock";
};
