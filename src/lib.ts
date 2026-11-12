import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

// ---------- Supabase ----------
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const configured = Boolean(url && key);
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'belum-diisi');

// ---------- Data acuan dari Dokumen Road Map 2026-2030 ----------
export type Role = 'dosen' | 'mahasiswa' | 'kaprodi' | 'admin';

export const PRODI = [
  { kode: 'PAI', nama: 'Pendidikan Agama Islam' },
  { kode: 'PGMI', nama: 'Pendidikan Guru Madrasah Ibtidaiyah' },
  { kode: 'MPI', nama: 'Manajemen Pendidikan Islam' },
  { kode: 'PIAUD', nama: 'Pendidikan Islam Anak Usia Dini' },
  { kode: 'Ekonomi Syariah', nama: 'Ekonomi Syariah' },
  { kode: 'HTN', nama: 'Hukum Tata Negara (Siyasah)' },
  { kode: 'MPAI', nama: 'Magister Pendidikan Agama Islam' },
];

export const RUMPUN: Record<string, string[]> = {
  PAI: ['Inovasi Pembelajaran PAI', 'Moderasi Beragama dan Pendidikan Karakter', 'Kurikulum dan Evaluasi PAI', 'Pendidikan Agama Islam Berbasis Kearifan Lokal'],
  PGMI: ['Pembelajaran Tematik dan Literasi Dasar', 'Media dan Teknologi Pembelajaran Anak Usia Sekolah Dasar', 'Manajemen Kelas dan Psikologi Perkembangan Anak', 'Integrasi Nilai Islami dalam Pembelajaran MI'],
  MPI: ['Manajemen dan Kepemimpinan Lembaga Pendidikan Islam', 'Manajemen Mutu dan Akreditasi', 'Digitalisasi Manajemen Pendidikan', 'Manajemen Sumber Daya dan Pembiayaan Pendidikan'],
  PIAUD: ['Pengembangan Anak Usia Dini Holistik-Integratif', 'Permainan Edukatif dan Media Pembelajaran AUD', 'Pendidikan Karakter dan Nilai Keislaman pada AUD', 'Kesehatan, Gizi, dan Perlindungan Anak Usia Dini'],
  'Ekonomi Syariah': ['Keuangan Syariah dan Lembaga Keuangan Mikro', 'Ekonomi Kreatif dan UMKM Berbasis Syariah', 'Zakat, Wakaf, dan Filantropi Islam', 'Pariwisata Halal dan Ekonomi Pesisir'],
  HTN: ['Fikih Siyasah dan Ketatanegaraan Islam', 'Hukum dan Kebijakan Publik Daerah', 'Hak Asasi Manusia dan Demokrasi', 'Hukum Adat dan Resolusi Konflik Lokal'],
  MPAI: ['Filsafat dan Teori Pendidikan Islam Lanjutan', 'Pengembangan Kebijakan dan Mutu Pendidikan Islam', 'Riset Lanjutan Pembelajaran dan Evaluasi Pendidikan Islam', 'Kepemimpinan dan Pengembangan Sumber Daya Pendidikan Islam'],
};

export const PILAR = [
  'Pilar 1: Moderasi Beragama dan Literasi Keislaman',
  'Pilar 2: Mutu Pendidikan dan Pembelajaran Berbasis Riset',
  'Pilar 3: Pemberdayaan Masyarakat Pesisir-Agraris dan Ekonomi Umat',
];

export const TAHUN = [2026, 2027, 2028, 2029, 2030];

export const JENIS_LUARAN: Record<string, string> = {
  artikel: 'Artikel jurnal',
  hki: 'HKI / hak cipta',
  buku: 'Buku ajar / monograf',
  produk: 'Produk / model hilirisasi',
  hibah: 'Hibah eksternal',
  mou: 'Kerja sama (MoU)',
};

// Target dari Bab III-X dokumen road map.
export type Metrik = {
  key: string;
  label: string;
  mode: 'tahunan' | 'kumulatif';
  target: (prodi: string, tahun: number) => number;
  catatan: string;
};

export const METRIK: Metrik[] = [
  { key: 'artikel', label: 'Artikel Sinta/Scopus', mode: 'tahunan',
    target: (_p, t) => ({ 2026: 1, 2027: 2, 2028: 3, 2029: 4, 2030: 5 } as Record<number, number>)[t] ?? 0,
    catatan: 'Target minimal per tahun: 1, 2, 3, 4, 5 (2026 sampai 2030)' },
  { key: 'hibah', label: 'Hibah eksternal', mode: 'tahunan',
    target: (_p, t) => (t >= 2027 ? 1 : 0), catatan: 'Minimal 1 hibah per prodi per tahun, mulai 2027' },
  { key: 'produk', label: 'Produk/model hilirisasi', mode: 'kumulatif',
    target: () => 1, catatan: 'Minimal 1 produk per prodi pada 2029 sampai 2030' },
  { key: 'hki', label: 'HKI / hak cipta', mode: 'kumulatif',
    target: (p) => (p === 'MPAI' ? 1 : 3), catatan: 'Target akhir periode: 3 HKI per prodi S1, 1 HKI untuk MPAI' },
  { key: 'buku', label: 'Buku ajar / monograf', mode: 'kumulatif',
    target: (p) => (p === 'MPAI' ? 1 : 3), catatan: 'Target akhir periode: 3 buku per prodi S1, 1 buku untuk MPAI' },
];

export const STATUS_LABEL: Record<string, string> = {
  diajukan: 'Diajukan', direview: 'Direview', revisi: 'Perlu revisi', disetujui: 'Disetujui', ditolak: 'Ditolak',
  menunggu: 'Menunggu', terverifikasi: 'Terverifikasi', diterima: 'Diterima',
};

export const isStaff = (r?: Role) => r === 'kaprodi' || r === 'admin';
export const rupiah = (n?: number | null) => (n == null ? '-' : 'Rp ' + n.toLocaleString('id-ID'));
export const tgl = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- Hook data sederhana ----------
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setData(await run()); } catch (e: any) { setError(e?.message ?? String(e)); }
    setLoading(false);
  }, [run]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

// ---------- Berkas ----------
export async function unggah(uid: string, file: File): Promise<string> {
  const aman = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${uid}/${Date.now()}-${aman}`;
  const { error } = await supabase.storage.from('dokumen').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function bukaBerkas(path: string) {
  const { data, error } = await supabase.storage.from('dokumen').createSignedUrl(path, 300);
  if (error || !data) { alert('Berkas tidak dapat dibuka: ' + (error?.message ?? '')); return; }
  window.open(data.signedUrl, '_blank', 'noopener');
}
