import { motion } from "framer-motion";

/**
 * BackgroundScene — backdrop panel kanan login.
 * Memakai render `public/BG.png` (peta Indonesia digital + offshore platform + geologi +
 * governance flow) yang DIREDUPKAN menjadi latar halus, agar konten overlay (hero kiri +
 * diagram animasi kanan-atas + kartu + stats) menjadi fokus — selaras mockup login-target.
 * Dark-mode only, dekoratif (pointer-events-none), responsif (object-cover).
 */
export const BackgroundScene = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
    <img src="/BG.png" alt="" aria-hidden
      className="absolute inset-0 w-full h-full object-cover object-center" />

    {/* veil gelap menyeluruh → BG turun jadi latar halus (diagram bawaan BG ikut redup) */}
    <div className="absolute inset-0 bg-[#070b16]/62" />
    {/* glow biru lembut atas-kanan (peta) + amber kanan-bawah (rig) */}
    <div className="absolute inset-0 opacity-70"
      style={{ background: "radial-gradient(900px 460px at 78% 24%, rgba(37,99,235,0.14), transparent 60%), radial-gradient(620px 460px at 95% 96%, rgba(245,158,11,0.10), transparent 60%)" }} />

    {/* partikel data mengambang */}
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.span key={i} className="absolute rounded-full bg-sky-300/40"
        style={{ width: 3, height: 3, left: `${(i * 73) % 96}%`, top: `${(i * 39) % 80}%` }}
        animate={{ y: [0, -16, 0], opacity: [0.1, 0.5, 0.1] }}
        transition={{ duration: 4 + (i % 5), repeat: Infinity, delay: i * 0.35 }} />
    ))}

    {/* scrim kontras: kiri (hero) + bawah (kartu/stats) */}
    <div className="absolute inset-y-0 left-0 w-2/5"
      style={{ background: "linear-gradient(to right, rgba(7,11,22,0.7), transparent)" }} />
    <div className="absolute inset-x-0 bottom-0 h-2/5"
      style={{ background: "linear-gradient(to top, rgba(7,11,22,0.85), transparent)" }} />
  </div>
);

export default BackgroundScene;
