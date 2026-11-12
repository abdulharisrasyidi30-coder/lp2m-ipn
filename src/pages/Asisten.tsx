import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { PRODI, RUMPUN, isStaff, supabase, tgl, useAsync } from '../lib';
import { Alert, Chip, Field, PageHead, State } from '../ui';

const BENTUK = ['Asisten riset', 'KKN', 'Magang III'];

function Form({ initial, onDone, onCancel }: { initial?: any; onDone: () => void; onCancel: () => void }) {
  const { profile } = useAuth();
  const [f, setF] = useState<any>(initial ?? { prodi: profile!.prodi ?? 'PAI', bentuk: 'Asisten riset', semester: '', rumpun: '', keahlian: '', motivasi: '', kontak: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const row = { prodi: f.prodi, bentuk: f.bentuk, semester: f.semester ? Number(f.semester) : null, rumpun: f.rumpun || null, keahlian: f.keahlian || null, motivasi: f.motivasi || null, kontak: f.kontak || null };
    const { error } = initial
      ? await supabase.from('assistant_applications').update(row).eq('id', initial.id)
      : await supabase.from('assistant_applications').insert(row);
    if (error) setErr(error.message); else onDone();
    setBusy(false);
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2 className="h2">{initial ? 'Ubah pendaftaran' : 'Daftar sebagai asisten riset'}</h2>
      <div className="row3">
        <Field label="Program studi"><select value={f.prodi} onChange={(e) => { set('prodi', e.target.value); set('rumpun', ''); }}>{PRODI.map((p) => <option key={p.kode}>{p.kode}</option>)}</select></Field>
        <Field label="Bentuk keterlibatan"><select value={f.bentuk} onChange={(e) => set('bentuk', e.target.value)}>{BENTUK.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Semester"><input type="number" min="1" max="14" value={f.semester ?? ''} onChange={(e) => set('semester', e.target.value)} /></Field>
      </div>
      <Field label="Rumpun riset yang diminati">
        <select value={f.rumpun ?? ''} onChange={(e) => set('rumpun', e.target.value)}><option value="">(pilih)</option>{(RUMPUN[f.prodi] ?? []).map((r) => <option key={r}>{r}</option>)}</select>
      </Field>
      <Field label="Keahlian" hint="Mis. wawancara, olah data SPSS, penulisan, desain media."><input value={f.keahlian ?? ''} onChange={(e) => set('keahlian', e.target.value)} /></Field>
      <Field label="Motivasi"><textarea rows={3} value={f.motivasi ?? ''} onChange={(e) => set('motivasi', e.target.value)} /></Field>
      <Field label="Kontak (WhatsApp)"><input value={f.kontak ?? ''} onChange={(e) => set('kontak', e.target.value)} /></Field>
      {err && <Alert kind="err">{err}</Alert>}
      <div className="actions">
        <button className="btn btn-accent" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

function Review({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [catatan, setCatatan] = useState(row.catatan ?? '');
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    const { error } = await supabase.from('assistant_applications').update({ status, catatan: catatan || null }).eq('id', row.id);
    if (error) setErr(error.message); else onSaved();
  }
  return (
    <div className="review">
      <div className="row2">
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}>{['menunggu', 'diterima', 'ditolak'].map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Catatan"><input value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
      </div>
      {err && <Alert kind="err">{err}</Alert>}
      <button className="btn" onClick={save}>Simpan</button>
    </div>
  );
}

export default function Asisten() {
  const { profile } = useAuth();
  const p = profile!;
  const staff = isStaff(p.role);
  const [tab, setTab] = useState<'tinjau' | 'saya'>(staff ? 'tinjau' : 'saya');
  const [edit, setEdit] = useState<any | 'baru' | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('assistant_applications').select('*, pembuat:profiles!user_id(full_name,nomor_induk)').order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  }, []);
  const mine = (data ?? []).find((r) => r.user_id === p.id);
  const rows = tab === 'saya' ? (data ?? []).filter((r) => r.user_id === p.id) : data ?? [];
  const bisaDaftar = p.role === 'mahasiswa' && !mine;

  async function hapus(id: string) {
    if (!confirm('Batalkan pendaftaran?')) return;
    const { error } = await supabase.from('assistant_applications').delete().eq('id', id);
    if (error) alert(error.message); else void reload();
  }

  return (
    <>
      <PageHead title="Asisten riset mahasiswa" sub="Mahasiswa membantu riset dosen melalui asisten riset, KKN, atau Magang III."
        action={bisaDaftar && !edit && <button className="btn btn-accent" onClick={() => setEdit('baru')}>+ Daftar</button>} />
      {edit && <Form initial={edit === 'baru' ? undefined : edit} onCancel={() => setEdit(null)} onDone={() => { setEdit(null); void reload(); }} />}
      {staff && (
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'tinjau'} onClick={() => setTab('tinjau')}>Semua pendaftar</button>
        </div>
      )}
      {p.role === 'dosen' && <Alert kind="info">Dosen dapat melihat pendaftar melalui Ketua Prodi atau Admin LP2M. Hubungi mereka untuk menggandeng asisten.</Alert>}
      <State loading={loading} error={error} empty={!loading && rows.length === 0} emptyText={p.role === 'mahasiswa' ? 'Anda belum mendaftar.' : 'Belum ada pendaftar.'} />
      {rows.map((r) => (
        <article className="card item" key={r.id}>
          <div className="item-head">
            <div>
              <h3>{r.pembuat?.full_name ?? 'Pendaftar'} {r.pembuat?.nomor_induk && <small className="muted">NIM {r.pembuat.nomor_induk}</small>}</h3>
              <p className="muted small">{r.bentuk} · {r.prodi}{r.semester ? ` · smt ${r.semester}` : ''} · {tgl(r.created_at)}</p>
            </div>
            <Chip status={r.status} />
          </div>
          {r.rumpun && <p className="small"><b>Minat:</b> {r.rumpun}</p>}
          {r.keahlian && <p className="small"><b>Keahlian:</b> {r.keahlian}</p>}
          {r.motivasi && <p>{r.motivasi}</p>}
          {staff && r.kontak && <p className="small"><b>Kontak:</b> {r.kontak}</p>}
          {r.catatan && <Alert kind="info">Catatan: {r.catatan}</Alert>}
          {r.user_id === p.id && r.status === 'menunggu' && (
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => setEdit(r)}>Ubah</button>
              <button className="btn btn-ghost" onClick={() => hapus(r.id)}>Batalkan</button>
            </div>
          )}
          {staff && <Review row={r} onSaved={reload} />}
        </article>
      ))}
    </>
  );
}
