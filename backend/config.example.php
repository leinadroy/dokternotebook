<?php
/**
 * KONFIGURASI DOKTER NOTEBOOK
 * Salin file ini menjadi config.php lalu isi data database dari cPanel > MySQL Databases.
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'namauser_dokternotebook',   // nama database
        'user' => 'namauser_dokter',           // user database
        'pass' => 'isi_password_database',     // password user database
    ],

    // Zona waktu toko
    'timezone' => 'Asia/Jakarta',

    // true = tampilkan detail error (HANYA saat memperbaiki masalah, setelah itu kembalikan ke false)
    'debug' => false,
];
