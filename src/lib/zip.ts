/**
 * zip.ts — Pembungkus ZIP minimal (metode STORE, tanpa kompresi) di sisi klien.
 *
 * Kenapa ada: hasil download persistent sering dinamai ulang oleh download manager
 * (IDM dkk) atau server mengirim octet-stream tanpa nama → file jatuh ke ".bin".
 * Dengan membungkus blob ke ZIP, nama + ekstensi file asli TERKUNCI di dalam arsip,
 * apa pun nama file luar yang dipakai browser/download manager.
 *
 * Tanpa dependensi: format ZIP (local file header + central directory + EOCD)
 * disusun manual. STORE saja (tanpa deflate) — isi umumnya sudah GeoJSON/CSV yang
 * tidak butuh kompresi untuk sekadar dibuka, dan ini menghindari lib tambahan.
 */

// ── CRC32 (tabel standar polynomial 0xEDB88320) ───────────────────────────────
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// ── DOS date/time (format timestamp internal ZIP) ─────────────────────────────
const dosDateTime = (d: Date): { time: number; date: number } => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

/**
 * Bungkus satu blob menjadi arsip ZIP berisi satu file bernama `innerName`.
 * Batas format ZIP klasik ~4GB; di atas itu (butuh ZIP64) kembalikan blob asli
 * apa adanya daripada menghasilkan arsip korup.
 */
export const wrapBlobInZip = async (blob: Blob, innerName: string): Promise<Blob> => {
  const data = new Uint8Array(await blob.arrayBuffer());
  if (data.length >= 0xffffffff) return blob; // ZIP64 tidak didukung — jangan korupsi

  const name = new TextEncoder().encode(innerName);
  const crc = crc32(data);
  const { time, date } = dosDateTime(new Date());

  // Local file header (30 byte + nama)
  const local = new DataView(new ArrayBuffer(30));
  local.setUint32(0, 0x04034b50, true); // signature
  local.setUint16(4, 20, true); // version needed
  local.setUint16(6, 0x0800, true); // flags: UTF-8 filename
  local.setUint16(8, 0, true); // method: STORE
  local.setUint16(10, time, true);
  local.setUint16(12, date, true);
  local.setUint32(14, crc, true);
  local.setUint32(18, data.length, true); // compressed size (= raw, STORE)
  local.setUint32(22, data.length, true); // uncompressed size
  local.setUint16(26, name.length, true);
  local.setUint16(28, 0, true); // extra length

  // Central directory header (46 byte + nama)
  const central = new DataView(new ArrayBuffer(46));
  central.setUint32(0, 0x02014b50, true);
  central.setUint16(4, 20, true); // version made by
  central.setUint16(6, 20, true); // version needed
  central.setUint16(8, 0x0800, true);
  central.setUint16(10, 0, true);
  central.setUint16(12, time, true);
  central.setUint16(14, date, true);
  central.setUint32(16, crc, true);
  central.setUint32(20, data.length, true);
  central.setUint32(24, data.length, true);
  central.setUint16(28, name.length, true);
  // extra/comment/disk/attrs = 0
  central.setUint32(42, 0, true); // offset of local header

  const centralOffset = 30 + name.length + data.length;
  const centralSize = 46 + name.length;

  // End of central directory (22 byte)
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, 1, true); // total entries (disk)
  eocd.setUint16(10, 1, true); // total entries
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralOffset, true);

  return new Blob(
    [local.buffer, name, data, central.buffer, name, eocd.buffer],
    { type: "application/zip" },
  );
};

/** Nama arsip luar dari nama file dalam: "hasil.geojson" → "hasil.zip". */
export const zipArchiveName = (innerName: string): string =>
  innerName.replace(/\.[a-z0-9]+$/i, "") + ".zip";
