import { motion } from "framer-motion";

export interface KkksNode {
  name: string;
  color: string;
}

const DEFAULT_KKKS: KkksNode[] = [
  { name: "Pertamina Hulu", color: "#e11d48" },
  { name: "Medco Energi", color: "#0ea5e9" },
  { name: "Eni Indonesia", color: "#eab308" },
  { name: "Chevron Indonesia", color: "#2563eb" },
  { name: "Harbour Energy", color: "#22c55e" },
];

/**
 * DataFlowAnimation — diagram alur data 100% SVG (node + garis + label satu sistem
 * koordinat → dijamin lurus & menyatu). SKK MIGAS ⇄ GX SPACE (RapiDSK) → KKKS.
 * Garis biru menyala beraliran, hub berdenyut, node berkedip. Dark-mode, responsif.
 */
export const DataFlowAnimation = ({ kkks = DEFAULT_KKKS }: { kkks?: KkksNode[] }) => {
  const SKK = { x: 120, y: 165 };
  const GX = { x: 335, y: 165 };
  const skkR = 30;
  const gxR = 52;
  const kkksX = 560;
  const startY = kkks.length > 1 ? 165 - ((kkks.length - 1) * 46) / 2 : 165;
  const rows = kkks.map((_, i) => ({ x: kkksX, y: startY + i * 46 }));

  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;

  return (
    <svg viewBox="0 0 760 330" className="w-full h-auto" role="img"
      aria-label="Diagram alur data SKK Migas ke GX Space ke KKKS">
      <defs>
        <radialGradient id="dfa-hub" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* glow hub */}
      <circle cx={GX.x} cy={GX.y} r={gxR + 34} fill="url(#dfa-hub)" />

      {/* ── SKK MIGAS ⇄ GX SPACE : garis lurus horizontal (y sama) ── */}
      <line x1={SKK.x + skkR} y1={SKK.y} x2={GX.x - gxR} y2={GX.y} stroke="#38bdf8" strokeWidth="5" opacity="0.12" strokeLinecap="round" />
      <motion.line x1={SKK.x + skkR} y1={SKK.y} x2={GX.x - gxR} y2={GX.y} stroke="#7dd3fc" strokeWidth="1.5"
        strokeDasharray="5 7" strokeLinecap="round"
        initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -48 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
      {/* panah dua arah */}
      <path d={`M ${SKK.x + skkR + 8} ${SKK.y - 4} L ${SKK.x + skkR + 2} ${SKK.y} L ${SKK.x + skkR + 8} ${SKK.y + 4}`} fill="none" stroke="#7dd3fc" strokeWidth="1.4" />
      <path d={`M ${GX.x - gxR - 8} ${GX.y - 4} L ${GX.x - gxR - 2} ${GX.y} L ${GX.x - gxR - 8} ${GX.y + 4}`} fill="none" stroke="#7dd3fc" strokeWidth="1.4" />

      {/* ── GX SPACE → tiap KKKS ── */}
      {rows.map((r, i) => (
        <g key={i}>
          <path d={curve({ x: GX.x + gxR, y: GX.y }, { x: r.x - 12, y: r.y })} fill="none" stroke="#3b82f6" strokeWidth="4" opacity="0.1" strokeLinecap="round" />
          <motion.path d={curve({ x: GX.x + gxR, y: GX.y }, { x: r.x - 12, y: r.y })} fill="none" stroke="#60a5fa" strokeWidth="1.4"
            strokeDasharray="5 8" strokeLinecap="round"
            initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: -52 }}
            transition={{ duration: 1.6 + i * 0.1, repeat: Infinity, ease: "linear" }} />
        </g>
      ))}

      {/* ── Node SKK MIGAS ── */}
      <circle cx={SKK.x} cy={SKK.y} r={skkR} fill="#0b1120" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="1.5" />
      {/* glyph institusi */}
      <g stroke="#38bdf8" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d={`M ${SKK.x - 11} ${SKK.y - 4} L ${SKK.x} ${SKK.y - 11} L ${SKK.x + 11} ${SKK.y - 4}`} />
        <line x1={SKK.x - 8} y1={SKK.y - 1} x2={SKK.x - 8} y2={SKK.y + 7} />
        <line x1={SKK.x} y1={SKK.y - 1} x2={SKK.x} y2={SKK.y + 7} />
        <line x1={SKK.x + 8} y1={SKK.y - 1} x2={SKK.x + 8} y2={SKK.y + 7} />
        <line x1={SKK.x - 11} y1={SKK.y + 9} x2={SKK.x + 11} y2={SKK.y + 9} />
      </g>
      <text x={SKK.x} y={SKK.y + skkR + 16} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">SKK MIGAS</text>
      <text x={SKK.x} y={SKK.y + skkR + 30} textAnchor="middle" fill="#64748b" fontSize="10">Regulator</text>

      {/* ── Hub GX SPACE / RapiDSK ── */}
      <motion.circle cx={GX.x} cy={GX.y} r={gxR} fill="#0b1120" stroke="#f59e0b" strokeOpacity="0.6" strokeWidth="2"
        animate={{ strokeOpacity: [0.45, 0.85, 0.45] }} transition={{ duration: 3, repeat: Infinity }} />
      <text x={GX.x} y={GX.y - 6} textAnchor="middle" fontSize="17" fontWeight="800" fill="#ffffff">Rapi<tspan fill="#f59e0b">DSK</tspan></text>
      <text x={GX.x} y={GX.y + 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#38bdf8" letterSpacing="1">GX SPACE</text>
      <text x={GX.x} y={GX.y + 25} textAnchor="middle" fontSize="9" fill="#64748b">Data Exchange Hub</text>

      {/* ── Node KKKS + label ── */}
      <text x={kkksX - 12} y={startY - 22} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="700" letterSpacing="0.5">KKKS / CONTRACTORS</text>
      {rows.map((r, i) => (
        <g key={i}>
          <motion.circle cx={r.x} cy={r.y} r="5" fill={kkks[i].color}
            animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }} />
          <text x={r.x + 14} y={r.y + 4} fill="#cbd5e1" fontSize="12" fontWeight="500">{kkks[i].name}</text>
        </g>
      ))}
      <text x={kkksX + 14} y={startY + kkks.length * 46 - 16} fill="#38bdf8" fontSize="10">+ More KKKS</text>
    </svg>
  );
};

export default DataFlowAnimation;
