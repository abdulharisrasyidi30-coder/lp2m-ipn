import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { isStaff, supabase, useAsync } from '../lib';
import { Chip, PageHead, State } from '../ui';

const count = (rows: { status: string }[], s: string) => rows.filter((r) => r.status === s).length;

export default function Beranda() {
  const { profile } = useAuth();
  const p = profile!;
  const staff = isStaff(p.role);
  const { data, loading, error } = useAsync(async () => {
    const [a, b, c] = await Promise.all([
      p.role === 'mahasiswa' ? { data: [] } : supabase.from('proposals').select('status,user_id'),
      p.role === 'mahasiswa' ? { data: [] } : supabase.from('outputs').select('status,user_id'),
      supabase.from('assistant_applications').select('status,user_id,bentuk'),
    ]);
    return { prop: (a.data ?? []) as any[], out: (b.data ?? []) as any[], app: (c.data ?? []) as any[] };
  }, [p.id]);

  const mine = (rows: any[]) => rows.filter((r) => r.user_id === p.id);

  return (
    <>
      <PageHead title={`Selamat datang, ${p.full_name.split(',')[0]}`} sub="Ringkasan kegiatan penelitian dan pengabdian Anda." />
      <State loading={loading} error={error} />
      {data && p.role !== 'mahasiswa' && (
        <>
          <h2 className="h2">{staff ? 'Perlu ditinjau' : 'Status pengajuan Anda'}</h2>
          <div className="grid">
            {staff ? (
              <>
                <div className="stat"><b>{count(data.prop, 'diajukan') + count(data.prop, 'direview')}</b><span>Proposal menunggu tinjauan</span><Link to="/proposal">Buka proposal</Link></div>
                <div className="stat"><b>{count(data.out, 'menunggu')}</b><span>Luaran menunggu verifikasi</span><Link to="/luaran">Buka luaran</Link></div>
                <div className="stat"><b>{count(data.app, 'menunggu')}</b><span>Pendaftar asisten riset baru</span><Link to="/asisten">Buka pendaftar</Link></div>
              </>
            ) : (
              <>
                <div className="stat"><b>{mine(data.prop).length}</b><span>Proposal diajukan</span><Link to="/proposal">Ajukan atau lihat proposal</Link></div>
                <div className="stat"><b>{count(mine(data.prop), 'disetujui')}</b><span>Proposal disetujui</span></div>
                <div className="stat"><b>{mine(data.out).length}</b><span>Luaran dilaporkan</span><Link to="/luaran">Laporkan luaran</Link></div>
                <div className="stat"><b>{count(mine(data.out), 'terverifikasi')}</b><span>Luaran terverifikasi</span></div>
              </>
            )}
          </div>
        </>
      )}
      {data && p.role === 'mahasiswa' && (
        <div className="card">
          <h2 className="h2">Pendaftaran asisten riset</h2>
          {data.app.length === 0 ? (
            <p>Anda belum mendaftar. Mahasiswa tingkat akhir dapat membantu pengumpulan data riset dosen melalui KKN, Magang III, atau sebagai asisten riset.</p>
          ) : (
            <p>Status pendaftaran Anda: <Chip status={data.app[0].status} /></p>
          )}
          <Link className="btn btn-accent" to="/asisten">{data.app.length ? 'Lihat pendaftaran' : 'Daftar sekarang'}</Link>
        </div>
      )}
      <div className="card">
        <h2 className="h2">Pantau capaian road map</h2>
        <p>Lihat sejauh mana setiap program studi mencapai target 2026–2030: artikel terindeks, hibah eksternal, produk hilirisasi, HKI, dan buku.</p>
        <Link className="btn" to="/capaian">Buka halaman capaian</Link>
      </div>
    </>
  );
}
