import { useState, type FormEvent } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { PRODI, configured, isStaff, supabase } from './lib';
import { Alert, Field } from './ui';
import Beranda from './pages/Beranda';
import Proposal from './pages/Proposal';
import Luaran from './pages/Luaran';
import Capaian from './pages/Capaian';
import Asisten from './pages/Asisten';
import Pengguna from './pages/Pengguna';

const ROLE_LABEL = { dosen: 'Dosen', mahasiswa: 'Mahasiswa', kaprodi: 'Ketua Prodi', admin: 'Admin LP2M' } as const;

function Brand() {
  return (
    <a className="brand" href="../">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="4" y="4" width="20" height="20" transform="rotate(45 14 14)" fill="none" stroke="#C9A24B" strokeWidth="2" />
        <circle cx="14" cy="14" r="3" fill="#C9A24B" />
      </svg>
      <span><strong>LP2M</strong><small>Institut Palapa Nusantara · Lombok NTB</small></span>
    </a>
  );
}

function Setup() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Database belum terhubung</h1>
        <p className="muted">Isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> (lihat <code>.env.example</code> dan README), lalu muat ulang halaman ini.</p>
      </div>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [f, setF] = useState({ nama: '', email: '', sandi: '', role: 'dosen', prodi: 'PAI', induk: '' });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    if (mode === 'masuk') {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.sandi });
      if (error) setMsg({ kind: 'err', text: error.message === 'Invalid login credentials' ? 'Surel atau kata sandi salah.' : error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.sandi,
        options: { data: { full_name: f.nama, role: f.role, prodi: f.prodi, nomor_induk: f.induk } },
      });
      if (error) setMsg({ kind: 'err', text: error.message });
      else if (!data.session) setMsg({ kind: 'ok', text: 'Akun dibuat. Cek surel Anda dan klik tautan konfirmasi, lalu masuk.' });
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Brand />
        <h1>Sistem LP2M</h1>
        <p className="muted">Pengajuan proposal, luaran, pemantauan capaian road map 2026–2030, dan pendaftaran asisten riset.</p>
        <div className="seg" role="tablist" aria-label="Masuk atau daftar">
          <button type="button" role="tab" aria-selected={mode === 'masuk'} onClick={() => setMode('masuk')}>Masuk</button>
          <button type="button" role="tab" aria-selected={mode === 'daftar'} onClick={() => setMode('daftar')}>Daftar</button>
        </div>
        <form onSubmit={submit} className="form">
          {mode === 'daftar' && (
            <>
              <Field label="Nama lengkap (beserta gelar)"><input required value={f.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
              <div className="row2">
                <Field label="Saya adalah">
                  <select value={f.role} onChange={(e) => set('role', e.target.value)}>
                    <option value="dosen">Dosen</option>
                    <option value="mahasiswa">Mahasiswa</option>
                  </select>
                </Field>
                <Field label="Program studi">
                  <select value={f.prodi} onChange={(e) => set('prodi', e.target.value)}>
                    {PRODI.map((p) => <option key={p.kode} value={p.kode}>{p.kode}</option>)}
                  </select>
                </Field>
              </div>
              <Field label={f.role === 'dosen' ? 'NIDN' : 'NIM'}><input value={f.induk} onChange={(e) => set('induk', e.target.value)} /></Field>
            </>
          )}
          <Field label="Surel"><input type="email" required autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Kata sandi" hint={mode === 'daftar' ? 'Minimal 6 karakter.' : undefined}>
            <input type="password" required minLength={6} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} value={f.sandi} onChange={(e) => set('sandi', e.target.value)} />
          </Field>
          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
          <button className="btn btn-accent" disabled={busy}>{busy ? 'Memproses…' : mode === 'masuk' ? 'Masuk' : 'Buat akun'}</button>
        </form>
        <p className="muted small"><a href="../">← Kembali ke portal LP2M</a></p>
      </div>
    </div>
  );
}

function Shell() {
  const { profile, signOut } = useAuth();
  if (!profile) return <p className="muted pad">Memuat profil…</p>;
  const r = profile.role;
  const links: [string, string, boolean][] = [
    ['/', 'Beranda', true],
    ['/proposal', 'Proposal', r !== 'mahasiswa'],
    ['/luaran', 'Luaran', r !== 'mahasiswa'],
    ['/capaian', 'Capaian', true],
    ['/asisten', 'Asisten riset', true],
    ['/pengguna', 'Pengguna', r === 'admin'],
  ];
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Brand />
          <nav aria-label="Menu utama">
            {links.filter((l) => l[2]).map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
            ))}
          </nav>
          <div className="who">
            <span><strong>{profile.full_name}</strong><small>{ROLE_LABEL[r]}{profile.prodi ? ` · ${profile.prodi}` : ''}</small></span>
            <button className="btn btn-ghost" onClick={signOut}>Keluar</button>
          </div>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Beranda />} />
          <Route path="/proposal" element={r !== 'mahasiswa' ? <Proposal /> : <Navigate to="/" />} />
          <Route path="/luaran" element={r !== 'mahasiswa' ? <Luaran /> : <Navigate to="/" />} />
          <Route path="/capaian" element={<Capaian />} />
          <Route path="/asisten" element={<Asisten />} />
          <Route path="/pengguna" element={r === 'admin' ? <Pengguna /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {isStaff(r) && <p className="muted small foot">Anda masuk sebagai {ROLE_LABEL[r]}. {r === 'kaprodi' ? 'Anda dapat meninjau data prodi ' + (profile.prodi ?? '(belum diatur)') + '.' : 'Anda dapat meninjau data semua prodi.'}</p>}
      </main>
    </>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  if (!configured) return <Setup />;
  if (loading) return <p className="muted pad">Memuat…</p>;
  return session ? <Shell /> : <Login />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider><Gate /></AuthProvider>
    </HashRouter>
  );
}
