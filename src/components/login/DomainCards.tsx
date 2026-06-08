import { motion } from "framer-motion";
import {
  Map, Drill, Layers, Factory, Waves, Globe, CheckCircle2, ShieldHalf, KeyRound,
  ClipboardCheck, Lock, ServerCog, type LucideIcon,
} from "lucide-react";

/* 5 domain data SIGI (sesuai Juknis SPEKTRUM IOG 4.0) */
const DOMAINS: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: Map, label: "Wilayah Kerja", sub: "Working Area" },
  { icon: Drill, label: "Sumur", sub: "Well" },
  { icon: Layers, label: "Lapangan", sub: "Field" },
  { icon: Factory, label: "Fasilitas", sub: "Facility" },
  { icon: Waves, label: "Survei Seismik", sub: "Seismic" },
];

/* Tingkat klasifikasi data (L0–L4, 4 kelas Juknis) */
const LEVELS: { l: string; t: string; s: string; w: string; c: string }[] = [
  { l: "L4", t: "Restricted", s: "Highly restricted", w: "44%", c: "#1e3a8a" },
  { l: "L3", t: "Internal", s: "Internal use only", w: "58%", c: "#2563eb" },
  { l: "L2", t: "Confidential", s: "Business confidential", w: "72%", c: "#3b82f6" },
  { l: "L1", t: "Controlled", s: "Shared with permission", w: "86%", c: "#0ea5e9" },
  { l: "L0", t: "Public", s: "Public information", w: "100%", c: "#f59e0b" },
];

const OGC = ["Interoperable", "Standardized", "Scalable", "Future Ready"];

const HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldHalf, label: "End-to-End Data Governance" },
  { icon: KeyRound, label: "Fine-Grained Access Control" },
  { icon: ClipboardCheck, label: "Audit Trail & Monitoring" },
  { icon: Lock, label: "Encrypted Data Exchange" },
  { icon: ServerCog, label: "High Availability & Resilience" },
];

const GlassCard = ({ title, index, children }: { title: string; index: number; children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm p-4 hover:border-amber-500/25 transition-colors">
    <h3 className="text-[13px] font-bold text-amber-400 mb-3">{title}</h3>
    {children}
  </motion.div>
);

/**
 * DomainCards — grid kartu showcase platform:
 * 5 Domain Data (SIGI) · Data Governance Levels (L0–L4) · OGC API Standards · Platform Highlights.
 * Dark-mode only, responsif (1→2→4 kolom), animasi stagger Framer Motion.
 */
export const DomainCards = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <GlassCard title="5 Domain Data" index={0}>
      <ul className="space-y-2.5">
        {DOMAINS.map(({ icon: Icon, label, sub }) => (
          <li key={label} className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-sky-400/80 flex-shrink-0" />
            <span className="text-sm text-slate-300 leading-tight">
              {label}<span className="text-[10px] text-slate-500 ml-1.5">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>

    <GlassCard title="Data Governance Levels" index={1}>
      <div className="space-y-1.5">
        {LEVELS.map(({ l, t, s, w, c }) => (
          <div key={l} className="flex items-center gap-2">
            <div className="h-6 rounded-sm flex items-center px-2" style={{ width: w, background: c }}>
              <span className="text-[11px] font-bold text-white/90">{l}</span>
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[11px] font-semibold text-slate-200">{t}</div>
              <div className="text-[9px] text-slate-500 truncate">{s}</div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>

    <GlassCard title="OGC API Standards" index={2}>
      <div className="flex items-center gap-2.5 mb-3">
        <Globe className="w-7 h-7 text-sky-400" />
        <div className="text-[12px] font-semibold text-slate-200 leading-tight">Open Geospatial<br />Consortium</div>
      </div>
      <ul className="space-y-2">
        {OGC.map((x) => (
          <li key={x} className="flex items-center gap-2 text-[13px] text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {x}
          </li>
        ))}
      </ul>
    </GlassCard>

    <GlassCard title="Platform Highlights" index={3}>
      <ul className="space-y-2.5">
        {HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 text-[13px] text-slate-300">
            <Icon className="w-4 h-4 text-amber-400/80 flex-shrink-0" /> {label}
          </li>
        ))}
      </ul>
    </GlassCard>
  </div>
);

export default DomainCards;
