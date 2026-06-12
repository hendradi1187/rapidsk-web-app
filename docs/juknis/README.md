# Juknis Ruleset — Studio Adapter (Tim Domain SKK Migas)

`juknis-ruleset.json` adalah **sumber kebenaran tunggal** aturan Juknis SKK Migas yang dipakai **Studio Adapter** untuk:
1. **Validasi kepatuhan** endpoint KKKS saat onboarding (`/adapter/validate`), dan
2. **Wizard Setup Juknis** (klasifikasi & retensi default).

> Tujuan: agar onboarding KKKS dapat **menyatakan kepatuhan terhadap aturan hulu migas Indonesia** secara otomatis, bukan hanya pemeriksaan struktural.

## Status: v1 sudah TER-ISI dari implementasi BE
Ruleset ini **bukan kerangka kosong lagi** — sudah diisi dari sumber nyata gx-space:
- `apply.py` (`JUKNIS_DOMAINS`): 5 domain, geometri, klasifikasi, atribut wajib terimplementasi (+ Fase 3a: `operator` semua domain, WK `effective_date`/`expire_date`, Seismik `sumber_navigasi`, Fasilitas `kapasitas`/`satuan_kapasitas`).
- `masking.py`: aturan masking L3/L4 (presisi koordinat L3=2/L4=1 desimal; atribut sensitif dibuang; L4 hanya `keep_only`).
- `AUDIT_Atribut_SIGI_vs_Schema.md`: daftar `sigi_full_fields_pending` per domain.

## Yang WAJIB diratifikasi/dilengkapi tim domain
- `global_rules.pending_governance_decisions` (5 keputusan): penamaan UPPERCASE SIGI/PPDM vs lowercase, subset Mandatory untuk SPEKTRUM, model Fasilitas (1 vs 8 sub-tipe), penamaan PPDM Seismik + pisah Area/Line, pembagian PJ input SKK vs KKKS.
- `sigi_full_fields_pending[]` per domain: putuskan field SIGI tambahan mana yang menjadi **wajib** saat publish.
- `juknis_reference` & `ruleset_version`: perbarui bila versi Juknis berubah.

## Aturan pengisian
- `type` harus salah satu dari `attribute_type_enum`.
- `geometry_types_allowed` harus dari `geometry_type_enum`.
- Jangan mengubah `key` domain (dipakai sebagai ID lintas sistem).
- Jangan hard-code aturan ini di tempat lain — Studio Adapter & wizard membaca file ini.

## Setelah diratifikasi
- Tim FE/BE menyambungkan Studio Adapter & wizard ke file ini (fase implementasi).
- Perubahan Juknis cukup diedit di sini + naikkan `ruleset_version`.
