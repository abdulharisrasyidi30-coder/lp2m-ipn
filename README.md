# Sistem LP2M Institut Palapa Nusantara

Portal publik (`/`) + aplikasi masuk/daftar (`/app/`): proposal penelitian & pengabdian, unggah luaran, capaian prodi vs target 2026-2030, pendaftaran asisten riset mahasiswa.
Stack: Vite + React + Supabase (Auth, Postgres+RLS, Storage) + Vercel.

## 1. Supabase (gratis)
1. Buat proyek di supabase.com.
2. SQL Editor -> tempel seluruh isi `supabase/schema.sql` -> Run.
3. Authentication -> Providers: Email aktif. (Opsional: matikan "Confirm email" agar pendaftar langsung bisa masuk.)
4. Authentication -> URL Configuration: isi Site URL dengan alamat Vercel Anda.
5. Settings -> API: salin **Project URL** dan **anon public key**.

## 2. Admin pertama
Daftar lewat `/app/`, lalu di SQL Editor:
```sql
update public.profiles set role='admin' where email='surel-anda@contoh.com';
```
Selanjutnya admin mengatur Ketua Prodi dan prodinya dari menu **Pengguna**.
Pendaftar publik hanya bisa menjadi dosen/mahasiswa.

## 3. Vercel
1. Unggah folder ini ke GitHub, lalu Import di vercel.com (preset Vite otomatis).
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Domain sendiri: Settings -> Domains.

## Lokal
```
cp .env.example .env   # isi dua nilai
npm install && npm run dev
```
Catatan keamanan: anon key memang publik; perlindungan data ada pada RLS di `schema.sql` (sudah diuji). Jangan pernah memakai service_role key di frontend.
