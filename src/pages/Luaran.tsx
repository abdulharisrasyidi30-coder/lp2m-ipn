import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { JENIS_LUARAN, PRODI, TAHUN, isStaff, supabase, tgl, unggah, useAsync } from '../lib';
import { Alert, Chip, Field, FileLink, PageHead, State } from '../ui';

const STATUS_LUARAN = ['menunggu', 'terverifikasi', 'ditolak'];
const label = (k: string) => JENIS_LUARAN[k] ?? k;

function Form({ proposals, onDone, onCancel }: { proposals: any[]; onDone: () => void; onCancel: () => void }) {
  const { profile } = useAuth();
  const [f, setF] = useState({ jenis: 'artikel', judul: '', prodi: profile!.prodi ?? 'PAI', tahun: '2026', keterangan: '', url: '', proposal_id: '' });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const row: any = {
        jenis: f.jenis, judul: f.judul.trim(), prodi: f.prodi, tahun: Number(f.tahun),
        keterangan: f.keterangan || null, url: f.url || null, proposal_id: f.proposal_id || null,
      };
      if (file) row.file_path = await unggah(profile!.id, file);
      const { error } = await supabase.from('outputs').insert(row);
      if (error) throw error;
      onDone();
    } catch (e: any) { setErr(e.message ?? String(e)); }
    setBusy(false);
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2 className="h2">Laporkan luaran</h2>
      <div className="row3">
        <Field label="Jenis luaran">
          <select value={f.jenis} onChange={(e) => set('jenis', e.target.value)}>
            {Object.entries(JENIS_LUARAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Program studi">
          <select value={f.prodi} onChange={(e) => set('prodi', e.target.value)}>{PRODI.map((p) => <option key={p.kode}>{p.kode}</option>)}</select>
        </Field>
        <Field label="Tahun">
          <select value={f.tahun} onChange={(e) => set('tahun', e.target.value)}>{TAHUN.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>
      <Field label="Judul / nama luaran"><input required value={f.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
      <Field label="Terkait proposal (opsional)">
        <select value={f.proposal_id} onChange={(e) => set('proposal_id', e.target.value)}>
          <option value="">(tidak terkait)</option>
          {proposals.map((p) => <option key={p.id} value={p.id}>{p.judul}</option>)}
        </select>
      </Field>
      <Field label="Keterangan" hint="Nama jurnal & indeks (Sinta/Scopus), nomor HKI, ISBN, penerbit, mitra MoU, dll.">
        <textarea rows={3} value={f.keterangan} onChange={(e) => set('keterangan', e.target.value)} />
      </Field>
      <Field label="Tautan (opsional)"><input type="url" placeholder="https://" value={f.url} onChange={(e) => set('url', e.target.value)} /></Field>
      <Field label="Berkas bukti (PDF/gambar, maks. 10 MB)"><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      {err && <Alert kind="err">{err}</Alert>}
      <div className="actions">
        <button className="btn btn-accent" disabled={busy}>{busy ? 'Menyimpan…' : 'Kirim laporan'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>
      </div>
    </form>
  );
}

function Verify({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [catatan, setCatatan] = useState(row.catatan ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('outputs').update({ status, catatan: catatan || null }).eq('id', row.id);
    if (error) setErr(error.message); else onSaved();
    setBusy(false);
  }
  return (
    <div className="review">
      <strong>Verifikasi</strong>
      <div className="row2">
        <Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_LUARAN.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Catatan"><input value={catatan} onChange={(e) => setCatatan(e.target.value)} /></Field>
      </div>
      {err && <Alert kind="err">{err}</Alert>}
      <button className="btn" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan verifikasi'}</button>
    </div>
  );
}

export default function Luaran() {
  const { profile } = useAuth();
  const p = profile!;
  const staff = isStaff(p.role);
  const [tab, setTab] = useState<'tinjau' | 'saya'>(staff ? 'tinjau' : 'saya');
  const [adding, setAdding] = useState(false);
  const { data, loading, error, reload } = useAsync(async () => {
    const [o, pr] = await Promise.all([
      supabase.from('outputs').select('*, pembuat:profiles!user_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('proposals').select('id,judul').eq('user_id', p.id),
    ]);
    if (o.error) throw o.error;
    return { outs: o.data as any[], props: (pr.data ?? []) as any[] };
  }, [p.id]);
  const rows = (data?.outs ?? []).filter((r) => (tab === 'saya' ? r.user_id === p.id : true));

  async function hapus(id: string) {
    if (!confirm('Hapus laporan luaran ini?')) return;
    const { error } = await supabase.from('outputs').delete().eq('id', id);
    if (error) alert(error.message); else void reload();
  }

  return (
    <>
      <PageHead title="Luaran" sub="Laporan dan luaran penelitian/pengabdian: artikel, HKI, buku, produk, hibah, dan MoU."
        action={!adding && <button className="btn btn-accent" onClick={() => setAdding(true)}>+ Laporkan luaran</button>} />
      {adding && <Form proposals={data?.props ?? []} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); void reload(); }} />}
      {staff && (
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'tinjau'} onClick={() => setTab('tinjau')}>Untuk diverifikasi</button>
          <button role="tab" aria-selected={tab === 'saya'} onClick={() => setTab('saya')}>Milik saya</button>
        </div>
      )}
      <State loading={loading} error={error} empty={!loading && rows.length === 0} emptyText="Belum ada luaran." />
      {rows.map((r) => (
        <article className="card item" key={r.id}>
          <div className="item-head">
            <div>
              <h3>{r.judul}</h3>
              <p className="muted small">
                {label(r.jenis)} · {r.prodi} · {r.tahun} · {tgl(r.created_at)}
                {tab === 'tinjau' && r.pembuat && <> · oleh {r.pembuat.full_name}</>}
              </p>
            </div>
            <Chip status={r.status} />
          </div>
          {r.keterangan && <p>{r.keterangan}</p>}
          <p className="small">
            {r.url && <a href={r.url} target="_blank" rel="noreferrer">Buka tautan ↗</a>} <FileLink path={r.file_path} />
          </p>
          {r.catatan && <Alert kind="info">Catatan: {r.catatan}</Alert>}
          {r.user_id === p.id && r.status === 'menunggu' && (
            <div className="actions"><button className="btn btn-ghost" onClick={() => hapus(r.id)}>Hapus</button></div>
          )}
          {staff && tab === 'tinjau' && <Verify row={r} onSaved={reload} />}
        </article>
      ))}
    </>
  );
}
