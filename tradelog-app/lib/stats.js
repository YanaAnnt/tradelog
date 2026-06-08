import { useMemo } from "react";
import { fmtNum } from "./utils";

export function useStats(trades, startingBalance) {
  return useMemo(() => {
    const sorted = [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const total = sorted.length;
    const wins = sorted.filter((t) => t.pnl > 0).length;
    const losses = sorted.filter((t) => t.pnl < 0).length;
    const winRate = total ? (wins / total) * 100 : 0;
    const grossProfit = sorted.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(sorted.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const netPnl = grossProfit - grossLoss;
    const totalFees = sorted.reduce((s, t) => s + (Number(t.fees) || 0), 0);
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const expectancy = total ? netPnl / total : 0;
    const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? Infinity : null) : grossProfit / grossLoss;
    const best = sorted.reduce((m, t) => (t.pnl > m ? t.pnl : m), -Infinity);
    const worst = sorted.reduce((m, t) => (t.pnl < m ? t.pnl : m), Infinity);
    const netPct = startingBalance ? (netPnl / startingBalance) * 100 : 0;

    // Equity curve
    let run = 0;
    const equity = sorted.map((t) => { run += t.pnl; return { date: t.date, value: run }; });

    // Daily
    const dailyMap = {};
    sorted.forEach((t) => { dailyMap[t.date] = (dailyMap[t.date] || 0) + t.pnl; });
    const daily = Object.entries(dailyMap).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, pnl]) => ({ date, pnl }));

    // Monthly
    const monthMap = {};
    sorted.forEach((t) => {
      const m = t.date.slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + t.pnl;
    });
    const months = Object.entries(monthMap).sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, pnl]) => ({
      month,
      pnl,
      pct: startingBalance ? (pnl / startingBalance) * 100 : 0,
    }));
    const latestMonth = months.length ? months[months.length - 1] : null;
    const monthlyPct = latestMonth ? latestMonth.pct : 0;

    return {
      sorted, total, wins, losses, winRate, grossProfit, grossLoss, netPnl, totalFees,
      avgWin, avgLoss, expectancy, profitFactor, best: best === -Infinity ? 0 : best,
      worst: worst === Infinity ? 0 : worst, netPct, equity, daily, dailyMap,
      months, latestMonth, monthlyPct,
    };
  }, [trades, startingBalance]);
}

export function computeScore(stats) {
  if (!stats.total) return { score: 0, grade: "-", parts: [], tips: [] };
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const pf = stats.profitFactor === Infinity ? 3 : (stats.profitFactor || 0);
  const rr = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : (stats.avgWin > 0 ? 3 : 0);
  const days = Object.values(stats.dailyMap);
  const green = days.filter((v) => v > 0).length;
  const consistency = days.length ? (green / days.length) * 100 : 0;

  const pfScore = clamp((pf - 1) / 1.5 * 100);
  const winScore = clamp(stats.winRate / 55 * 100);
  const rrScore = clamp(rr / 2 * 100);
  const consScore = clamp(consistency);
  const score = Math.round(0.30 * pfScore + 0.25 * winScore + 0.25 * rrScore + 0.20 * consScore);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";

  const parts = [
    { key: "Profit factor", val: pfScore, raw: stats.profitFactor === Infinity ? "∞" : fmtNum(pf, 2) },
    { key: "Win rate", val: winScore, raw: `${stats.winRate.toFixed(0)}%` },
    { key: "Risk / reward", val: rrScore, raw: `${rr.toFixed(2)}:1` },
    { key: "Consistency", val: consScore, raw: `${Math.round(consistency)}% green days` },
  ];
  const tips = [];
  if (rrScore < 60) tips.push("Your average win is small versus your average loss. Let winners run a little longer, or cut losers sooner - aim for at least 1.5:1.");
  if (winScore < 60) tips.push("Win rate is on the lower side. Be more selective and take only your highest-conviction setups.");
  if (pfScore < 60) tips.push("Profit factor is thin. Double down on the setups that already make money and trim the ones that bleed.");
  if (consScore < 60) tips.push("Results swing day to day. Trade a consistent size and stick to one playbook to smooth the curve.");
  if (!tips.length) tips.push("Strong, balanced numbers. Keep tagging trades by method to find your single best edge and lean into it.");
  return { score, grade, parts, tips };
}

export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
