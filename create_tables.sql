-- Create database
CREATE DATABASE IF NOT EXISTS seru_db 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE seru_db;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    no_telp VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Table: admins
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'available'
);

-- Table: booking
CREATE TABLE IF NOT EXISTS booking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    room_id INT,
    name VARCHAR(100),
    email VARCHAR(100),
    phone_number VARCHAR(20),
    start_date DATE,
    end_date DATE,
    price INT,
    payment ENUM('cash', 'credit', 'bank', 'ewallet') NOT NULL,
    status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY fk_booking_user (user_id),
    KEY fk_booking_room (room_id),
    CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Insert default admin
INSERT IGNORE INTO admins (admin_name, password)
VALUES ('admin', '$2a$12$X.blHvQ0.rH3hXgBkYk8Buzwv3S18dIEx081SjiOXuSGvqR/OAIu2'); -- Password = admin123

-- Dummy Data: users
INSERT INTO users (name, no_telp, email, password) VALUES
('John Doe', '081234567890', 'john.doe@example.com', '$2a$12$F/1uSJ0DTAks/RbAa/p7xe/7r/CEegsYBr54fCIrhy2.VYcZdkCUW'); -- password123

-- Dummy Data: rooms
INSERT INTO rooms (room_name, price, description, status) VALUES
('Deluxe Room', 750000, 'Spacious room with king-size bed and balcony view.', 'available'),
('Standard Room', 500000, 'Comfortable room with queen-size bed.', 'unavailable'),
('Suite Room', 1200000, 'Luxury suite with living area and bathtub.', 'available'),
('Single Room', 350000, 'Compact room for solo travelers.', 'available'),
('Family Room', 950000, 'Large room for up to 4 guests.', 'unavailable');

-- Dummy Data: booking
INSERT INTO booking (user_id, room_id, name, email, phone_number, start_date, end_date, price, payment, status) VALUES
(1, 1, 'John Doe', 'john.doe@example.com', '081234567890', '2025-10-01', '2025-10-03', 1500000, 'cash', 'confirmed');

-- Indexes for performance
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_booking_user_id ON booking (user_id);
CREATE INDEX idx_booking_room_id ON booking (room_id);
CREATE INDEX idx_booking_dates ON booking (start_date, end_date);
CREATE INDEX idx_rooms_status ON rooms (status);
