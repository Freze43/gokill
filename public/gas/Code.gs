/**
 * ============================================================================
 * SIVERA — SISTEM SETORAN & VERIFIKASI PENDAPATAN (GOOGLE APPS SCRIPT)
 * 63 KA + 13 Parkir + 2 Loko Cafe + 1 Booth Loko = 79 unit
 * ----------------------------------------------------------------------------
 * Modul: 1) Master Unit  2) Input Setoran & Kalender
 *        3) Verifikasi (Kasir)  4) Slip Setoran Terverifikasi
 * Deploy: Deploy > New deployment > Web app
 *         Execute as: Me | Who has access: Anyone within your organisation
 * ============================================================================
 */

/** ====================== KONFIGURASI ====================== */
const CFG = {
  SPREADSHEET_ID: '', // kosongkan agar dibuat otomatis (link disimpan di Script Properties)
  SHEET: {
    UNIT: 'MasterUnit',
    SETORAN: 'Setoran',
    LOG: 'LogVerifikasi',
    SLIP: 'Slip',
    PENGATURAN: 'Pengaturan',
    PENGGUNA: 'Pengguna',
  },
  DRIVE_FOLDER: 'SIVERA-Bukti-Setor',
  TZ: 'Asia/Jakarta',
  APP_NAME: 'SIVERA',
  UNIT_TARGET: 79,
};

const KATEGORI = {
  ka: { label: 'Kereta Api', prefix: 'KA' },
  parkir: { label: 'Parkir', prefix: 'PRK' },
  cafe: { label: 'Loko Cafe', prefix: 'CFE' },
  booth: { label: 'Booth Loko', prefix: 'BTH' },
};

const HEADERS = {
  MasterUnit: ['id', 'kode_unit', 'nama_unit', 'nomor_unit', 'kategori', 'relasi', 'layanan', 'status_aktif', 'created_at'],
  Setoran: [
    'id', 'kode_setoran', 'tanggal_dinas', 'unit_id', 'shift', 'petugas', 'tunai', 'non_tunai', 'total',
    'bukti_nama', 'bukti_url', 'status', 'jenis_selisih', 'nominal_selisih', 'catatan_verifikator',
    'verifikator', 'verified_at', 'dibuat_oleh', 'created_at',
  ],
  LogVerifikasi: ['id', 'setoran_id', 'aksi', 'status_sebelum', 'status_sesudah', 'aktor', 'catatan', 'created_at'],
  Slip: ['id', 'nomor_referensi', 'token', 'jenis', 'periode_mulai', 'periode_selesai', 'unit_id', 'kategori', 'jumlah_transaksi', 'grand_total', 'terbilang', 'dicetak_oleh', 'snapshot', 'created_at'],
  Pengaturan: ['key', 'value'],
  Pengguna: ['email', 'nama', 'role', 'status_aktif'],
};

/** ====================== ENTRY POINT WEB APP ====================== */
function doGet(e) {
  const params = (e && e.parameter) || {};

  // API publik untuk QR validation / integrasi
  if (params.api === 'slip') {
    const slip = getSlip(token(params.token));
    return jsonOut_({ ok: !!slip, data: slip });
  }
  if (params.api === 'units') {
    return jsonOut_({ ok: true, data: getMasterUnits(params.kategori || '') });
  }

  setupSpreadsheet_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.tahun = new Date().getFullYear();
  return template
    .evaluate()
    .setTitle('SIVERA — Setoran & Verifikasi Pendapatan')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const payload = body.payload || {};
    let result;
    switch (action) {
      case 'simpanSetoran': result = simpanSetoran(payload); break;
      case 'verifikasi': result = verifikasiSetoran(payload); break;
      case 'verifikasiMassal': result = verifikasiMassal(payload); break;
      case 'buatSlip': result = buatSlip(payload); break;
      default: result = { ok: false, message: 'Aksi tidak dikenal: ' + action };
    }
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ ok: false, message: String(err) });
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SIVERA')
    .addItem('Setup / Perbaiki Spreadsheet', 'setupSpreadsheet_')
    .addItem('Isi 79 Master Unit', 'seedUnits_')
    .addItem('Kirim Pengingat Unit Belum Setor', 'reminderBelumSetor')
    .addToUi();
}

/** ====================== SPREADSHEET & SEED ====================== */
function getSS_() {
  const props = PropertiesService.getScriptProperties();
  let id = CFG.SPREADSHEET_ID || props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (err) { /* dibuat ulang di bawah */ }
  }
  const ss = SpreadsheetApp.create('SIVERA — Setoran & Verifikasi Pendapatan');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function getSheet_(name) {
  const ss = getSS_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = HEADERS[name] || ['id'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function setupSpreadsheet_() {
  Object.keys(HEADERS).forEach(getSheet_);
  seedUnits_();
  seedPengaturan_();
  return { ok: true, spreadsheetId: getSS_().getId() };
}

function seedPengaturan_() {
  const sheet = getSheet_(CFG.SHEET.PENGATURAN);
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 4, 2).setValues([
    ['nama_unit', 'PT Kereta Api Indonesia (Persero) — Daerah Operasi 4 Semarang'],
    ['alamat_unit', 'Jl. Stasiun Tawang No. 1, Semarang 50136 · Unit Pendapatan & Verifikasi'],
    ['nama_kepala_unit', 'Dedi Kurniawan'],
    ['nama_verifikator', 'Rani Puspita'],
  ]);
}

function seedUnits_() {
  const sheet = getSheet_(CFG.SHEET.UNIT);
  if (sheet.getLastRow() > 1) return { ok: true, skipped: true };

  const rows = [];
  const stamp = nowIso_();

  // 63 Kereta Api
  const ka = [
    ['Argo Bromo Anggrek', 'Eksekutif', 'Gambir – Surabaya Pasarturi'],
    ['Argo Bromo Anggrek', 'Eksekutif', 'Surabaya Pasarturi – Gambir'],
    ['Argo Bromo Anggrek', 'Luxury', 'Gambir – Surabaya Pasarturi'],
    ['Argo Bromo Anggrek', 'Luxury', 'Surabaya Pasarturi – Gambir'],
    ['Argo Wilis', 'Eksekutif', 'Bandung – Surabaya Gubeng'],
    ['Argo Wilis', 'Eksekutif', 'Surabaya Gubeng – Bandung'],
    ['Argo Lawu', 'Eksekutif', 'Gambir – Solo Balapan'],
    ['Argo Lawu', 'Eksekutif', 'Solo Balapan – Gambir'],
    ['Argo Dwipangga', 'Eksekutif', 'Gambir – Solo Balapan'],
    ['Argo Dwipangga', 'Eksekutif', 'Solo Balapan – Gambir'],
    ['Argo Muria', 'Eksekutif', 'Gambir – Semarang Tawang'],
    ['Argo Muria', 'Eksekutif', 'Semarang Tawang – Gambir'],
    ['Argo Sindoro', 'Eksekutif', 'Gambir – Semarang Tawang'],
    ['Argo Sindoro', 'Eksekutif', 'Semarang Tawang – Gambir'],
    ['Argo Jati', 'Eksekutif', 'Gambir – Cirebon'],
    ['Argo Jati', 'Eksekutif', 'Cirebon – Gambir'],
    ['Argo Parahyangan', 'Eksekutif–Ekonomi', 'Gambir – Bandung'],
    ['Argo Parahyangan', 'Eksekutif–Ekonomi', 'Bandung – Gambir'],
    ['Argo Cheribon', 'Eksekutif–Ekonomi', 'Gambir – Cirebon'],
    ['Argo Cheribon', 'Eksekutif–Ekonomi', 'Cirebon – Gambir'],
    ['Gajayana', 'Eksekutif', 'Gambir – Malang'],
    ['Gajayana', 'Eksekutif', 'Malang – Gambir'],
    ['Gajayana', 'Luxury', 'Gambir – Malang'],
    ['Bima', 'Eksekutif', 'Gambir – Surabaya Gubeng'],
    ['Bima', 'Eksekutif', 'Surabaya Gubeng – Gambir'],
    ['Turangga', 'Eksekutif', 'Bandung – Surabaya Gubeng'],
    ['Turangga', 'Eksekutif', 'Surabaya Gubeng – Bandung'],
    ['Mutiara Selatan', 'Eksekutif–Bisnis', 'Bandung – Surabaya Pasarturi'],
    ['Mutiara Selatan', 'Eksekutif–Bisnis', 'Surabaya Pasarturi – Bandung'],
    ['Mutiara Timur', 'Eksekutif–Bisnis', 'Surabaya Gubeng – Banyuwangi'],
    ['Mutiara Timur', 'Eksekutif–Bisnis', 'Banyuwangi – Surabaya Gubeng'],
    ['Ranggajati', 'Eksekutif–Bisnis', 'Cirebon – Jember'],
    ['Ranggajati', 'Eksekutif–Bisnis', 'Jember – Cirebon'],
    ['Sancaka', 'Eksekutif–Ekonomi', 'Surabaya Gubeng – Yogyakarta'],
    ['Sancaka', 'Eksekutif–Ekonomi', 'Yogyakarta – Surabaya Gubeng'],
    ['Sancaka Utara', 'Eksekutif–Ekonomi', 'Surabaya Pasarturi – Yogyakarta'],
    ['Sancaka Utara', 'Eksekutif–Ekonomi', 'Yogyakarta – Surabaya Pasarturi'],
    ['Malioboro Ekspres', 'Eksekutif–Ekonomi', 'Yogyakarta – Malang'],
    ['Malioboro Ekspres', 'Eksekutif–Ekonomi', 'Malang – Yogyakarta'],
    ['Taksaka', 'Eksekutif', 'Gambir – Yogyakarta'],
    ['Taksaka', 'Eksekutif', 'Yogyakarta – Gambir'],
    ['Taksaka', 'Luxury', 'Gambir – Yogyakarta'],
    ['Purwojaya', 'Eksekutif', 'Gambir – Cilacap'],
    ['Purwojaya', 'Eksekutif', 'Cilacap – Gambir'],
    ['Kertajaya', 'Ekonomi', 'Pasarsenen – Surabaya Pasarturi'],
    ['Kertajaya', 'Ekonomi', 'Surabaya Pasarturi – Pasarsenen'],
    ['Jayakarta', 'Ekonomi', 'Pasarsenen – Surabaya Gubeng'],
    ['Jayakarta', 'Ekonomi', 'Surabaya Gubeng – Pasarsenen'],
    ['Matarmaja', 'Ekonomi', 'Pasarsenen – Malang'],
    ['Matarmaja', 'Ekonomi', 'Malang – Pasarsenen'],
    ['Kahuripan', 'Ekonomi', 'Kiaracondong – Blitar'],
    ['Kahuripan', 'Ekonomi', 'Blitar – Kiaracondong'],
    ['Pasundan', 'Ekonomi', 'Kiaracondong – Surabaya Gubeng'],
    ['Pasundan', 'Ekonomi', 'Surabaya Gubeng – Kiaracondong'],
    ['Sri Tanjung', 'Ekonomi', 'Lempuyangan – Banyuwangi'],
    ['Sri Tanjung', 'Ekonomi', 'Banyuwangi – Lempuyangan'],
    ['Serayu', 'Ekonomi', 'Pasarsenen – Kroya'],
    ['Serayu', 'Ekonomi', 'Kroya – Pasarsenen'],
    ['Bengawan', 'Ekonomi', 'Pasarsenen – Purwosari'],
    ['Bengawan', 'Ekonomi', 'Purwosari – Pasarsenen'],
    ['Progo', 'Ekonomi', 'Pasarsenen – Lempuyangan'],
    ['Progo', 'Ekonomi', 'Lempuyangan – Pasarsenen'],
    ['Airlangga', 'Ekonomi', 'Pasarsenen – Surabaya Pasarturi'],
  ];
  ka.forEach(function (item, index) {
    const nomor = String(index + 1);
    const inisial = item[0].split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase(); }).join('').slice(0, 3);
    rows.push([uuid_(), inisial + '-' + pad_(nomor, 3), item[0], nomor, 'ka', item[2], item[1], true, stamp]);
  });

  // 13 titik parkir
  const parkir = [
    ['Parkir Stasiun Tawang', 'Area depan Stasiun Tawang'],
    ['Parkir Stasiun Poncol', 'Area depan Stasiun Poncol'],
    ['Parkir Utara Tawang', 'Sisi utara jalur rel Stasiun Tawang'],
    ['Parkir Selatan Tawang', 'Sisi selatan Stasiun Tawang'],
    ['Parkir Timur Poncol', 'Sisi timur Stasiun Poncol'],
    ['Parkir Barat Poncol', 'Sisi barat Stasiun Poncol'],
    ['Parkir Motor Tawang', 'Zona roda dua Tawang'],
    ['Parkir Motor Poncol', 'Zona roda dua Poncol'],
    ['Parkir Mobil Tawang', 'Zona roda empat Tawang'],
    ['Parkir Mobil Poncol', 'Zona roda empat Poncol'],
    ['Parkir VIP Tawang', 'Zona VIP & drop off Tawang'],
    ['Parkir Karyawan', 'Area parkir pegawai DAOP 4'],
    ['Parkir Gudang & Kargo', 'Area gudang/kargo Stasiun Tawang'],
  ];
  parkir.forEach(function (item, index) {
    const kode = 'P' + pad_(index + 1, 2);
    rows.push([uuid_(), 'PRK-' + kode, item[0], kode, 'parkir', item[1], 'Jasa Parkir', true, stamp]);
  });

  // Loko Cafe & Booth Loko
  rows.push([uuid_(), 'CFE-TWG', 'Loko Cafe Tawang', 'CF01', 'cafe', 'Stasiun Tawang, Semarang', 'Cafe & Resto', true, stamp]);
  rows.push([uuid_(), 'CFE-PCL', 'Loko Cafe Poncol', 'CF02', 'cafe', 'Stasiun Poncol, Semarang', 'Cafe & Resto', true, stamp]);
  rows.push([uuid_(), 'BTH-LKO', 'Booth Loko', 'BH01', 'booth', 'Area peron Stasiun Tawang', 'Retail / Booth', true, stamp]);

  sheet.getRange(2, 1, rows.length, HEADERS.MasterUnit.length).setValues(rows);
  return { ok: true, inserted: rows.length };
}

/** ====================== HELPER DATA ====================== */
function readAll_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (header, index) { obj[header] = row[index]; });
    return obj;
  });
}

function appendRow_(name, data) {
  const sheet = getSheet_(name);
  const headers = HEADERS[name];
  const row = headers.map(function (header) {
    return data[header] === undefined || data[header] === null ? '' : data[header];
  });
  sheet.appendRow(row);
  return data;
}

function updateRowById_(name, id, patch) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColumn = headers.indexOf('id');
  for (let r = 1; r < values.length; r += 1) {
    if (String(values[r][idColumn]) === String(id)) {
      Object.keys(patch).forEach(function (key) {
        const column = headers.indexOf(key);
        if (column >= 0) sheet.getRange(r + 1, column + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  return false;
}

/** ====================== MODUL 1: MASTER UNIT ====================== */
function getMasterUnits(kategori) {
  const rows = readAll_(CFG.SHEET.UNIT).filter(function (row) {
    return !kategori || row.kategori === kategori;
  });
  rows.sort(function (a, b) {
    const order = { ka: 1, parkir: 2, cafe: 3, booth: 4 };
    const byKategori = (order[a.kategori] || 9) - (order[b.kategori] || 9);
    if (byKategori !== 0) return byKategori;
    return Number(a.nomor_unit) - Number(b.nomor_unit) || String(a.nomor_unit).localeCompare(String(b.nomor_unit));
  });
  return rows;
}

function simpanUnit(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!payload.nama_unit || !payload.nomor_unit) {
      return { ok: false, message: 'Nama & nomor/kode unit wajib diisi' };
    }
    const kategori = KATEGORI[payload.kategori] ? payload.kategori : 'ka';
    if (payload.id) {
      updateRowById_(CFG.SHEET.UNIT, payload.id, {
        kode_unit: payload.kode_unit, nama_unit: payload.nama_unit, nomor_unit: payload.nomor_unit,
        kategori: kategori, relasi: payload.relasi || '', layanan: payload.layanan || '',
        status_aktif: payload.status_aktif !== false,
      });
      return { ok: true, message: 'Unit diperbarui', id: payload.id };
    }
    const unit = {
      id: uuid_(),
      kode_unit: payload.kode_unit || (kategori + '-' + payload.nomor_unit),
      nama_unit: payload.nama_unit,
      nomor_unit: payload.nomor_unit,
      kategori: kategori,
      relasi: payload.relasi || '',
      layanan: payload.layanan || '',
      status_aktif: true,
      created_at: nowIso_(),
    };
    appendRow_(CFG.SHEET.UNIT, unit);
    return { ok: true, message: 'Unit ditambahkan', data: unit };
  } finally {
    lock.releaseLock();
  }
}

/** ====================== MODUL 2: INPUT SETORAN ====================== */
function simpanSetoran(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const tanggal = String(payload.tanggal_dinas || '');
    const tunai = Math.max(0, Math.round(Number(payload.tunai) || 0));
    const nonTunai = Math.max(0, Math.round(Number(payload.non_tunai) || 0));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { ok: false, message: 'Tanggal dinas tidak valid' };
    if (!payload.unit_id) return { ok: false, message: 'Pilih unit setoran (KA/parkir/cafe/booth)' };
    if (!String(payload.petugas || '').trim()) return { ok: false, message: 'Nama petugas penyetor wajib diisi' };
    if (tunai + nonTunai <= 0) return { ok: false, message: 'Nominal setoran harus lebih dari nol' };

    const units = readAll_(CFG.SHEET.UNIT);
    const unit = units.filter(function (u) { return String(u.id) === String(payload.unit_id); })[0];
    if (!unit) return { ok: false, message: 'Unit setoran tidak ditemukan' };
    if (unit.status_aktif === false || String(unit.status_aktif).toLowerCase() === 'false') {
      return { ok: false, message: 'Unit ' + unit.nama_unit + ' sedang nonaktif' };
    }

    const existing = readAll_(CFG.SHEET.SETORAN);
    const duplikat = existing.filter(function (row) {
      return String(row.unit_id) === String(payload.unit_id) && String(row.tanggal_dinas).slice(0, 10) === tanggal;
    });
    if (duplikat.length > 0) {
      return { ok: false, message: 'Setoran ' + unit.nama_unit + ' pada tanggal tersebut sudah ada (kode ' + duplikat[0].kode_setoran + ')' };
    }

    // Simpan bukti (base64 / data URL) ke Drive
    let buktiUrl = '';
    let buktiNama = payload.bukti_nama || '';
    if (payload.bukti_base64) {
      try {
        buktiUrl = simpanBuktiKeDrive_(payload.bukti_base64, buktiNama || ('bukti-' + unit.nomor_unit + '-' + tanggal + '.jpg'));
      } catch (err) {
        buktiUrl = '';
      }
    }

    const nomor = pad_(existing.filter(function (row) {
      return String(row.tanggal_dinas).slice(0, 10) === tanggal;
    }).length + 1, 3);

    const row = {
      id: uuid_(),
      kode_setoran: 'STR-' + tanggal.replace(/-/g, '') + '-' + nomor,
      tanggal_dinas: tanggal,
      unit_id: unit.id,
      shift: payload.shift || 'Pagi',
      petugas: String(payload.petugas).trim(),
      tunai: tunai,
      non_tunai: nonTunai,
      total: tunai + nonTunai,
      bukti_nama: buktiNama,
      bukti_url: buktiUrl,
      status: 'menunggu',
      jenis_selisih: '',
      nominal_selisih: 0,
      catatan_verifikator: '',
      verifikator: '',
      verified_at: '',
      dibuat_oleh: payload.dibuat_oleh || String(payload.petugas).trim(),
      created_at: nowIso_(),
    };
    appendRow_(CFG.SHEET.SETORAN, row);
    logAksi_(row.id, 'dibuat', '-', 'menunggu', row.petugas, 'Setoran baru diinput');
    return { ok: true, message: 'Setoran tersimpan (Menunggu Verifikasi)', data: row };
  } finally {
    lock.releaseLock();
  }
}

function getSetoran(filter) {
  filter = filter || {};
  const units = {};
  readAll_(CFG.SHEET.UNIT).forEach(function (unit) { units[String(unit.id)] = unit; });

  return readAll_(CFG.SHEET.SETORAN)
    .map(function (row) {
      const unit = units[String(row.unit_id)] || {};
      row.nama_unit = unit.nama_unit || '(unit terhapus)';
      row.nomor_unit = unit.nomor_unit || '';
      row.kategori = unit.kategori || 'ka';
      row.layanan = unit.layanan || '';
      row.relasi = unit.relasi || '';
      return row;
    })
    .filter(function (row) {
      if (filter.dari && String(row.tanggal_dinas).slice(0, 10) < filter.dari) return false;
      if (filter.sampai && String(row.tanggal_dinas).slice(0, 10) > filter.sampai) return false;
      if (filter.unit_id && String(row.unit_id) !== String(filter.unit_id)) return false;
      if (filter.kategori && row.kategori !== filter.kategori) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (filter.verifikator) return false;
      return true;
    })
    .sort(function (a, b) {
      return String(b.tanggal_dinas).localeCompare(String(a.tanggal_dinas));
    });
}

function getKalender(bulan) {
  const rows = getSetoran({ dari: bulan + '-01', sampai: bulan + '-31' });
  const days = {};
  rows.forEach(function (row) {
    const tanggal = String(row.tanggal_dinas).slice(0, 10);
    const day = days[tanggal] || (days[tanggal] = { tanggal: tanggal, jumlah: 0, total: 0, terverifikasi: 0, menunggu: 0, selisih: 0 });
    day.jumlah += 1;
    day.total += Number(row.total) || 0;
    if (row.status === 'terverifikasi') day.terverifikasi += 1;
    if (row.status === 'menunggu') day.menunggu += 1;
    if (row.status === 'selisih') day.selisih += 1;
  });
  const totalUnit = getMasterUnits('').filter(function (unit) { return unit.status_aktif !== false; }).length;
  return { ok: true, bulan: bulan, days: days, totalUnit: totalUnit, rows: rows };
}

/** Simpan foto bukti (data URL base64) ke Google Drive. */
function simpanBuktiKeDrive_(base64, filename) {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('DRIVE_FOLDER_ID');
  let folder;
  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (err) { folder = null; }
  }
  if (!folder) {
    folder = DriveApp.createFolder(CFG.DRIVE_FOLDER);
    props.setProperty('DRIVE_FOLDER_ID', folder.getId());
  }
  const parts = String(base64).split(',');
  const meta = parts.length > 1 ? parts[0] : 'data:image/jpeg;base64';
  const data = parts.length > 1 ? parts[1] : parts[0];
  const tipe = meta.replace('data:', '').replace(';base64', '') || 'image/jpeg';
  const blob = Utilities.newBlob(Utilities.base64Decode(data), tipe, filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/** ====================== MODUL 3: VERIFIKASI ====================== */
function verifikasiSetoran(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const id = payload.id;
    const aktor = String(payload.verifikator || '').trim();
    if (!aktor) return { ok: false, message: 'Nama Kasir (verifikator) wajib diisi' };

    const rows = readAll_(CFG.SHEET.SETORAN);
    const current = rows.filter(function (row) { return String(row.id) === String(id); })[0];
    if (!current) return { ok: false, message: 'Setoran tidak ditemukan' };
    if (current.status === 'terverifikasi') return { ok: false, message: 'Setoran sudah terverifikasi' };

    if (payload.aksi === 'setujui') {
      updateRowById_(CFG.SHEET.SETORAN, id, {
        status: 'terverifikasi',
        verifikator: aktor,
        verified_at: nowIso_(),
        jenis_selisih: '',
        nominal_selisih: 0,
        catatan_verifikator: payload.catatan || 'Nominal dan bukti setor sesuai.',
      });
      logAksi_(id, 'setujui', current.status, 'terverifikasi', aktor, payload.catatan || '');
      return { ok: true, message: 'Setoran terverifikasi' };
    }

    if (payload.aksi === 'revisi') {
      if (payload.jenis_selisih !== 'kurang' && payload.jenis_selisih !== 'lebih') {
        return { ok: false, message: 'Jenis selisih harus kurang atau lebih' };
      }
      const nominal = Math.round(Number(payload.nominal_selisih) || 0);
      if (nominal <= 0) return { ok: false, message: 'Nominal selisih harus lebih dari nol' };
      if (String(payload.catatan || '').trim().length < 5) return { ok: false, message: 'Catatan revisi wajib diisi' };

      updateRowById_(CFG.SHEET.SETORAN, id, {
        status: 'selisih',
        jenis_selisih: payload.jenis_selisih,
        nominal_selisih: nominal,
        catatan_verifikator: payload.catatan,
        verifikator: aktor,
        verified_at: nowIso_(),
      });
      logAksi_(id, 'revisi', current.status, 'selisih', aktor, payload.jenis_selisih + ' ' + nominal + ' — ' + payload.catatan);
      return { ok: true, message: 'Setoran dikembalikan untuk revisi' };
    }

    return { ok: false, message: 'Aksi verifikasi tidak dikenal' };
  } finally {
    lock.releaseLock();
  }
}

function verifikasiMassal(payload) {
  const ids = (payload.ids || []).map(String);
  const aktor = String(payload.verifikator || '').trim();
  if (!aktor) return { ok: false, message: 'Nama Kasir wajib diisi' };
  if (ids.length === 0) return { ok: false, message: 'Pilih minimal satu setoran' };

  const results = ids.map(function (id) {
    return verifikasiSetoran({ id: id, aksi: 'setujui', verifikator: aktor, catatan: payload.catatan || 'Verifikasi massal' });
  });
  const sukses = results.filter(function (r) { return r.ok; }).length;
  return { ok: true, count: sukses, message: sukses + ' setoran berhasil diverifikasi' };
}

function setujuiSemua(tanggal, verifikator) {
  const rows = getSetoran({ dari: tanggal, sampai: tanggal, status: 'menunggu' });
  return verifikasiMassal({ ids: rows.map(function (row) { return row.id; }), verifikator: verifikator });
}

function logAksi_(setoranId, aksi, sebelum, sesudah, aktor, catatan) {
  appendRow_(CFG.SHEET.LOG, {
    id: uuid_(), setoran_id: setoranId, aksi: aksi,
    status_sebelum: sebelum, status_sesudah: sesudah,
    aktor: aktor, catatan: catatan, created_at: nowIso_(),
  });
}

/** ====================== MODUL 4: SLIP SETORAN ====================== */
function buatSlip(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const dicetakOleh = String(payload.dicetak_oleh || 'Kasir').trim();
    let rows = [];
    let periodeMulai = payload.dari || todayIso_();
    let periodeSelesai = payload.sampai || todayIso_();
    let unitId = payload.unit_id || '';

    if (payload.jenis === 'harian') {
      periodeMulai = payload.tanggal;
      periodeSelesai = payload.tanggal;
      rows = getSetoran({ dari: payload.tanggal, sampai: payload.tanggal, status: 'terverifikasi' });
    } else if (payload.jenis === 'per_unit' || payload.jenis === 'per_ka') {
      rows = getSetoran({ dari: payload.dari, sampai: payload.sampai, unit_id: payload.unit_id, status: 'terverifikasi' });
    } else {
      const ids = (payload.ids || []).map(String);
      const semua = getSetoran({ status: 'terverifikasi' });
      rows = semua.filter(function (row) { return ids.indexOf(String(row.id)) >= 0; });
      if (rows.length !== ids.length) {
        return { ok: false, message: 'Sebagian data tidak berstatus terverifikasi' };
      }
      rows.sort(function (a, b) { return String(a.tanggal_dinas).localeCompare(String(b.tanggal_dinas)); });
      if (rows.length > 0) {
        periodeMulai = String(rows[0].tanggal_dinas).slice(0, 10);
        periodeSelesai = String(rows[rows.length - 1].tanggal_dinas).slice(0, 10);
      }
    }

    if (rows.length === 0) {
      return { ok: false, message: 'Tidak ada setoran TERVERIFIKASI pada parameter tersebut' };
    }

    const kategoriUnik = {};
    rows.forEach(function (row) { kategoriUnik[row.kategori] = true; });
    const daftarKategori = Object.keys(kategoriUnik);
    const kategori = daftarKategori.length === 1 ? daftarKategori[0] : 'campuran';
    const prefixKategori = kategori === 'campuran' ? 'ALL' : KATEGORI[kategori].prefix;

    const totalTunai = rows.reduce(function (sum, row) { return sum + (Number(row.tunai) || 0); }, 0);
    const totalNonTunai = rows.reduce(function (sum, row) { return sum + (Number(row.non_tunai) || 0); }, 0);
    const grandTotal = totalTunai + totalNonTunai;

    const slips = readAll_(CFG.SHEET.SLIP);
    const kodeTanggal = todayIso_().replace(/-/g, '');
    const urut = pads_(slips.filter(function (row) {
      return String(row.nomor_referensi).indexOf('SLP/' + prefixKategori + '/' + kodeTanggal) === 0;
    }).length + 1);
    const nomorReferensi = 'SLP/' + prefixKategori + '/' + kodeTanggal + '/' + urut;
    const token = Utilities.getUuid().slice(0, 18);

    const pengaturan = bacaPengaturan_();
    const snapshot = {
      unit: pengaturan,
      rows: rows.map(function (row) {
        return {
          id: row.id, tanggal_dinas: String(row.tanggal_dinas).slice(0, 10),
          nomor_unit: row.nomor_unit, nama_unit: row.nama_unit, kategori: row.kategori,
          layanan: row.layanan, relasi: row.relasi, shift: row.shift, petugas: row.petugas,
          tunai: Number(row.tunai) || 0, non_tunai: Number(row.non_tunai) || 0, total: Number(row.total) || 0,
          verifikator: row.verifikator, verified_at: row.verified_at,
        };
      }),
      totalTunai: totalTunai,
      totalNonTunai: totalNonTunai,
      grandTotal: grandTotal,
      terbilang: terbilang_(grandTotal),
      jumlah: rows.length,
    };

    const slip = {
      id: uuid_(), nomor_referensi: nomorReferensi, token: token, jenis: payload.jenis,
      periode_mulai: periodeMulai, periode_selesai: periodeSelesai,
      unit_id: unitId, kategori: kategori, jumlah_transaksi: rows.length,
      grand_total: grandTotal, terbilang: snapshot.terbilang, dicetak_oleh: dicetakOleh,
      snapshot: JSON.stringify(snapshot), created_at: nowIso_(),
    };
    appendRow_(CFG.SHEET.SLIP, slip);
    let webAppUrl = '';
    try { webAppUrl = ScriptApp.getService().getUrl() || ''; } catch (err) { webAppUrl = ''; }
    return { ok: true, message: 'Slip ' + nomorReferensi + ' diterbitkan', data: slip, snapshot: snapshot, web_app_url: webAppUrl };
  } finally {
    lock.releaseLock();
  }
}

function getSlip(tokenValue) {
  if (!tokenValue) return null;
  const slip = readAll_(CFG.SHEET.SLIP).filter(function (row) {
    return String(row.token) === String(tokenValue);
  })[0];
  if (!slip) return null;
  slip.snapshot = JSON.parse(slip.snapshot || '{}');
  slip.grand_total = Number(slip.grand_total) || 0;
  return slip;
}

function bacaPengaturan_() {
  const rows = readAll_(CFG.SHEET.PENGATURAN);
  const map = {};
  rows.forEach(function (row) { map[row.key] = row.value; });
  return {
    namaUnit: map.nama_unit || 'PT Kereta Api Indonesia (Persero)',
    alamatUnit: map.alamat_unit || '',
    namaKepalaUnit: map.nama_kepala_unit || '',
    namaVerifikator: map.nama_verifikator || '',
  };
}

/** ====================== REMINDER (TRIGGER HARIAN) ====================== */
function reminderBelumSetor() {
  const tanggal = todayIso_();
  const units = getMasterUnits('').filter(function (unit) { return unit.status_aktif !== false; });
  const sudah = {};
  getSetoran({ dari: tanggal, sampai: tanggal }).forEach(function (row) { sudah[String(row.unit_id)] = true; });
  const belum = units.filter(function (unit) { return !sudah[String(unit.id)]; });

  const email = Session.getEffectiveUser().getEmail();
  if (belum.length > 0 && email) {
    MailApp.sendEmail(email, 'SIVERA — ' + belum.length + ' unit belum setor (' + tanggal + ')',
      'Unit berikut belum mencatat setoran:\n\n' +
      belum.map(function (unit) { return '- [' + KATEGORI[unit.kategori].label + '] ' + unit.nama_unit + ' (' + unit.nomor_unit + ')'; }).join('\n'));
  }
  return { tanggal: tanggal, belum: belum.length, total: units.length };
}

function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'reminderBelumSetor') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('reminderBelumSetor').timeBased().atHour(21).everyDays(1).create();
}

/** ====================== UTIL ====================== */
function terbilang_(n) {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  function inner(x) {
    x = Math.floor(Math.abs(x));
    if (x < 12) return satuan[x];
    if (x < 20) return inner(x - 10) + ' Belas';
    if (x < 100) return inner(Math.floor(x / 10)) + ' Puluh ' + inner(x % 10);
    if (x < 200) return 'Seratus ' + inner(x - 100);
    if (x < 1000) return inner(Math.floor(x / 100)) + ' Ratus ' + inner(x % 100);
    if (x < 2000) return 'Seribu ' + inner(x - 1000);
    if (x < 1000000) return inner(Math.floor(x / 1000)) + ' Ribu ' + inner(x % 1000);
    if (x < 1000000000) return inner(Math.floor(x / 1000000)) + ' Juta ' + inner(x % 1000000);
    return inner(Math.floor(x / 1000000000)) + ' Miliar ' + inner(x % 1000000000);
  }
  const value = Math.round(Number(n) || 0);
  if (value === 0) return 'Nol Rupiah';
  return (inner(value).replace(/\s+/g, ' ').trim() + ' Rupiah');
}

function uuid_() {
  return Utilities.getUuid();
}

function pad_(value, length) {
  let text = String(value);
  while (text.length < length) text = '0' + text;
  return text;
}

function pads_(value) {
  return pad_(value, 3);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), CFG.TZ, "yyyy-MM-dd'T'HH:mm:ss");
}

function todayIso_() {
  return Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd');
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** API dipanggil oleh front-end (google.script.run) */
function getBootstrap(role, nama) {
  return {
    ok: true,
    pengguna: { role: role || 'kasir', nama: nama || 'Kasir' },
    units: getMasterUnits(''),
    pengaturan: bacaPengaturan_(),
    setoran: getSetoran({}).slice(0, 500),
    kalender: getKalender(todayIso_().slice(0, 7)),
  };
}
