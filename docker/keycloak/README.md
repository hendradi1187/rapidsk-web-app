# SPEKTRUM Local Keycloak (Development)

Local IAM (Identity & Access Management) untuk development frontend rapiDSK + SPEKTRUM coexistence. Berdiri sendiri di Docker, tidak butuh setup manual.

## Prasyarat

- Docker Desktop running di Windows
- Port `8080` dan `9000` belum dipakai aplikasi lain

## Cara menjalankan

Dari root project (`D:\Project\gnt\rapidsk-web-app`):

```powershell
# Start Keycloak + Postgres
docker compose -f docker/keycloak/docker-compose.yml up -d

# Cek status
docker compose -f docker/keycloak/docker-compose.yml ps

# Lihat logs (tunggu sampai melihat "Keycloak ... started")
docker compose -f docker/keycloak/docker-compose.yml logs -f keycloak

# Stop (data tetap)
docker compose -f docker/keycloak/docker-compose.yml down

# Reset total (drop database — semua user/realm hilang)
docker compose -f docker/keycloak/docker-compose.yml down -v
```

Tunggu 30-60 detik untuk first boot. Realm `spektrum` akan otomatis di-import dari `realm-export.json`.

## Yang sudah otomatis di-setup

### Realm

- Name: `spektrum`
- Display name: SPEKTRUM Federated Dataspace
- Token lifespan: 1 hour (access), 30 min idle, 10 hour max session

### Client

- Client ID: `rapidsk-web`
- Type: Public client (SPA, PKCE S256)
- Redirect URIs: `http://localhost:5173/*`, `http://localhost:8080/*`, `http://localhost:3000/*`
- Default scopes: `web-origins`, `acr`, `profile`, `roles`, `email`, `spektrum-permissions`

### Canonical roles (7)

| Role | Sample User | Password |
|---|---|---|
| `SUPER_ADMIN` | `superadmin` | `password` |
| `ADMIN` | `admin` | `password` |
| `PROVIDER` | `provider` | `password` |
| `CONSUMER` | `consumer` | `password` |
| `VIEWER` | `viewer` | `password` |
| `AUDITOR` | `auditor` | `password` |
| `GIS_ANALYST` + `CONSUMER` (multi-role) | `gis_analyst` | `password` |

> ⚠️ Password `password` HANYA untuk dev. Production pakai password kuat.

### Custom JWT claims

JWT yang di-issue Keycloak akan punya extra claims:

```json
{
  "sub": "...",
  "preferred_username": "consumer",
  "email": "consumer@regulator.go.id",
  "name": "Data Consumer",
  "realm_access": { "roles": ["CONSUMER", ...default Keycloak roles...] },
  "permissions": ["access-request.create", "gis.query", "gis.export"],
  "participant_id": "part-002",
  "participant": {
    "organization_name": "SKK Migas",
    "role_type": "consumer"
  },
  "exp": ...,
  "iat": ...
}
```

### Endpoint penting

| Endpoint | URL |
|---|---|
| Admin Console | `http://localhost:8080/admin/` (login: `admin` / `admin`) |
| Account Console | `http://localhost:8080/realms/spektrum/account/` |
| Token endpoint | `http://localhost:8080/realms/spektrum/protocol/openid-connect/token` |
| OIDC discovery | `http://localhost:8080/realms/spektrum/.well-known/openid-configuration` |
| Health | `http://localhost:9000/health/ready` |

## Test login via curl (Direct Access Grant)

Untuk test cepat tanpa browser:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8080/realms/spektrum/protocol/openid-connect/token" `
  -Method Post `
  -ContentType "application/x-www-form-urlencoded" `
  -Body @{
    client_id = "rapidsk-web"
    grant_type = "password"
    username = "consumer"
    password = "password"
  }

$response.access_token
```

Decode JWT pakai `https://jwt.io` untuk verify claim structure.

## Konfigurasi frontend

Set di `.env` project root:

```bash
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=spektrum
VITE_KEYCLOAK_CLIENT_ID=rapidsk-web
```

## Troubleshooting

**"connection refused" saat pertama jalan**
→ Tunggu 30-60 detik. Postgres harus boot dulu, baru Keycloak migrate skema, baru import realm.

**Mau modifikasi realm/user**
→ Login ke admin console (`http://localhost:8080/admin/`, user `admin` pwd `admin`), pilih realm `spektrum`. Atau edit `realm-export.json` lalu reset volume:
```powershell
docker compose -f docker/keycloak/docker-compose.yml down -v
docker compose -f docker/keycloak/docker-compose.yml up -d
```

**Port 8080 conflict**
→ Edit `docker-compose.yml`, ganti `"8080:8080"` jadi `"8081:8080"`. Update `VITE_KEYCLOAK_URL` di `.env` ke `http://localhost:8081`.

**Realm import error**
→ Cek log: `docker compose -f docker/keycloak/docker-compose.yml logs keycloak`. JSON syntax error biasanya disebut explicit di log.

## Production note

⚠️ **Setup ini HANYA untuk development**. Production deployment perlu:
- HTTPS (proxy via nginx/caddy)
- Stronger admin password (set via `KC_BOOTSTRAP_ADMIN_PASSWORD` secret)
- Database credentials dari secret manager
- Mode `start` (bukan `start-dev`)
- Realm config dari Terraform/Pulumi (bukan one-shot import)
- Backup strategy untuk Postgres volume
