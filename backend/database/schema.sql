-- Dokter Notebook — struktur database MySQL / MariaDB
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS stock_movements, payments, service_logs, service_items, services, spareparts, customers, settings, users;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('OWNER','ADMIN','TEKNISI') NOT NULL DEFAULT 'ADMIN',
  phone VARCHAR(30) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  `key` VARCHAR(50) NOT NULL PRIMARY KEY,
  `value` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL UNIQUE,
  address VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spareparts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Lainnya',
  buy_price INT UNSIGNED NOT NULL DEFAULT 0,
  sell_price INT UNSIGNED NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT UNSIGNED NOT NULL DEFAULT 1,
  location VARCHAR(50) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  KEY spareparts_category_index (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(20) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  device_type VARCHAR(30) NOT NULL DEFAULT 'Laptop',
  device_brand VARCHAR(50) NOT NULL,
  device_model VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100) NULL,
  device_password VARCHAR(100) NULL,
  complaint TEXT NOT NULL,
  accessories VARCHAR(255) NULL,
  physical_condition VARCHAR(255) NULL,
  status ENUM('DITERIMA','DIAGNOSA','MENUNGGU_KONFIRMASI','MENUNGGU_SPAREPART','DIKERJAKAN','SELESAI','DIAMBIL','BATAL') NOT NULL DEFAULT 'DITERIMA',
  technician_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NULL,
  diagnosis TEXT NULL,
  estimated_cost INT UNSIGNED NOT NULL DEFAULT 0,
  estimated_done DATE NULL,
  discount INT UNSIGNED NOT NULL DEFAULT 0,
  warranty_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  notes VARCHAR(255) NULL,
  is_warranty_claim TINYINT(1) NOT NULL DEFAULT 0,
  parent_id BIGINT UNSIGNED NULL,
  received_at DATETIME NOT NULL,
  finished_at DATETIME NULL,
  picked_up_at DATETIME NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  KEY services_status_index (status),
  KEY services_serial_number_index (serial_number),
  KEY services_received_at_index (received_at),
  KEY services_finished_at_index (finished_at),
  CONSTRAINT services_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT services_technician_fk FOREIGN KEY (technician_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT services_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT services_parent_fk FOREIGN KEY (parent_id) REFERENCES services (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  type ENUM('JASA','PART') NOT NULL DEFAULT 'JASA',
  sparepart_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NOT NULL,
  qty INT UNSIGNED NOT NULL DEFAULT 1,
  price INT UNSIGNED NOT NULL,
  cost_price INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  CONSTRAINT service_items_service_fk FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
  CONSTRAINT service_items_sparepart_fk FOREIGN KEY (sparepart_id) REFERENCES spareparts (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(30) NOT NULL,
  note VARCHAR(255) NULL,
  user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT service_logs_service_fk FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
  CONSTRAINT service_logs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  amount INT UNSIGNED NOT NULL,
  method ENUM('TUNAI','TRANSFER','QRIS','DEBIT') NOT NULL DEFAULT 'TUNAI',
  type ENUM('DP','PELUNASAN','REFUND') NOT NULL DEFAULT 'DP',
  note VARCHAR(255) NULL,
  user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  KEY payments_created_at_index (created_at),
  CONSTRAINT payments_service_fk FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE,
  CONSTRAINT payments_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sparepart_id BIGINT UNSIGNED NOT NULL,
  qty INT NOT NULL,
  type ENUM('MASUK','KELUAR','PENYESUAIAN') NOT NULL,
  note VARCHAR(255) NULL,
  service_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT stock_movements_sparepart_fk FOREIGN KEY (sparepart_id) REFERENCES spareparts (id) ON DELETE CASCADE,
  CONSTRAINT stock_movements_service_fk FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
