import { useState } from 'react';
import { METRIK, PRODI, TAHUN, supabase, useAsync } from '../lib';
import { PageHead, State } from '../ui';

type Baris = { prodi: string; tahun: number; jenis: string; jumlah: number };

export default function Capaian() {
  const [tahun, setTahun] = useState(2026);
  const { data, loading, error } = useAsync(async () => {
    const { data, error } = await supabase.rpc('capaian_prodi');
    if (error) throw error;
    return (data ?? []) as Baris[];
  }, []);

  const hitung = (prodi: string, jenis: string, mode: 'tahunan' | 'kumulatif') =>
    (data ?? [])
      .filter((r) => r.prodi === prodi && r.jenis === jenis && (mode === 'tahunan' ? r.tahun === tahun : r.tahun <= tahun))
      .reduce((a, r) => a + r.jumlah, 0);
  const mou = (data ?? []).filter((r) => r.jenis === 'mou' && r.tahun === tahun).reduce((a, r) => a + r.jumlah, 0);

  return (
    <>
      <PageHead title="Capaian terhadap target 2026–2030" sub="Dihitung dari proposal yang disetujui dan luaran yang sudah diverifikasi LP2M." />
      <div className="seg" role="tablist" aria-label="Tahun">
        {TAHUN.map((t) => <button key={t} role="tab" aria-selected={tahun === t} onClick={() => setTahun(t)}>{t}</button>)}
      </div>
      <State loading={loading} error={error} />
      {data && (
        <>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Program studi</th>{METRIK.map((m) => <th key={m.key} title={m.catatan}>{m.label}<small>{m.mode === 'tahunan' ? `tahun ${tahun}` : `s.d. ${tahun}`}</small></th>)}<th>Proposal disetujui<small>tahun {tahun}</small></th></tr>
              </thead>
              <tbody>
                {PRODI.map((p) => (
                  <tr key={p.kode}>
                    <th scope="row">{p.kode}</th>
                    {METRIK.map((m) => {
                      const cap = hitung(p.kode, m.key, m.mode);
                      const tgt = m.target(p.kode, tahun);
                      const pct = tgt ? Math.min(100, Math.round((cap / tgt) * 100)) : 100;
                      return (
                        <td key={m.key}>
                          <b>{cap}</b> / {tgt}
                          <div className="bar" aria-label={`${pct}%`}><i style={{ width: pct + '%' }} className={pct >= 100 ? 'ok' : ''} /></div>
                        </td>
                      );
                    })}
                    <td><b>{hitung(p.kode, 'proposal_penelitian', 'tahunan')}</b> penelitian<br /><b>{hitung(p.kode, 'proposal_pengabdian', 'tahunan')}</b> pengabdian</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <b>Tingkat institusi {tahun}:</b> MoU terverifikasi {mou} / 3 (target minimal 3 per tahun).
          </div>
          <p className="muted small">Target produk hilirisasi berlaku 2029–2030. Capaian hanya menghitung data yang tercatat dan terverifikasi di sistem ini; kegiatan sebelum sistem dipakai perlu diinput agar tercermin.</p>
        </>
      )}
    </>
  );
}
