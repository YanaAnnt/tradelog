"use client";
import { useState, useEffect, useRef } from "react";
import {
  Info, Trophy, Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Target, Wallet, ListOrdered, X, ChevronLeft, ChevronRight, Sparkles, Filter, Sun, Moon, FileUp, Upload, Download, Trash2, LogOut, Settings as SettingsIcon, LayoutDashboard,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, CartesianGrid, Cell,
} from "recharts";
import { fmtMoney, fmtNum, fmtPct, num, assetOf, CCY } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  UI primitives, charts, calendar, score gauge                       */
/* ------------------------------------------------------------------ */

const Logo = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
    <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="var(--accent)" strokeWidth="1.6" />
    <path d="M7 21 L13 13 L18 17 L25 8" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="25" cy="8" r="2.4" fill="var(--accent)" />
  </svg>
);

const InfoDot = ({ text }) => (
  <span className="info">
    <button className="info-dot" aria-label="What this means" tabIndex={0} onClick={(e) => e.preventDefault()}>
      <Info size={11} />
    </button>
    <span className="info-pop">{text}</span>
  </span>
);

const StatCard = ({ icon: Icon, label, value, sub, tone = "neutral", delay = 0, info }) => (
  <div className="card rise" style={{ animationDelay: `${delay}ms` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <span className="card-label">{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
        {info && <InfoDot text={info} />}
        <Icon size={16} style={{ color: "var(--muted)" }} />
      </span>
    </div>
    <div className="mono" style={{
      fontSize: 26, fontWeight: 600, marginTop: 10, letterSpacing: "-0.02em",
      color: tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : "var(--text)",
    }}>{value}</div>
    {sub && <div className="card-sub">{sub}</div>}
  </div>
);

const EquityTooltip = ({ active, payload, ccy }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="tip">
      <div className="tip-row" style={{ color: "var(--muted)" }}>{p.label}</div>
      <div className="tip-row mono" style={{ fontWeight: 600 }}>{fmtMoney(p.value, ccy)}</div>
      {p.symbol && <div className="tip-row mono" style={{ color: p.pnl >= 0 ? "var(--pos)" : "var(--neg)" }}>{p.symbol} {fmtMoney(p.pnl, ccy)}</div>}
    </div>
  );
};

const shortDate = (s) => {
  if (!s || s === "Start") return "Start";
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const EquityCurve = ({ data, ccy }) => (
  <ResponsiveContainer width="100%" height={264}>
    <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 4 }}>
      <defs>
        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="label" tickFormatter={shortDate} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--mono)" }}
        axisLine={false} tickLine={false} minTickGap={34} interval="preserveStartEnd" height={20} />
      <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }}
        tickFormatter={(v) => (CCY[ccy] || "$") + (v / 1000 >= 1 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0))}
        width={48} axisLine={false} tickLine={false} />
      <Tooltip content={<EquityTooltip ccy={ccy} />} cursor={{ stroke: "var(--border)" }} />
      <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#eq)" />
    </AreaChart>
  </ResponsiveContainer>
);

const DailyBars = ({ data, ccy }) => (
  <ResponsiveContainer width="100%" height={150}>
    <BarChart data={data} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
      <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--mono)" }}
        tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} minTickGap={18} />
      <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--mono)" }} width={44}
        tickFormatter={(v) => (CCY[ccy] || "$") + v.toFixed(0)} axisLine={false} tickLine={false} />
      <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }}
        content={({ active, payload }) => active && payload && payload[0] ? (
          <div className="tip">
            <div className="tip-row" style={{ color: "var(--muted)" }}>{payload[0].payload.date}</div>
            <div className="tip-row mono" style={{ color: payload[0].payload.pnl >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600 }}>
              {fmtMoney(payload[0].payload.pnl, ccy)}
            </div>
          </div>
        ) : null} />
      <ReferenceLine y={0} stroke="var(--border)" />
      <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
        {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? "var(--pos)" : "var(--neg)"} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

/* Calendar - bordered day cells with P&L inside, navigable, click a day to tag strategy */

const Calendar = ({ dailyMap, ccy, trades, onUpdateTrade }) => {
  const dates = Object.keys(dailyMap).sort();
  const latest = dates.length ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
  const [ly, lm] = latest.split("-").map(Number);
  const [cur, setCur] = useState({ y: ly, m: lm });
  const [openDay, setOpenDay] = useState(null);
  const { y, m } = cur;

  const tradesByDate = useMemo(() => {
    const map = {};
    (trades || []).forEach((t) => { (map[t.date] = map[t.date] || []).push(t); });
    return map;
  }, [trades]);
  const knownStrategies = useMemo(
    () => Array.from(new Set((trades || []).map((t) => (t.strategy || "").trim()).filter(Boolean))),
    [trades]
  );

  const first = new Date(y, m - 1, 1);
  const startPad = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ d, pnl: dailyMap[key], key });
  }
  const monthName = first.toLocaleString("en-US", { month: "long", year: "numeric" });
  const move = (delta) => {
    let nm = m + delta, ny = y;
    if (nm < 1) { nm = 12; ny -= 1; }
    if (nm > 12) { nm = 1; ny += 1; }
    setCur({ y: ny, m: nm });
  };
  const activeDays = cells.filter((c) => c && c.pnl !== undefined).length;
  const monthTotal = cells.reduce((s, c) => s + (c && c.pnl !== undefined ? c.pnl : 0), 0);
  const sym = CCY[ccy] || "$";
  const fmtCell = (v) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span className="section-title">Calendar</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="cal-nav" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={15} /></button>
          <span className="mono" style={{ fontSize: 12, minWidth: 116, textAlign: "center" }}>{monthName}</span>
          <button className="cal-nav" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }} className="mono">
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          {activeDays ? `${activeDays} trading day${activeDays > 1 ? "s" : ""} · tap a day to tag` : "no trades this month"}
        </span>
        {activeDays > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: monthTotal >= 0 ? "var(--pos)" : "var(--neg)" }}>
            {monthTotal >= 0 ? "+" : ""}{fmtMoney(monthTotal, ccy)}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 11 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="mono" style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", paddingBottom: 2 }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const has = c.pnl !== undefined;
          const pos = has && c.pnl >= 0;
          const tagged = has && (tradesByDate[c.key] || []).some((t) => t.strategy && t.strategy.trim());
          return (
            <div key={i} title={has ? `${c.key}: ${fmtMoney(c.pnl, ccy)}` : ""}
              className={`cal-cell${has ? " cal-active" : ""}`}
              onClick={() => has && setOpenDay(c.key)}
              style={{
                borderColor: has ? (pos ? "var(--pos)" : "var(--neg)") : "var(--border)",
                borderWidth: has ? 1.5 : 1,
                background: has ? (pos ? "rgba(63,224,166,0.10)" : "rgba(255,107,107,0.10)") : "var(--panel-2)",
                cursor: has ? "pointer" : "default",
              }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)", opacity: has ? 0.95 : 0.7 }}>{c.d}</span>
                {tagged && <span className="dot-tag" title="strategy tagged" />}
              </span>
              {has && (
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1, color: pos ? "var(--pos)" : "var(--neg)" }}>
                  {c.pnl >= 0 ? "+" : "−"}{sym}{fmtCell(Math.abs(c.pnl))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16, fontSize: 11, color: "var(--muted)" }} className="mono">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="leg" style={{ borderColor: "var(--pos)" }} /> profit day</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="leg" style={{ borderColor: "var(--neg)" }} /> loss day</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><i className="dot-tag" /> tagged</span>
      </div>
      {openDay && (
        <DayModal date={openDay} trades={tradesByDate[openDay] || []} ccy={ccy}
          strategies={knownStrategies} onUpdateTrade={onUpdateTrade} onClose={() => setOpenDay(null)} />
      )}
    </div>
  );
};

/* Day detail - list the day's trades and label each with the method used */

function DayModal({ date, trades, ccy, strategies, onUpdateTrade, onClose }) {
  const [bulk, setBulk] = useState("");
  const net = trades.reduce((s, t) => s + t.pnl, 0);
  const applyAll = () => {
    if (!bulk.trim()) return;
    trades.forEach((t) => onUpdateTrade(t.id, { strategy: bulk.trim() }));
    setBulk("");
  };
  const pretty = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal rise" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span className="section-title" style={{ fontSize: 16 }}>{pretty}</span>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="mono" style={{ fontSize: 12, color: net >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600, marginBottom: 16 }}>
          {trades.length} trade{trades.length > 1 ? "s" : ""} · {fmtMoney(net, ccy)}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input className="input" list="strat-list" placeholder="Method for the whole day…" value={bulk}
            onChange={(e) => setBulk(e.target.value)} style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={applyAll}>Apply to all</button>
        </div>

        <datalist id="strat-list">{strategies.map((s) => <option key={s} value={s} />)}</datalist>

        <div style={{ display: "grid", gap: 10 }}>
          {trades.map((t) => {
            const fut = assetOf(t) === "Futures";
            return (
              <div key={t.id} className="day-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span className={`tag ${t.side === "Long" ? "tag-long" : "tag-short"}`} style={{ flexShrink: 0 }}>{t.side}</span>
                  <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                  <span className={`badge ${fut ? "tag-fut" : "tag-stk"}`}>{fut ? "FUT" : "STK"}</span>
                  <span className="mono" style={{ fontSize: 12, color: t.pnl >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600, marginLeft: "auto", flexShrink: 0 }}>{fmtMoney(t.pnl, ccy)}</span>
                </div>
                <input className="input" list="strat-list" placeholder="method used (e.g. Breakout)…"
                  value={t.strategy || ""} onChange={(e) => onUpdateTrade(t.id, { strategy: e.target.value })}
                  style={{ marginTop: 8, width: "100%" }} />
              </div>
            );
          })}
        </div>
        <p className="hint" style={{ fontSize: 11, marginTop: 14 }}>Saved automatically. These methods feed the “By Strategy” panel so you can see what works best.</p>
      </div>
    </div>
  );
}

function ScoreRing({ score, grade, size = 138, stroke = 12 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const dur = 1200;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setV(score * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);
  const color = score >= 70 ? "var(--pos)" : score < 50 ? "var(--neg)" : "var(--accent)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color }}>{Math.round(v)}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, letterSpacing: ".08em" }}>GRADE {grade}</span>
      </div>
    </div>
  );
}

function ScoreCard({ score, onClick }) {
  return (
    <div className="card card-click" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 20px 20px" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span className="card-label">TradeLog Score</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <InfoDot text="A 0-100 coaching score from your profit factor, win rate, risk/reward and consistency. Tap it to see the breakdown and how to improve." />
          <Trophy size={14} style={{ color: "var(--muted)" }} />
        </span>
      </div>
      <div style={{ margin: "12px 0 6px" }}><ScoreRing score={score.score} grade={score.grade} /></div>
      <span className="card-sub" style={{ textAlign: "center" }}>tap for breakdown &amp; tips</span>
    </div>
  );
}

function ScoreModal({ data, onClose }) {
  const color = data.score >= 70 ? "var(--pos)" : data.score < 50 ? "var(--neg)" : "var(--accent)";
  const barColor = (v) => (v >= 70 ? "var(--pos)" : v < 50 ? "var(--neg)" : "var(--accent)");
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal rise" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span className="section-title" style={{ fontSize: 16 }}>TradeLog Score</span>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span className="mono" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color }}>{data.score}</span>
          <span className="mono" style={{ fontSize: 18, color: "var(--muted)" }}>/ 100</span>
          <span className="badge" style={{ marginLeft: "auto", fontSize: 13, padding: "4px 12px", background: "var(--panel-2)", color }}>{`Grade ${data.grade}`}</span>
        </div>
        <p className="hint" style={{ marginBottom: 16 }}>A blend of your profit factor, win rate, risk/reward and day-to-day consistency. Improve the weak bars to raise it.</p>
        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          {data.parts.map((p) => (
            <div key={p.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: "var(--muted)" }}>{p.key}</span>
                <span className="mono">{p.raw}</span>
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.round(p.val)}%`, background: barColor(p.val) }} /></div>
            </div>
          ))}
        </div>
        <div className="day-row">
          <div className="card-label" style={{ marginBottom: 8 }}>How to improve</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {data.tips.map((t, i) => <li key={i} className="hint" style={{ fontSize: 12.5 }}>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* Per-strategy performance - fills in as you tag trades from the calendar */

const Mini = ({ label, value, tone, icon: Icon, info, onClick, sub }) => (
  <div className={`card${onClick ? " card-click" : ""}`} style={{ padding: "14px 16px" }} onClick={onClick}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="card-label">{label}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {info && <InfoDot text={info} />}
        <Icon size={14} style={{ color: "var(--muted)" }} />
      </span>
    </div>
    <div className="mono" style={{ fontSize: 18, fontWeight: 600, marginTop: 6, color: tone === "pos" ? "var(--pos)" : tone === "neg" ? "var(--neg)" : "var(--text)" }}>{value}</div>
    {sub && <div className="card-sub">{sub}</div>}
  </div>
);

const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span className="card-label">{label}</span>{children}
  </label>
);

function Empty({ onGoImport }) {
  return (
    <div className="panel rise" style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ display: "inline-flex", padding: 16, borderRadius: 16, background: "var(--panel-2)", border: "1px solid var(--border)" }}>
        <TrendingUp size={28} style={{ color: "var(--accent)" }} />
      </div>
      <h2 style={{ fontFamily: "var(--display)", fontSize: 24, marginTop: 18, marginBottom: 8 }}>No trades yet</h2>
      <p className="hint" style={{ maxWidth: 380, margin: "0 auto 20px" }}>Import your broker's daily report or load demo data to see your stats, equity curve and calendar come to life.</p>
      <button className="btn-primary" onClick={onGoImport} style={{ margin: "0 auto" }}><Upload size={15} /> Import a report</button>
    </div>
  );
}

function BrokerForm({ broker, onSave, onSkip, onBack, embedded }) {
  const [token, setToken] = useState(broker?.token || "");
  const [queryId, setQueryId] = useState(broker?.queryId || "");
  const [guide, setGuide] = useState(false);
  const ok = token.trim() && queryId.trim();
  const save = () => onSave({ type: "IBKR", token: token.trim(), queryId: queryId.trim(), connectedAt: new Date().toISOString() });

  return (
    <div>
      <div className="broker-chip"><span className="broker-dot" /> Interactive Brokers</div>
      <div style={{ marginTop: 14 }}><Field label="Flex Web Service token"><input className="input" type="password" placeholder="paste your token" value={token} onChange={(e) => setToken(e.target.value)} /></Field></div>
      <div style={{ marginTop: 12 }}><Field label="Flex Query ID"><input className="input" placeholder="6-digit ID from IBKR" value={queryId} onChange={(e) => setQueryId(e.target.value)} /></Field></div>

      <button className="link-btn" onClick={() => setGuide((g) => !g)}>{guide ? "Hide" : "How do I get these?"}</button>
      {guide && (
        <ol className="guide">
          <li>In IBKR <b>Client Portal → Settings → Account Settings</b>, find <b>Flex Web Service</b>, turn it on, set an expiry, and copy the <b>Token</b>.</li>
          <li>Go to <b>Performance &amp; Reports → Flex Queries</b> and create an <b>Activity Flex Query</b> with the <b>Trades</b> section. Save it and copy its <b>Query ID</b>.</li>
          <li>Paste both above and press <b>Connect</b>.</li>
        </ol>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        {onBack && <button className="btn-ghost" onClick={onBack}>← Back</button>}
        <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={!ok} onClick={save}>Connect broker</button>
        {onSkip && <button className="btn-ghost" onClick={onSkip}>Skip for now</button>}
      </div>
      <p className="hint" style={{ fontSize: 11, marginTop: 14 }}>Your token is stored only on this device - never share it. Automated daily sync runs through your n8n/back-end bridge; manual CSV import works right now regardless.</p>
    </div>
  );
}

function StrategyInsights({ trades, ccy }) {
  const groups = useMemo(() => {
    const m = {};
    trades.forEach((t) => {
      const k = (t.strategy && t.strategy.trim()) || "Untagged";
      (m[k] = m[k] || []).push(t);
    });
    return Object.entries(m).map(([name, arr]) => {
      const net = arr.reduce((s, t) => s + t.pnl, 0);
      const wins = arr.filter((t) => t.pnl > 0).length;
      return { name, count: arr.length, net, winRate: (wins / arr.length) * 100 };
    }).sort((a, b) => b.net - a.net);
  }, [trades]);

  const tagged = groups.some((g) => g.name !== "Untagged");
  return (
    <div className="panel rise">
      <div className="panel-head">
        <span className="section-title">By Strategy</span>
        <span className="hint" style={{ fontSize: 11 }}>
          {tagged ? "which method works best for you" : "tag trades from the calendar to unlock this"}
        </span>
      </div>
      {!tagged ? (
        <p className="hint">Open the Dashboard, click any day in the calendar, then label the trades with the method you used (e.g. "Breakout", "Reversal", "News"). Once tagged, you'll see net P&L and win rate per method here.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr>{["Strategy", "Trades", "Win Rate", "Net P&L"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.name}>
                  <td style={{ fontWeight: 600 }}>{g.name === "Untagged" ? <span style={{ color: "var(--muted)" }}>Untagged</span> : g.name}</td>
                  <td className="mono dim">{g.count}</td>
                  <td className="mono dim">{g.winRate.toFixed(0)}%</td>
                  <td className="mono" style={{ color: g.net >= 0 ? "var(--pos)" : "var(--neg)", fontWeight: 600 }}>{fmtMoney(g.net, ccy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Insights tab - all the metric cubes, percentages, monthly breakdown and strategy table */

export {
  Logo, InfoDot, StatCard, EquityCurve, DailyBars, Calendar, DayModal,
  ScoreRing, ScoreCard, ScoreModal, Mini, Field, Empty, BrokerForm, StrategyInsights,
};
