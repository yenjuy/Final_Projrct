<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config/Database.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

session_start();

// Check if user is logged in as admin
if (!isset($_SESSION['admin_id'])) {
    sendJsonResponse(['error' => 'Admin access required'], 403);
    return;
}

$database = Database::getInstance();
$conn = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    getDashboardStats($conn);
} else {
    sendJsonResponse(['error' => 'Method not allowed'], 405);
}

function getDashboardStats($conn) {
    $stats = [];

    // Total bookings
    $total_bookings_sql = "SELECT COUNT(*) as total FROM Booking";
    $result = $conn->query($total_bookings_sql);
    $stats['total_bookings'] = $result->fetch_assoc()['total'];

    // Active bookings today
    $active_today_sql = "SELECT COUNT(*) as active FROM Booking
                         WHERE DATE(start_date) = CURDATE() AND status = 'confirmed'";
    $result = $conn->query($active_today_sql);
    $stats['active_today'] = $result->fetch_assoc()['active'];

    // Total rooms
    $total_rooms_sql = "SELECT COUNT(*) as total FROM Rooms";
    $result = $conn->query($total_rooms_sql);
    $stats['total_rooms'] = $result->fetch_assoc()['total'];

    // Available rooms
    $available_rooms_sql = "SELECT COUNT(*) as available FROM Rooms WHERE status = 'available'";
    $result = $conn->query($available_rooms_sql);
    $stats['available_rooms'] = $result->fetch_assoc()['available'];

    // Total customers
    $total_customers_sql = "SELECT COUNT(*) as total FROM Users";
    $result = $conn->query($total_customers_sql);
    $stats['total_customers'] = $result->fetch_assoc()['total'];

    // New customers this month
    $new_customers_sql = "SELECT COUNT(*) as new FROM Users
                          WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())";
    $result = $conn->query($new_customers_sql);
    $stats['new_customers_month'] = $result->fetch_assoc()['new'];

    // Room status details
    $room_status_sql = "SELECT r.id, r.room_name, r.capacity, r.price, r.status,
                        COUNT(b.id) as today_bookings
                        FROM Rooms r
                        LEFT JOIN Booking b ON r.id = b.room_id AND DATE(b.start_date) = CURDATE()
                        GROUP BY r.id
                        ORDER BY r.room_name";
    $result = $conn->query($room_status_sql);

    $room_details = [];
    while ($row = $result->fetch_assoc()) {
        $room_details[] = [
            'id' => $row['id'],
            'room_name' => $row['room_name'],
            'capacity' => $row['capacity'] ?? 0,
            'price' => (int)$row['price'],
            'status' => $row['status'],
            'today_bookings' => (int)$row['today_bookings']
        ];
    }
    $stats['room_details'] = $room_details;

    // Recent bookings
    $recent_bookings_sql = "SELECT b.id, b.name, b.email, b.start_date, b.end_date, b.status, b.price,
                            r.room_name
                            FROM Booking b
                            LEFT JOIN Rooms r ON b.room_id = r.id
                            ORDER BY b.created_at DESC
                            LIMIT 5";
    $result = $conn->query($recent_bookings_sql);

    $recent_bookings = [];
    while ($row = $result->fetch_assoc()) {
        $recent_bookings[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'room_name' => $row['room_name'],
            'start_date' => $row['start_date'],
            'end_date' => $row['end_date'],
            'status' => $row['status'],
            'price' => (int)$row['price']
        ];
    }
    $stats['recent_bookings'] = $recent_bookings;

    // Customer statistics
    $customer_stats_sql = "SELECT u.id, u.name, u.email, u.no_telp,
                           COUNT(b.id) as total_bookings,
                           COALESCE(SUM(b.price), 0) as total_spent,
                           MAX(b.created_at) as last_booking
                           FROM Users u
                           LEFT JOIN Booking b ON u.id = b.user_id
                           GROUP BY u.id
                           ORDER BY total_bookings DESC
                           LIMIT 5";
    $result = $conn->query($customer_stats_sql);

    $customer_stats = [];
    while ($row = $result->fetch_assoc()) {
        $customer_stats[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['no_telp'],
            'total_bookings' => (int)$row['total_bookings'],
            'total_spent' => (int)$row['total_spent'],
            'last_booking' => $row['last_booking']
        ];
    }
    $stats['top_customers'] = $customer_stats;

    // Monthly revenue
    $monthly_revenue_sql = "SELECT MONTH(created_at) as month, SUM(price) as revenue
                            FROM Booking
                            WHERE status = 'confirmed' AND YEAR(created_at) = YEAR(CURDATE())
                            GROUP BY MONTH(created_at)
                            ORDER BY month";
    $result = $conn->query($monthly_revenue_sql);

    $monthly_revenue = [];
    while ($row = $result->fetch_assoc()) {
        $monthly_revenue[] = [
            'month' => (int)$row['month'],
            'revenue' => (int)$row['revenue']
        ];
    }
    $stats['monthly_revenue'] = $monthly_revenue;

    sendJsonResponse([
        'success' => true,
        'stats' => $stats
    ]);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}
?>