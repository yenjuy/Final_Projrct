# Seru Sewa Ruangan - Room Rental Management System

Sistem manajemen penyewaan ruangan yang lengkap dengan dashboard admin dan booking interface untuk user. Built with vanilla PHP, JavaScript, dan MySQL.

## 🎯 Project Overview

**Apa ini?** Sistem untuk mengelola penyewaan ruangan (meeting room, office space, dll) dengan fitur:
- User bisa lihat ruangan & booking online
- Admin bisa manage ruangan, booking, dan customer
- Support untuk guest user (booking tanpa akun)
- Multi payment methods (cash, credit, bank, e-wallet)

**Tech Stack:**
- **Backend**: PHP 7+ (no framework)
- **Database**: MySQL dengan 4 tabel utama
- **Frontend**: HTML5, CSS3, Vanilla JavaScript ES6+
- **Authentication**: Session-based dengan bcrypt password hashing

## 📊 Database Schema

```sql
-- Database: seru_db (UTF-8, Unicode)

-- 1. users (Data pelanggan yang punya akun)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,      -- ID user
    name VARCHAR(100) NOT NULL,             -- Nama lengkap
    no_telp VARCHAR(20),                    -- Nomor telepon
    email VARCHAR(100) UNIQUE,              -- Email (unique)
    password VARCHAR(255) NOT NULL          -- Password (hashed dengan bcrypt)
);

-- 2. admins (Data admin terpisah dari users)
CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,      -- ID admin
    admin_name VARCHAR(100) NOT NULL,       -- Nama admin
    password VARCHAR(255) NOT NULL          -- Password admin (hashed)
);

-- 3. rooms (Master data ruangan)
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,      -- ID ruangan
    room_name VARCHAR(100) NOT NULL,        -- Nama ruangan (Meeting Room, dll)
    price INT NOT NULL,                     -- Harga per hari
    description VARCHAR(255),               -- Deskripsi ruangan
    status VARCHAR(20) DEFAULT 'available'  -- Status: available/unavailable
);

-- 4. booking (Transaksi penyewaan - TABEL PENTING!)
CREATE TABLE booking (
    id INT AUTO_INCREMENT PRIMARY KEY,                  -- ID booking
    user_id INT,                                        -- ID user (bisa NULL untuk guest)
    room_id INT,                                        -- ID ruangan yang disewa
    name VARCHAR(100),                                  -- Nama penyewa (untuk guest booking)
    email VARCHAR(100),                                 -- Email penyewa
    phone_number VARCHAR(20),                           -- Nomor telepon
    start_date DATE,                                    -- Tanggal mulai sewa
    end_date DATE,                                      -- Tanggal selesai sewa
    price INT,                                          -- Total harga booking
    payment ENUM('cash', 'credit', 'bank', 'ewallet'), -- Metode pembayaran
    status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed', -- Status booking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,     -- Waktu booking dibuat

    -- Foreign keys (relasi ke tabel users dan rooms)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);
```

**Relasi Database:**
- `users` ← `booking` (satu user bisa banyak booking)
- `rooms` ← `booking` (satu ruangan bisa banyak booking)
- `admin` (terpisah, tidak ada relasi langsung)

## 📁 Struktur Folder & File

```
Final_Project/
├── 📁 api/                      # Backend API endpoints
│   ├── auth.php                 # Login/Register user & admin
│   ├── bookings.php             # CRUD booking (create, read, update, delete)
│   ├── dashboard.php            # Data untuk dashboard admin (stats, customers, rooms)
│   ├── rooms.php                # CRUD room management
│   └── config/
│       └── Database.php         # Koneksi database (singleton pattern)
│
├── 📁 admin/                    # Halaman admin
│   ├── css/
│   │   ├── admin.css            # Styling login & admin pages
│   │   └── dashboard.css        # Styling dashboard (responsive, cards, modals)
│   ├── js/
│   │   ├── admin.js             # Login logic admin
│   │   └── dashboard.js        # Dashboard functionality (stats, tables, modals)
│   ├── dashboard.html          # Main admin dashboard
│   └── login.html              # Login admin
│
├── 📁 pages/                    # Halaman publik untuk user
│   ├── Home.html               # Landing page (list ruangan)
│   ├── Booking.html            # Interface booking ruangan
│   ├── Login.html              # Login user
│   └── Register.html           # Register user baru
│
├── 📁 css/                     # Styles untuk publik pages
│   ├── home.css                # Styling home page (grid rooms, cards)
│   ├── booking.css             # Styling booking interface (multi-step form)
│   ├── login.css               # Styling login page
│   └── Register.css           # Styling register page
│
├── 📁 js/                      # JavaScript untuk publik pages
│   ├── api.js                  # API service class (handle HTTP requests)
│   ├── booking.js              # Booking logic (validation, form handling)
│   ├── home.js                 # Home page interactions
│   ├── login.js                # Login functionality
│   └── register.js             # Register functionality
│
├── 📁 assets/                   # Static files
│   └── img/                    # Images untuk rooms (meetingroom.jpg, dll)
│
├── index.html                  # Entry point (redirect ke Home.html)
├── create_tables.sql           # Database schema setup
└── README.md                   # Readme
```

## 🔄 Alur Sistem (System Flow)

### User Flow (Public):
1. **Browse** → User lihat daftar ruangan di Home.html
2. **Select Room** → Klik ruangan, lihat detail & harga
3. **Booking** → 3-step process:
   - Step 1: Input data diri (nama, email, phone)
   - Step 2: Pilih tanggal & metode pembayaran
   - Step 3: Konfirmasi & dapat booking ID
4. **Login/Register** (optional) → Untuk manage booking
5. **Manage Booking** → View, cancel booking dari profile

### Admin Flow:
1. **Login Admin** → Authentication terpisah dari user
2. **Dashboard** → Lihat stats (total booking, rooms, revenue)
3. **Manage Rooms** → Add/edit/delete ruangan
4. **Manage Bookings** → Update status, view booking details
5. **Manage Customers** → Lihat data customer, delete booking records

### API Flow:
- **Frontend JS** → **PHP API** → **MySQL Database**

## 🚀 Quick Start DB

### 1. Setup Database
-Buat DB nya dengan nama `seru_db`
-Copy Paste isi file `create_tables.sql` (Copas di Mysql lalu Execute)

### 2. Konfigurasi Koneksi
- Edit `api/config/Database.php` jika perlu (default: localhost, root, no password)

### 3. Test Features
- **Admin Login**: Default harus dibuat manual di tabel `admins`
- **User Register**: Buka `pages/Register.html`
- **Browse Rooms**: Buka `index.html` → redirect ke `pages/Home.html`

## 📝 Important Notes untuk Developer

### Security Implementation:
- ✅ **SQL Injection**: Semua query pakai prepared statements
- ✅ **Password Security**: bcrypt hashing dengan strength validation
- ✅ **Session Management**: Secure session handling
- ✅ **Input Validation**: Client & server-side validation

### Business Logic:
- **Room Status**: `available` vs `unavailable` affects booking availability
- **Booking Status**: `confirmed` vs `cancelled` untuk status transaksi
- **Payment Methods**: ENUM('cash', 'credit', 'bank', 'ewallet')

## 💡 Tips

### Kalau mau update features:
1. **Cek API endpoints** di folder `/api/` dulu
2. **Lihat database schema** di `create_tables.sql`
3. **Follow pattern** yang sudah ada (prepared statements, error handling)
4. **Test di local** sebelum production
5. **Backup database** sebelum schema changes

---

**Created By Yeni Juwita**