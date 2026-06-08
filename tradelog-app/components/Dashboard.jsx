"use client";
import { useState } from "react";
import {
  Wallet, Target, Activity, ListOrdered, Trophy, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  StatCard, EquityCurve, DailyBars, Calendar, Mini, Empty, ScoreCard, ScoreModal,
} from "@/components/ui";
import { useStats, computeScore, monthLabel } from "@/lib/stats";
import { fmtMoney, fmtPct, fmtNum } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function Dashboard({ profile, trades }) {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [scoreOpen, setScoreOpen] = useState(false);
  const ccy = profile?.currency || "USD";
  const startingBalance = profile?.starting_balance || 0;
  const stats = useStats(trades || [], startingBalance);

  const onUpdateTrade = async (id, patch) => {
    await supabase.from("trades").update(patch).eq("id", id);
    router.refresh();
  };

  if (stats.total === 0) return <Empty onGoImport={() => router.push("/dashboard?settings=open")} />;
  const pf = stats.profitFactor === Infinity ? "∞" : stats.profitFactor === null ? "-" : fmtNum(stats.profitFactor, 2);
  const score = computeScore(stats);

  return (
    <div className="content-grid">
      <div className="grid-stats">
        <StatCard icon={Wallet} label="Net P&L" tone={stats.netPnl >= 0 ? "pos" : "neg"} delay={0}
          value={fmtMoney(stats.netPnl, ccy)} sub={fmtPct(stats.netPct) + " of starting balance"}
          info="Total profit or loss across all closed trades, net of commissions." />
        <StatCard icon={Target} label="Win Rate" delay={60}
          value={`${stats.winRate.toFixed(1)}%`} sub={`${stats.wins}W · ${stats.losses}L`}
          info="Share of trades that closed in profit." />
        <StatCard icon={Activity} label="Profit Factor" delay={120}
          value={pf} sub={`Expectancy ${fmtMoney(stats.expectancy, ccy)}/trade`}
          info="Gross profit ÷ gross loss. Above 1.0 is profitable." />
        <StatCard icon={ListOrdered} label="Total Trades" delay={180}
          value={String(stats.total)} sub={`Avg win ${fmtMoney(stats.avgWin, ccy)}`}
          info="How many closed trades are in your journal." />
      </div>

      <div className="panel rise" style={{ animationDelay: "220ms" }}>
        <div className="panel-head">
          <span className="section-title">Equity Curve</span>
          <span className="mono" style={{ fontSize: 12, color: stats.netPnl >= 0 ? "var(--pos)" : "var(--neg)" }}>
            {fmtMoney((stats.equity.at(-1)?.value ?? 0), ccy)}
          </span>
        </div>
        <EquityCurve data={stats.equity} ccy={ccy} />
      </div>

      <div className="grid-2">
        <div className="panel rise" style={{ animationDelay: "280ms" }}>
          <Calendar dailyMap={stats.dailyMap} ccy={ccy} trades={trades} onUpdateTrade={onUpdateTrade} />
        </div>
        <div className="rise stack" style={{ animationDelay: "340ms" }}>
          <div className="panel">
            <div className="panel-head"><span className="section-title">Daily P&L</span></div>
            <DailyBars data={stats.daily} ccy={ccy} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Mini label="Monthly P&L" value={fmtPct(stats.monthlyPct)} tone={stats.monthlyPct >= 0 ? "pos" : "neg"} icon={TrendingUp}
              info={`Return for ${stats.latestMonth ? monthLabel(stats.latestMonth.month) : "the latest month"}.`} />
            <Mini label="Since Inception" value={fmtPct(stats.netPct)} tone={stats.netPct >= 0 ? "pos" : "neg"} icon={Activity}
              info="Total return since you started." />
          </div>
          <ScoreCard score={score} onClick={() => setScoreOpen(true)} />
        </div>
      </div>

      <div className="grid-mini">
        <Mini label="Best Trade" value={fmtMoney(stats.best, ccy)} tone="pos" icon={Trophy} info="Your single most profitable trade." />
        <Mini label="Worst Trade" value={fmtMoney(stats.worst, ccy)} tone="neg" icon={TrendingDown} info="Your single largest losing trade." />
        <Mini label="Gross Profit" value={fmtMoney(stats.grossProfit, ccy)} tone="pos" icon={ArrowUpRight} info="Sum of all winning trades." />
        <Mini label="Gross Loss" value={fmtMoney(-stats.grossLoss, ccy)} tone="neg" icon={ArrowDownRight} info="Sum of all losing trades." />
        <Mini label="Avg Loss" value={fmtMoney(-stats.avgLoss, ccy)} tone="neg" icon={TrendingDown} info="Average size of a losing trade." />
        <Mini label="Commissions" value={fmtMoney(-stats.totalFees, ccy)} tone="neg" icon={Activity} info="Total broker commissions, already inside your P&L." />
      </div>
      {scoreOpen && <ScoreModal data={score} onClose={() => setScoreOpen(false)} />}
    </div>
  );
}
