# Adapter 8186 Action Plan

Dokumen ini merapikan perpindahan flow adapter lama ke adapter baru di `http://45.158.126.171:8186`.

Fokus dokumen:
- membandingkan flow FE yang sekarang vs kontrak API adapter `8186`
- menunjukkan endpoint map yang jelas
- memberi action plan upgrade FE tanpa merusak flow besar aplikasi
- memberi contoh payload inject/test supaya demo dan SIT lebih gampang

## 1. Ringkasan Perubahan

Adapter lama yang dipakai FE sekarang masih berbasis flow generik:
- health
- metadata
- ingest geojson
- ingest shapefile
- publish

Adapter `8186` sudah berubah menjadi flow berbasis:
- `remote source connection`
- `explore / preview remote source`
- `create ingestion task`
- `monitor ingestion task`
- `lihat hasil validasi lewat OGC items`

Artinya, kalau target demo mau inline dengan backend adapter terbaru, FE tidak cukup hanya ganti port. FE perlu ganti model interaksi.

## 2. Posisi FE Saat Ini

File FE yang sekarang masih pegang model lama:
- [src/api/services/adapter-runtime.ts](D:/laragon/www/dataspace-new/src/api/services/adapter-runtime.ts)
- [src/pages/Settings.tsx](D:/laragon/www/dataspace-new/src/pages/Settings.tsx)
- [server/bootstrap.cjs](D:/laragon/www/dataspace-new/server/bootstrap.cjs)

Karakter flow FE saat ini:
- pilih domain participant
- pilih adapter/jalur data
- health check adapter
- kirim GeoJSON langsung
- upload Shapefile langsung
- publish dataset

Gap besar:
- belum ada konsep `remote source connection`
- belum ada preview layer geoserver/arcgis
- belum ada monitoring task ingestion
- belum ada OGC item browser per `domain_code`

## 3. Flow Target 8186

### Case A. Remote Source

1. Daftarkan dulu `remote source connection`
2. Explore koneksi:
   - list layer
   - describe layer
   - preview feature
3. Buat ingestion task dengan `connection_id`
4. Monitor status task sampai `SUCCESS`
5. Lihat hasil validasi di OGC items per domain

### Case B. File / GeoJSON

1. Tidak perlu remote source connection
2. Buat ingestion task langsung
3. Monitor status task sampai `SUCCESS`
4. Lihat hasil validasi di OGC items per domain

## 4. Endpoint Map

### 4.1 Remote Source Connection

| Tujuan | Method | Endpoint | Status FE |
|---|---|---|---|
| Buat koneksi remote source | `POST` | `/api/v1/remote-sources/connections/` | Belum ada |
| List koneksi remote source | `GET` | `/api/v1/remote-sources/connections/` | Belum ada |
| Detail koneksi | `GET` | `/api/v1/remote-sources/connections/{id}` | Belum ada |
| Update koneksi | `PATCH` | `/api/v1/remote-sources/connections/{id}` | Belum ada |

Payload create:
- `name`
- `provider`: `geoserver | arcgis`
- `auth_type`
- `base_url`
- `credential`

### 4.2 Explore Geoserver

| Tujuan | Method | Endpoint | Status FE |
|---|---|---|---|
| List layers | `GET` | `/api/v1/remote-sources/geoserver/{connection_id}/layers` | Belum ada |
| Describe layer | `GET` | `/api/v1/remote-sources/geoserver/{connection_id}/describe?layer_name=...` | Belum ada |
| Preview feature | `GET` | `/api/v1/remote-sources/geoserver/{connection_id}/preview?layer_name=...` | Belum ada |

### 4.3 Explore ArcGIS

| Tujuan | Method | Endpoint | Status FE |
|---|---|---|---|
| List layers | `GET` | `/api/v1/remote-sources/arcgis/{connection_id}/layers` | Belum ada |
| Describe layer | `GET` | `/api/v1/remote-sources/arcgis/{connection_id}/describe?layer_id=...` | Belum ada |
| Preview feature | `GET` | `/api/v1/remote-sources/arcgis/{connection_id}/preview?layer_id=...` | Belum ada |
| Preview GeoJSON | `GET` | `/api/v1/remote-sources/arcgis/{connection_id}/preview-geojson?layer_id=...` | Belum ada |

Catatan:
- ArcGIS belum bisa dites penuh kalau data sumber belum siap
- tapi FE tetap bisa dibikin karena kontrak API-nya sudah jelas

### 4.4 Ingestion Task

| Tujuan | Method | Endpoint | Status FE |
|---|---|---|---|
| Ingest GeoJSON | `POST` | `/api/v1/data-ingestion/geojson` | Belum inline, FE masih pakai flow lama |
| Ingest Shapefile | `POST` | `/api/v1/data-ingestion/shapefile` | Belum inline, FE masih pakai flow lama |
| Ingest GeoServer | `POST` | `/api/v1/data-ingestion/geoserver` | Belum ada |
| Ingest ArcGIS | `POST` | `/api/v1/data-ingestion/arcgis` | Belum ada |
| Get task by id | `GET` | `/api/v1/data-ingestion/{id}` | Belum ada |
| List task | `GET` | `/api/v1/data-ingestion/` | Belum ada |

### 4.5 Hasil Validasi / OGC

| Tujuan | Method | Endpoint | Status FE |
|---|---|---|---|
| List providers | `GET` | `/api/v1/ogc/providers` | Belum ada |
| List collections | `GET` | `/api/v1/ogc/collections` | Belum ada |
| List item hasil validasi per domain | `GET` | `/api/v1/ogc/collections/{domain_code}/items` | Belum ada |

## 5. Compare As-Is vs To-Be

### As-Is FE

- FE pakai adapter base URL per participant adapter
- FE kirim request ke wrapper `/adapter-runtime/*`
- FE fokus ke `geojson`, `shapefile`, `publish`
- FE belum punya status task ingestion
- FE belum punya browser remote source

### To-Be 8186

- FE butuh menu `Remote Source`
- FE butuh menu `Explore Source`
- FE butuh menu `Ingestion Tasks`
- FE butuh menu `Validated Items / OGC`
- FE tidak lagi menganggap `publish` sebagai langkah utama adapter

## 6. Saran Struktur UI Baru

### Section 1. Remote Source

Tujuan:
- daftar connection
- tambah/edit connection
- aktif/nonaktif connection

Field minimal:
- nama koneksi
- provider
- auth type
- base URL
- credential JSON

### Section 2. Explore Source

Tujuan:
- cek koneksi valid
- lihat layer yang tersedia
- lihat schema layer
- preview sample feature

Komponen:
- pilih connection
- tombol `Muat Layer`
- panel `Describe`
- panel `Preview`

### Section 3. Ingestion Task

Tab yang disarankan:
- `GeoJSON`
- `Shapefile`
- `GeoServer`
- `ArcGIS`

Setiap tab menulis task baru, bukan langsung publish.

### Section 4. Monitoring

Kolom yang perlu ada:
- task id
- type
- domain
- status
- classification
- created_at
- updated_at
- error_log

CTA:
- refresh
- buka detail task
- buka hasil OGC jika `SUCCESS`

### Section 5. Hasil Validasi

Tujuan:
- lihat item yang sudah lolos validasi
- pakai filter per `domain_code`

Filter minimal:
- `WK`
- `FLD`
- `SEI`
- `WLL`
- `FP`

## 7. Payload Inject / Test Samples

Tujuan bagian ini supaya tim bisa langsung test backend `8186` tanpa bingung.

### 7.1 Create Remote Source - GeoServer

```json
{
  "name": "PHE GeoServer Demo",
  "provider": "geoserver",
  "auth_type": "basic",
  "base_url": "https://example-geoserver.company.com/geoserver",
  "credential": {
    "username": "demo_user",
    "password": "demo_pass"
  }
}
```

### 7.2 Create Remote Source - ArcGIS

```json
{
  "name": "ArcGIS Demo",
  "provider": "arcgis",
  "auth_type": "api_key",
  "base_url": "https://example-arcgis.company.com/arcgis/rest/services",
  "credential": {
    "api_key": "demo-key"
  }
}
```

### 7.3 Ingest GeoJSON

```json
{
  "domain_id": "11111111-1111-1111-1111-111111111111",
  "domain_name": "Wilayah Kerja",
  "domain_code": "WK",
  "geojson_body": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [106.816666, -6.2]
        },
        "properties": {
          "name": "Demo Point"
        }
      }
    ]
  },
  "classification": "L2"
}
```

### 7.4 Ingest Shapefile

Gunakan multipart form-data:
- `domain_id`
- `domain_name`
- `domain_code`
- `file`
- optional `field_map`
- optional `classification`

Contoh field_map:

```json
{
  "well_name": "WELL_NAME",
  "operator": "OPERATOR"
}
```

### 7.5 Ingest GeoServer

```json
{
  "connection_id": "22222222-2222-2222-2222-222222222222",
  "domain_id": "11111111-1111-1111-1111-111111111111",
  "domain_name": "Wilayah Kerja",
  "domain_code": "WK",
  "classification": "L2",
  "layer_name": "workspace:working_area",
  "cql_filter": null,
  "srs_name": "EPSG:4326"
}
```

### 7.6 Ingest ArcGIS

```json
{
  "connection_id": "33333333-3333-3333-3333-333333333333",
  "domain_id": "11111111-1111-1111-1111-111111111111",
  "domain_name": "Wilayah Kerja",
  "domain_code": "WK",
  "classification": "L2",
  "layer_id": 0,
  "layer_name": "Working Area",
  "where": "1=1",
  "out_fields": "*",
  "return_geometry": true,
  "out_sr": 4326
}
```

### 7.7 Monitoring Task

Request:

```http
GET /api/v1/data-ingestion/{task_id}
```

Field penting yang harus dilihat:
- `status`
- `classification`
- `error_log`
- `updated_at`

### 7.8 OGC Items

Contoh:

```http
GET /api/v1/ogc/collections/WK/items?limit=10&offset=0
```

Domain code yang valid dari spec:
- `WK`
- `FLD`
- `SEI`
- `WLL`
- `FP`

## 8. Upgrade Plan

### Phase 1. Safety Layer

Target:
- jangan ubah flow onboarding/participant yang sudah jalan
- tambahkan flow adapter baru tanpa mematikan flow lama

Kerjaan:
- pisahkan adapter lama sebagai `legacy flow`
- buat service baru `adapter-8186.ts`
- jangan pakai `publish` sebagai action utama di flow baru

### Phase 2. Remote Source UI

Kerjaan:
- CRUD connection remote source
- provider switch `geoserver / arcgis`
- auth type form dinamis
- credential editor JSON

Output:
- user bisa register source
- user bisa lihat source yang aktif

### Phase 3. Explore UI

Kerjaan:
- list layers
- describe layer
- preview feature
- preview geojson untuk arcgis

Output:
- user bisa validasi bahwa source bisa dikonsumsi sebelum ingest

### Phase 4. Ingestion Task UI

Kerjaan:
- form `GeoJSON`
- form `Shapefile`
- form `GeoServer`
- form `ArcGIS`

Output:
- semua request bikin task ingestion baru

### Phase 5. Monitoring + Result

Kerjaan:
- list task
- detail task
- status polling opsional
- tombol buka OGC result

Output:
- user tahu task success/fail
- user bisa cek hasil validasi domain

## 9. Priority Order

Kalau mau cepat untuk demo, urutan implementasi terbaik:

1. `Remote Source Connection`
2. `Explore Geoserver`
3. `Ingest Geoserver`
4. `Task Monitoring`
5. `OGC Items`
6. `GeoJSON`
7. `Shapefile`
8. `ArcGIS`

Kenapa:
- geoserver paling realistis buat ditest sekarang
- arcgis masih terbatas oleh data
- monitoring harus ada supaya hasil ingest bisa dipercaya

## 10. Kesimpulan

Kondisi sekarang:
- FE adapter belum inline dengan adapter `8186`
- FE masih memakai model adapter lama
- backend `8186` sekarang sudah jelas kontraknya dan lebih matang untuk flow ingestion berbasis task

Langkah terbaik:
- jangan tempel `8186` ke UI lama secara setengah-setengah
- buat flow baru yang jujur:
  - remote source
  - explore
  - ingestion task
  - monitoring
  - ogc results

Dengan model ini, demo akan jauh lebih rapi dan tidak membingungkan user provider.
