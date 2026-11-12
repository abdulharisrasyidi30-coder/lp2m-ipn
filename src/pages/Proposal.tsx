import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { PILAR, PRODI, RUMPUN, TAHUN, isStaff, rupiah, supabase, tgl, unggah, useAsync } from '../lib';
import { Alert, Chip, Field, FileLink, PageHead, State } from '../ui';

const STATUS_PROPOSAL = ['diajukan', 'direview', 'revisi', 'disetujui', 'ditolak'];
const KOSONG = { jenis: 'penelitian', judul: '', prodi: '', rumpun: '', pilar: '', tahun: '2026', skema: 'internal', ringkasan: '', anggota: '', anggaran: '' };

function Form({ initial, onDone, onCancel }: { initial?: any; onDone: () => void; onCancel: () => void }) {
  const { profile } = useAuth();
  const [f, setF] = useState<any>(initial ? { ...KOSONG, ...initial, pilar: initial.pilar ?? '', anggaran: initial.anggaran ?? '', tahun: String(initial.tahun) } : { ...KOSONG, prodi: profile!.prodi ?? 'PAI' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const row: any = {
        jenis: f.jenis, judul: f.judul.trim(), prodi: f.prodi, rumpun: f.rumpun || null,
        pilar: f.pilar ? Number(f.pilar) : null, tahun: Number(f.tahun), skema: f.skema,
        ringkasan: f.ringkasan || null, anggota: f.anggota || null, anggaran: f.anggaran ? Number(f.anggaran) : null,
      };
      if (file) row.file_path = await unggah(profile!.id, file);
      const q = initial
        ? supabase.from('proposals').update({ ...row, status: 'diajukan' }).eq('id', initial.id)
        : supabase.from('proposals').insert(row);
      const { error } = await q;
      if (error) throw error;
      onDone();
    } catch (e: any) { setErr(e.message ?? String(e)); }
    setBusy(false);
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2 className="h2">{initial ? 'Ubah proposal' : 'Ajukan proposal baru'}</h2>
      <div className="row3">
        <Field label="Jenis">
          <select value={f.jenis} onChange={(e) => set('jenis', e.target.value)}>
            <option value="penelitian">Penelitian</option><option value="pengabdian">Pengabdian kepada masyarakat</option>
          </select>
        </Field>
        <Field label="Program studi">
          <select value={f.prodi} onChange={(e) => { set('prodi', e.target.value); set('rumpun', ''); }}>
            {PRODI.map((p) => <option key={p.kode} value={p.kode}>{p.kode}</option>)}
          </select>
        </Field>
        <Field label="Tahun pelaksanaan">
          <select value={f.tahun} onChange={(e) => set('tahun', e.target.value)}>{TAHUN.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>
      <Field label="Judul"><input required value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
      <div className="row2">
        <Field label="Rumpun riset prodi">
          <select value={f.rumpun} onChange={(e) => set('rumpun', e.target.value)}>
            <option value="">(pilih)</option>{(RUMPUN[f.prodi] ?? []).map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Pilar payung penelitian">
          <select value={f.pilar} onChange={(e) => set('pilar', e.target.value)}>
            <option value="">(pilih)</option>{PILAR.map((p, i) => <option key={p} value={i + 1}>{p}</option>)}
          </select>
        </Field>
      </div>
      <div className="row2">
        <Field label="Skema pendanaan">
          <select value={f.skema} onChange={(e) => set('skema', e.target.value)}>
            <option value="internal">Internal institusi</option><option value="eksternal">Hibah eksternal (DRTPM/Litapdimas, dll.)</option>
          </select>
        </Field>
        <Field label="Usulan anggaran (Rp)"><input type="number" min="0" value={f.anggaran} onChange={(e) => set('anggaran', e.target.value)} /></Field>
      </div>
      <Field label="Ringkasan" hint="Latar belakang, tujuan, dan metode secara singkat."><textarea rows={4} value={f.ringkasan} onChange={(e) => set('ringkasan', e.target.value)} /></Field>
      <Field label="Anggota tim" hint="Nama dosen dan mahasiswa yang terlibat."><textarea rows={2} value={f.anggota} onChange={(e) => set('anggota', e.target.value)} /></Field>
      <Field label="Berkas proposal lengkap (PDF/Word, maks. 10 MB)" hint={initial?.file_path ? 'Biarkan kosong untuk tetap memakai berkas sebelumnya.' : undefined}>
        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      {err && <Alert kind="err">{err}</Alert>}
      <div className="actions">
        <button className="btn btn-accent" disabled={busy}>{busy ? 'Menyimpan…' : initial ? 'Simpan dan ajukan ulang' : 'Ajukan proposal'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

function Review({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [catatan, setCatatan] = useState(row.catatan_reviewer ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('proposals').update({ status, catatan_reviewer: catatan || null }).eq('id', row.id);
    if (error) setErr(error.message); else onSaved();
    setBusy(false);
  }
  return (
    <div className="review">
      <strong>Tinjauan</strong>
      <div className="row2">
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_PROPOSAL.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Catatan untuk pengusul"><input value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
      </div>
      {err && <Alert kind="err">{err}</Alert>}
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan tinjauan'}</button>
    </div>
  );
}

export default function Proposal() {
  const { profile } = useAuth();
  const p = profile!;
  const staff = isStaff(p.role);
  const [tab, setTab] = useState<'tinjau' | 'saya'>(staff ? 'tinjau' : 'saya');
  const [edit, setEdit] = useState<any | 'baru' | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('proposals').select('*, pembuat:profiles!user_id(full_name,nomor_induk)').order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  }, []);
  const rows = (data ?? []).filter((r) => (tab === 'saya' ? r.user_id === p.id : true));

  async function hapus(id: string) {
    if (!confirm('Hapus proposal ini?')) return;
    const { error } = await supabase.from('proposals').delete().eq('id', id);
    if (error) alert(error.message); else void reload();
  }

  return (
    <>
      <PageHead title="Proposal" sub="Pengajuan proposal penelitian dan pengabdian kepada masyarakat."
        action={!edit && <button className="btn btn-accent" onClick={() => setEdit('baru')}>+ Ajukan proposal</button>} />
      {edit && <Form initial={edit === 'baru' ? undefined : edit} onCancel={() => setEdit(null)} onDone={() => { setEdit(null); void reload(); }} />}
      {staff && (
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'tinjau'} onClick={() => setTab('tinjau')}>Untuk ditinjau</button>
          <button role="tab" aria-selected={tab === 'saya'} onClick={() => setTab('saya')}>Milik saya</button>
        </div>
      )}
      <State loading={loading} error={error} empty={!loading && rows.length === 0} emptyText="Belum ada proposal." />
      {rows.map((r) => (
        <article className="card item" key={r.id}>
          <div className="item-head">
            <div>
              <h3>{r.judul}</h3>
              <p className="muted small">
                {r.jenis === 'penelitian' ? 'Penelitian' : 'Pengabdian'} · {r.prodi} · {r.tahun} · skema {r.skema} · {tgl(r.created_at)}
                {tab === 'tinjau' && r.pembuat && <> · oleh {r.pembuat.full_name}</>}
              </p>
            </div>
            <Chip status={r.status} />
          </div>
          {r.rumpun && <p className="small"><b>Rumpun:</b> {r.rumpun}{r.pilar ? ` · ${PILAR[r.pilar - 1]}` : ''}</p>}
          {r.ringkasan && <p>{r.ringkasan}</p>}
          {r.anggota && <p className="small"><b>Tim:</b> {r.anggota}</p>}
          <p className="small"><b>Anggaran:</b> {rupiah(r.anggaran)} <FileLink path={r.file_path} /></p>
          {r.catatan_reviewer && <Alert kind="info">Catatan reviewer: {r.catatan_reviewer}</Alert>}
          {r.user_id === p.id && ['diajukan', 'revisi'].includes(r.status) && (
            <div className="actions">
              <button className="btn btn-ghost" onClick={() => setEdit(r)}>Ubah</button>
              {r.status === 'diajukan' && <button className="btn btn-ghost" onClick={() => hapus(r.id)}>Hapus</button>}
            </div>
          )}
          {staff && tab === 'tinjau' && <Review row={r} onSaved={reload} />}
        </article>
      ))}
    </>
  );
}
