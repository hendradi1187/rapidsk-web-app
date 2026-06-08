import { motion } from "framer-motion";
import { ShieldCheck, FileCheck2, ClipboardCheck, type LucideIcon } from "lucide-react";

interface SecurityCard {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const CARDS: SecurityCard[] = [
  { icon: ShieldCheck, title: "Zero Trust", subtitle: "Security" },
  { icon: FileCheck2, title: "Audit Ready", subtitle: "Every Access" },
  { icon: ClipboardCheck, title: "Compliance", subtitle: "Indonesia Std." },
];

/**
 * SecurityCards — tiga badge kepercayaan (Zero Trust · Audit Ready · Compliance).
 * Dipakai di panel form. Dark-mode only, responsif (grid 3 kolom).
 */
export const SecurityCards = ({ cards = CARDS }: { cards?: SecurityCard[] }) => (
  <div className="grid grid-cols-3 gap-2.5">
    {cards.map(({ icon: Icon, title, subtitle }, i) => (
      <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + i * 0.08 }}
        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-3 text-center hover:border-amber-500/25 transition-colors">
        <Icon className="w-4 h-4 mx-auto mb-1.5 text-amber-400/80" />
        <div className="text-[11px] font-semibold text-slate-300 leading-tight">{title}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{subtitle}</div>
      </motion.div>
    ))}
  </div>
);

export default SecurityCards;
