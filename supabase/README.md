# Supabase — ArenaKu

Folder ini berisi semua konfigurasi dan migrasi database untuk ArenaKu.

## Struktur

```
supabase/
├── config.toml              # Konfigurasi Supabase local dev
├── migrations/
│   ├── 20260218000000_initial_schema.sql     # Tabel, enum, indexes
│   ├── 20260218000001_rls_policies.sql       # Row Level Security
│   └── 20260218000002_functions_triggers.sql  # Triggers & functions
└── seed.sql                 # Data awal untuk dev/testing
```

## Setup Local Development

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ke project Supabase cloud
supabase link --project-ref <your-project-ref>

# Jalankan migrasi
supabase db push

# Generate TypeScript types
supabase gen types typescript --linked > src/types/database.types.ts
```

## Cara Akses Supabase Dashboard

1. Buka https://supabase.com/dashboard
2. Masuk ke project
3. Table Editor → lihat semua tabel
4. SQL Editor → jalankan query manual

## Storage Buckets (perlu dibuat manual di dashboard)

| Bucket | Public | Allowed MIME Types |
|---|---|---|
| `logos` | ✅ | image/jpeg, image/png, image/webp |
| `banners` | ✅ | image/jpeg, image/png, image/webp |
| `qris` | ✅ | image/jpeg, image/png |
| `payments` | ❌ | image/jpeg, image/png, application/pdf |
| `screenshots` | ❌ | image/jpeg, image/png |
| `disputes` | ❌ | image/jpeg, image/png, application/pdf |
