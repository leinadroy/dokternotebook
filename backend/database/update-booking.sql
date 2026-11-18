-- ============================================================
--  UPDATE: Modul Booking Servis
--  Import file ini SEKALI lewat phpMyAdmin pada database yang sudah berjalan.
--  Aman: tidak menghapus / mengubah data yang sudah ada.
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(255) NULL,
  device_brand VARCHAR(50) NOT NULL,
  device_model VARCHAR(100) NULL,
  problem_type VARCHAR(50) NOT NULL,
  complaint TEXT NOT NULL,
  service_method ENUM('DATANG','JEMPUT') NOT NULL DEFAULT 'DATANG',
  address VARCHAR(500) NULL,
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(30) NOT NULL,
  status ENUM('BARU','DIKONFIRMASI','DITERIMA','BATAL') NOT NULL DEFAULT 'BARU',
  staff_note VARCHAR(500) NULL,
  service_id BIGINT UNSIGNED NULL,
  handled_by BIGINT UNSIGNED NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  KEY bookings_status_index (status),
  KEY bookings_date_index (preferred_date),
  KEY bookings_phone_index (phone),
  KEY bookings_ip_created_index (ip, created_at),
  CONSTRAINT bookings_service_fk FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL,
  CONSTRAINT bookings_handled_by_fk FOREIGN KEY (handled_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('booking_enabled', '1'),
  ('booking_slots', '09.00 - 12.00,12.00 - 15.00,15.00 - 18.00'),
  ('booking_closed_days', '0'),
  ('booking_pickup', '1'),
  ('booking_intro', 'Laptop bermasalah? Booking jadwal servis sekarang, tanpa antre. Pengecekan awal gratis dan estimasi biaya jelas sebelum dikerjakan.'),
  ('booking_wa_template', 'Halo {nama}, booking servis {kode} di {toko} sudah *dikonfirmasi* untuk {tanggal}, jam {jam} ({metode}). {catatan}\nCek status booking: {link}');
