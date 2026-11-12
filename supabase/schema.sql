-- =====================================================================
-- Sistem LP2M Institut Palapa Nusantara: skema database Supabase
-- Jalankan SELURUH berkas ini sekali di Supabase > SQL Editor > New query.
-- =====================================================================

-- ---------- 1. Profil pengguna ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text,
  role        text not null default 'mahasiswa'
              check (role in ('dosen','mahasiswa','kaprodi','admin')),
  prodi       text check (prodi in ('PAI','PGMI','MPI','PIAUD','Ekonomi Syariah','HTN','MPAI')),
  nomor_induk text,                       -- NIDN (dosen) atau NIM (mahasiswa)
  created_at  timestamptz not null default now()
);

-- ---------- 2. Fungsi bantu (security definer agar tidak rekursif di RLS) ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_prodi() returns text
language sql stable security definer set search_path = public as
$$ select prodi from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('kaprodi','admin'), false) $$;

-- Admin mengelola semua prodi; kaprodi hanya prodinya sendiri.
create or replace function public.can_manage(p_prodi text) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_admin() or (public.my_role() = 'kaprodi' and public.my_prodi() = p_prodi) $$;

-- ---------- 3. Profil otomatis saat pendaftaran ----------
-- Pendaftar hanya boleh memilih peran dosen atau mahasiswa. Kaprodi dan admin
-- ditetapkan oleh admin (lihat README).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := case when m->>'role' in ('dosen','mahasiswa') then m->>'role' else 'mahasiswa' end;
  p text := case when m->>'prodi' in ('PAI','PGMI','MPI','PIAUD','Ekonomi Syariah','HTN','MPAI') then m->>'prodi' else null end;
begin
  insert into public.profiles (id, full_name, email, role, prodi, nomor_induk)
  values (new.id, coalesce(nullif(m->>'full_name',''), new.email, 'Pengguna'), new.email, r, p, nullif(m->>'nomor_induk',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 4. Proposal penelitian dan pengabdian ----------
create table if not exists public.proposals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  jenis            text not null check (jenis in ('penelitian','pengabdian')),
  judul            text not null,
  prodi            text not null check (prodi in ('PAI','PGMI','MPI','PIAUD','Ekonomi Syariah','HTN','MPAI')),
  rumpun           text,
  pilar            smallint check (pilar between 1 and 3),
  tahun            int not null check (tahun between 2026 and 2030),
  skema            text not null default 'internal' check (skema in ('internal','eksternal')),
  ringkasan        text,
  anggota          text,                     -- anggota tim (teks bebas)
  anggaran         numeric(14,0),
  file_path        text,
  status           text not null default 'diajukan'
                   check (status in ('diajukan','direview','revisi','disetujui','ditolak')),
  catatan_reviewer text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists proposals_user_idx  on public.proposals(user_id);
create index if not exists proposals_prodi_idx on public.proposals(prodi, tahun);

-- ---------- 5. Luaran: artikel, HKI, buku, produk, hibah, MoU ----------
create table if not exists public.outputs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  proposal_id     uuid references public.proposals(id) on delete set null,
  jenis           text not null check (jenis in ('artikel','hki','buku','produk','hibah','mou')),
  judul           text not null,
  prodi           text not null check (prodi in ('PAI','PGMI','MPI','PIAUD','Ekonomi Syariah','HTN','MPAI')),
  tahun           int not null check (tahun between 2026 and 2030),
  keterangan      text,                      -- indeks (Sinta/Scopus), penerbit/ISBN, nomor HKI, nama mitra, dst.
  url             text,
  file_path       text,
  status          text not null default 'menunggu'
                  check (status in ('menunggu','terverifikasi','ditolak')),
  catatan         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists outputs_user_idx  on public.outputs(user_id);
create index if not exists outputs_prodi_idx on public.outputs(prodi, tahun, jenis);

-- ---------- 6. Pendaftaran mahasiswa sebagai asisten riset ----------
create table if not exists public.assistant_applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() unique references public.profiles(id) on delete cascade,
  prodi       text not null check (prodi in ('PAI','PGMI','MPI','PIAUD','Ekonomi Syariah','HTN','MPAI')),
  bentuk      text not null check (bentuk in ('Asisten riset','KKN','Magang III')),
  semester    int check (semester between 1 and 14),
  rumpun      text,
  keahlian    text,
  motivasi    text not null,
  kontak      text,
  status      text not null default 'menunggu' check (status in ('menunggu','diterima','ditolak')),
  catatan     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 7. Pemicu: updated_at dan perlindungan kolom penilaian ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger proposals_touch before update on public.proposals for each row execute function public.touch_updated_at();
create trigger outputs_touch   before update on public.outputs   for each row execute function public.touch_updated_at();
create trigger assistant_touch before update on public.assistant_applications for each row execute function public.touch_updated_at();

-- Pemilik tidak boleh mengubah kolom penilaian milik staf.
create or replace function public.protect_proposal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage(old.prodi) then
    new.status := case when new.status = 'diajukan' then 'diajukan' else old.status end;
    new.catatan_reviewer := old.catatan_reviewer;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger proposals_protect before update on public.proposals for each row execute function public.protect_proposal();

create or replace function public.protect_output() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage(old.prodi) then
    new.status := case when new.status = 'menunggu' then 'menunggu' else old.status end;
    new.catatan := old.catatan;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger outputs_protect before update on public.outputs for each row execute function public.protect_output();

create or replace function public.protect_application() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage(old.prodi) then
    new.status := case when new.status = 'menunggu' then 'menunggu' else old.status end;
    new.catatan := old.catatan;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger assistant_protect before update on public.assistant_applications for each row execute function public.protect_application();

-- ---------- 8. Row Level Security ----------
alter table public.profiles               enable row level security;
alter table public.proposals              enable row level security;
alter table public.outputs                enable row level security;
alter table public.assistant_applications enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role()
              and (role <> 'kaprodi' or prodi is not distinct from public.my_prodi()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- proposals
create policy proposals_select on public.proposals for select to authenticated
  using (user_id = auth.uid() or public.can_manage(prodi));
create policy proposals_insert on public.proposals for insert to authenticated
  with check (user_id = auth.uid() and status = 'diajukan' and public.my_role() in ('dosen','kaprodi','admin'));
create policy proposals_update_own on public.proposals for update to authenticated
  using (user_id = auth.uid() and status in ('diajukan','revisi'))
  with check (user_id = auth.uid());
create policy proposals_update_staff on public.proposals for update to authenticated
  using (public.can_manage(prodi)) with check (public.can_manage(prodi));
create policy proposals_delete_own on public.proposals for delete to authenticated
  using (user_id = auth.uid() and status = 'diajukan');
create policy proposals_delete_admin on public.proposals for delete to authenticated
  using (public.is_admin());

-- outputs
create policy outputs_select on public.outputs for select to authenticated
  using (user_id = auth.uid() or public.can_manage(prodi));
create policy outputs_insert on public.outputs for insert to authenticated
  with check (user_id = auth.uid() and status = 'menunggu' and public.my_role() in ('dosen','kaprodi','admin'));
create policy outputs_update_own on public.outputs for update to authenticated
  using (user_id = auth.uid() and status in ('menunggu','ditolak'))
  with check (user_id = auth.uid());
create policy outputs_update_staff on public.outputs for update to authenticated
  using (public.can_manage(prodi)) with check (public.can_manage(prodi));
create policy outputs_delete_own on public.outputs for delete to authenticated
  using (user_id = auth.uid() and status <> 'terverifikasi');
create policy outputs_delete_admin on public.outputs for delete to authenticated
  using (public.is_admin());

-- assistant_applications
create policy assistant_select on public.assistant_applications for select to authenticated
  using (user_id = auth.uid() or public.can_manage(prodi));
create policy assistant_insert on public.assistant_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'menunggu' and public.my_role() = 'mahasiswa');
create policy assistant_update_own on public.assistant_applications for update to authenticated
  using (user_id = auth.uid() and status = 'menunggu')
  with check (user_id = auth.uid());
create policy assistant_update_staff on public.assistant_applications for update to authenticated
  using (public.can_manage(prodi)) with check (public.can_manage(prodi));
create policy assistant_delete_own on public.assistant_applications for delete to authenticated
  using (user_id = auth.uid() and status = 'menunggu');

-- ---------- 9. Ringkasan capaian (hanya angka, aman dibaca semua pengguna masuk) ----------
create or replace function public.capaian_prodi()
returns table (prodi text, tahun int, jenis text, jumlah int)
language sql stable security definer set search_path = public as $$
  select o.prodi, o.tahun, o.jenis, count(*)::int
    from public.outputs o where o.status = 'terverifikasi' group by 1,2,3
  union all
  select p.prodi, p.tahun, 'proposal_' || p.jenis, count(*)::int
    from public.proposals p where p.status = 'disetujui' group by 1,2,3
$$;
revoke all on function public.capaian_prodi() from public, anon;
grant execute on function public.capaian_prodi() to authenticated;

-- ---------- 10. Hak akses tabel ----------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.profiles, public.proposals, public.outputs, public.assistant_applications to authenticated;

-- ---------- 11. Penyimpanan berkas (bucket privat "dokumen", maks 10 MB) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumen', 'dokumen', false, 10485760,
  array['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg','image/png'])
on conflict (id) do nothing;

create policy dokumen_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);
create policy dokumen_select on storage.objects for select to authenticated
  using (bucket_id = 'dokumen' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
create policy dokumen_update on storage.objects for update to authenticated
  using (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);
create policy dokumen_delete on storage.objects for delete to authenticated
  using (bucket_id = 'dokumen' and (storage.foldername(name))[1] = auth.uid()::text);
