import { useState } from 'react';
import { PRODI, supabase, useAsync } from '../lib';
import { Alert, PageHead, State } from '../ui';

function Baris({ u, onSaved }: { u: any; onSaved: () => void }) {
  const [role, setRole] = useState(u.role);
  const [prodi, setProdi] = useState(u.prodi ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = role !== u.role || prodi !== (u.prodi ?? '');
  async function save() {
    const { error } = await supabase.from('profiles').update({ role, prodi: prodi || null }).eq('id', u.id);
    if (error) setMsg(error.message); else { setMsg(null); onSaved(); }
  }
  return (
    <tr>
      <td><b>{u.full_name}</b><br /><small className="muted">{u.email}{u.nomor_induk ? ` · ${u.nomor_induk}` : ''}</small></td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {['mahasiswa', 'dosen', 'kaprodi', 'admin'].map((r) => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <select value={prodi} onChange={(e) => setProdi(e.target.value)}>
          <option value="">(tidak ada)</option>{PRODI.map((p) => <option key={p.kode}>{p.kode}</option>)}
        </select>
      </td>
      <td>{dirty && <button className="btn" onClick={save}>Simpan</button>}{msg && <small className="alert-err"> {msg}</small>}</td>
    </tr>
  );
}

export default function Pengguna() {
  const { data, loading, error, reload } = useAsync(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  }, []);
  return (
    <>
      <PageHead title="Pengguna" sub="Atur peran dan program studi. Ketua Prodi hanya dapat meninjau data prodinya sendiri." />
      <Alert kind="info">Pendaftar baru otomatis menjadi Dosen atau Mahasiswa. Naikkan menjadi Ketua Prodi atau Admin di sini.</Alert>
      <State loading={loading} error={error} empty={!loading && (data ?? []).length === 0} />
      {data && (
        <div className="table-wrap">
          <table className="tbl"><thead><tr><th>Nama</th><th>Peran</th><th>Prodi</th><th /></tr></thead>
            <tbody>{data.map((u) => <Baris key={u.id} u={u} onSaved={reload} />)}</tbody></table>
        </div>
      )}
    </>
  );
}
