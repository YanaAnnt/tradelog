"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, Activity, ListOrdered, Settings as SettingsIcon } from "lucide-react";
import { Logo } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import SettingsModal from "@/components/SettingsModal";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "insights", label: "Insights", icon: Activity },
  { id: "trades", label: "Trades", icon: ListOrdered },
];

export default function Topbar({ profile, broker }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = pathname?.split("/")[1] || "dashboard";
  const ccy = profile?.currency || "USD";

  useEffect(() => {
    if (params?.get("settings") === "open") setOpen(true);
  }, [params]);

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo />
        <div>
          <div className="brand">TradeLog</div>
          <div className="brand-sub">trading journal</div>
        </div>
      </div>
      <nav className="nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={`/${id}`} className={`nav-btn ${active === id ? "active" : ""}`}>
            <Icon size={15} /> <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.name || "-"}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            {ccy} · {fmtMoney(profile?.starting_balance || 0, ccy)}
          </div>
        </div>
        <button className="icon-btn" onClick={() => setOpen(true)}><SettingsIcon size={17} /></button>
      </div>
      {open && (
        <SettingsModal
          profile={profile}
          broker={broker}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </header>
  );
}
