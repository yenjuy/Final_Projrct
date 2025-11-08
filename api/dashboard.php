<?php
// Dashboard API - Simple and clean
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once 'config/Database.php';

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

// Simple response functions
function success($data = []) {
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// Connect to database
try {
    $conn = Database::getInstance()->getConnection();
    if (!$conn) {
        error('Database connection failed', 500);
    }
} catch (Exception $e) {
    error('Database connection error: ' . $e->getMessage(), 500);
}

// Get dashboard statistics
function getDashboardStats($conn) {
    $stats = [];

    // Total bookings
    $result = $conn->query("SELECT COUNT(*) as count FROM booking");
    $stats['total_bookings'] = $result->fetch_assoc()['count'] ?? 0;

    // Active today (bookings that are active today)
    $result = $conn->query("SELECT COUNT(*) as count FROM booking WHERE status = 'confirmed' AND (start_date <= CURDATE() AND end_date >= CURDATE())");
    $stats['active_today'] = $result->fetch_assoc()['count'] ?? 0;

    // Total rooms
    $result = $conn->query("SELECT COUNT(*) as count FROM rooms");
    $stats['total_rooms'] = $result->fetch_assoc()['count'] ?? 0;

    // Room details
    $roomResult = $conn->query("SELECT r.id, r.room_name, r.price, r.status,
                                       COUNT(b.id) as today_bookings
                                FROM rooms r
                                LEFT JOIN booking b ON r.id = b.room_id
                                    AND b.status = 'confirmed'
                                    AND (b.start_date <= CURDATE() AND b.end_date >= CURDATE())
                                GROUP BY r.id ORDER BY r.room_name");

    $stats['room_details'] = [];
    while ($room = $roomResult->fetch_assoc()) {
        $stats['room_details'][] = [
            'id' => (int)$room['id'],
            'name' => $room['room_name'],
            'price' => formatCurrency($room['price']),
            'status' => $room['status'],
            'status_class' => $room['status'] === 'available' ? 'available' : 'occupied',
            'today_bookings' => $room['today_bookings'] . ' ' . ($room['today_bookings'] == 1 ? 'booking' : 'bookings')
        ];
    }

    // Recent bookings
    $bookingResult = $conn->query("SELECT b.id, u.name as customer_name, u.email,
                                          r.room_name, b.start_date, b.end_date, b.status, b.price
                                   FROM booking b
                                   JOIN users u ON b.user_id = u.id
                                   JOIN rooms r ON b.room_id = r.id
                                   ORDER BY b.created_at DESC LIMIT 5");

    $stats['recent_bookings'] = [];
    while ($booking = $bookingResult->fetch_assoc()) {
        $stats['recent_bookings'][] = [
            'id' => '#BK' . str_pad($booking['id'], 3, '0', STR_PAD_LEFT),
            'customer' => $booking['customer_name'],
            'email' => $booking['email'],
            'room' => $booking['room_name'],
            'start_date' => formatDate($booking['start_date']),
            'end_date' => formatDate($booking['end_date']),
            'status' => ucfirst($booking['status']),
            'status_class' => $booking['status'] === 'confirmed' ? 'available' : 'cancelled',
            'amount' => formatCurrency($booking['price'])
        ];
    }

    return $stats;
}

// Get customers data
function getCustomersData($conn) {
    try {
        $customers = [];

        // Get all unique customers from bookings (including those without user accounts)
        // This captures all customers who have ever made a booking, whether they have an account or not
        $query = "SELECT
                    MIN(u.id) as user_id,
                    CASE
                        WHEN MIN(u.id) IS NOT NULL THEN MIN(u.name)
                        ELSE MIN(b.name)
                    END as name,
                    CASE
                        WHEN MIN(u.id) IS NOT NULL THEN MIN(u.email)
                        ELSE MIN(b.email)
                    END as email,
                    CASE
                        WHEN MIN(u.id) IS NOT NULL THEN MIN(u.no_telp)
                        ELSE MIN(b.phone_number)
                    END as phone,
                    COUNT(b.id) as total_bookings,
                    COALESCE(SUM(b.price), 0) as total_spent,
                    MAX(b.created_at) as latest_booking_date
                  FROM booking b
                  LEFT JOIN users u ON b.user_id = u.id
                  GROUP BY
                    CASE
                        WHEN u.id IS NOT NULL THEN u.id
                        ELSE b.id
                    END,
                    CASE
                        WHEN u.id IS NOT NULL THEN u.name
                        ELSE b.name
                    END,
                    CASE
                        WHEN u.id IS NOT NULL THEN u.email
                        ELSE b.email
                    END,
                    CASE
                        WHEN u.id IS NOT NULL THEN u.no_telp
                        ELSE b.phone_number
                    END
                  ORDER BY latest_booking_date DESC";

        $result = $conn->query($query);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }

        while ($customer = $result->fetch_assoc()) {
            $customers[] = [
                'id' => $customer['user_id'] ? (int)$customer['user_id'] : 'GUEST_' . rand(1000, 9999),
                'name' => $customer['name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
                'total_bookings' => (int)$customer['total_bookings'],
                'total_spent' => formatCurrency($customer['total_spent']),
                'join_date' => 'N/A',
                'status' => $customer['total_bookings'] > 0 ? 'Active' : 'Inactive',
                'customer_type' => $customer['user_id'] ? 'Registered' : 'Guest'
            ];
        }

        // Get statistics
        $stats = [];
        $stats['total_customers'] = count($customers);

        $activeThisMonth = 0;
        $currentMonth = date('Y-m');
        foreach ($customers as $customer) {
            // For registered users, use user_id; for guests, search by name/email/phone
            if ($customer['customer_type'] === 'Registered') {
                $bookingQuery = "SELECT COUNT(*) as count FROM booking
                               WHERE user_id = {$customer['id']}
                               AND DATE_FORMAT(created_at, '%Y-%m') = '$currentMonth'";
            } else {
                // For guests, search by name, email, or phone to find their bookings
                $bookingQuery = "SELECT COUNT(*) as count FROM booking
                               WHERE name = '{$customer['name']}'
                               AND email = '{$customer['email']}'
                               AND DATE_FORMAT(created_at, '%Y-%m') = '$currentMonth'";
            }
            $bookingResult = $conn->query($bookingQuery);
            if ($bookingResult) {
                $count = $bookingResult->fetch_assoc()['count'] ?? 0;
                if ($count > 0) $activeThisMonth++;
            }
        }
        $stats['active_this_month'] = $activeThisMonth;

        return ['customers' => $customers, 'stats' => $stats];
    } catch (Exception $e) {
        throw new Exception("Error getting customers data: " . $e->getMessage());
    }
}

// Get rooms data
function getRoomsData($conn) {
    try {
        $rooms = [];

        // Get all rooms with booking statistics (without image_url from database)
        $query = "SELECT r.id, r.room_name, r.price, r.description, r.status,
                         COUNT(b.id) as total_bookings,
                         COUNT(CASE WHEN DATE(b.created_at) = CURDATE() THEN 1 END) as today_bookings
                  FROM rooms r
                  LEFT JOIN booking b ON r.id = b.room_id
                  GROUP BY r.id
                  ORDER BY r.room_name";

        $result = $conn->query($query);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }

        while ($room = $result->fetch_assoc()) {
            // Generate hardcoded image path based on room ID
            $imageUrl = getHardcodedImagePath($room['id']);

            $rooms[] = [
                'id' => (int)$room['id'],
                'name' => $room['room_name'],
                'price' => formatCurrency($room['price']),
                'description' => $room['description'],
                'image_url' => $imageUrl,
                'status' => $room['status'],
                'status_class' => $room['status'] === 'available' ? 'available' : 'occupied',
                'total_bookings' => (int)$room['total_bookings'],
                'today_bookings' => (int)$room['today_bookings']
            ];
        }

        // Get statistics
        $stats = [];
        $stats['total_rooms'] = count($rooms);

        $availableRooms = 0;
        $occupiedRooms = 0;
        $totalTodayBookings = 0;

        foreach ($rooms as $room) {
            if ($room['status'] === 'available') {
                $availableRooms++;
            } else {
                $occupiedRooms++;
            }
            $totalTodayBookings += $room['today_bookings'];
        }

        $stats['available_rooms'] = $availableRooms;
        $stats['occupied_rooms'] = $occupiedRooms;
        $stats['total_today_bookings'] = $totalTodayBookings;

        return ['rooms' => $rooms, 'stats' => $stats];
    } catch (Exception $e) {
        throw new Exception("Error getting rooms data: " . $e->getMessage());
    }
}

// Route request
$action = $_GET['action'] ?? 'stats';

try {
    switch ($action) {
        case 'stats':
            success(getDashboardStats($conn));
            break;
        case 'customers':
            success(getCustomersData($conn));
            break;
        case 'user':
            $userId = $_GET['id'] ?? null;
            if (!$userId) {
                error('User ID is required', 400);
            } else {
                success(getUserById($conn, $userId));
            }
            break;
        case 'rooms':
            success(getRoomsData($conn));
            break;
        case 'delete_customer':
            $userId = $_GET['id'] ?? null;
            if (!$userId) {
                error('User ID is required', 400);
            } else {
                deleteCustomer($conn, $userId);
            }
            break;
        default:
            error('Invalid action', 400);
    }
} catch (Exception $e) {
    error("API Error: " . $e->getMessage(), 500);
}

function getUserById($conn, $userId) {
    $sql = "SELECT id, name, no_telp, email FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        // Map database fields to frontend-friendly names
        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'phone' => $user['no_telp']  // Map no_telp to phone for frontend consistency
        ];
    }

    return null;
}

function deleteCustomer($conn, $userId) {
    // Check if user exists
    $checkUser = "SELECT id, name FROM users WHERE id = ?";
    $stmt = $conn->prepare($checkUser);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $userResult = $stmt->get_result();

    if ($userResult->num_rows === 0) {
        error('Customer not found', 404);
        return;
    }

    try {
        // Delete all bookings associated with this customer from booking table only
        $deleteBookings = "DELETE FROM booking WHERE user_id = ?";
        $stmt = $conn->prepare($deleteBookings);
        $stmt->bind_param("i", $userId);
        $stmt->execute();

        $deletedCount = $stmt->affected_rows;

        success(['message' => "Successfully deleted {$deletedCount} booking records for the customer"]);

    } catch (Exception $e) {
        error('Failed to delete customer bookings: ' . $e->getMessage(), 500);
    }
}

// IMAGE MAPPING FUNCTION - Using Room ID
function getHardcodedImagePath($roomId) {
    // Map room IDs to their corresponding image files
    $roomImageMap = [
        1 => 'assets/img/meetingroom.jpg',
        2 => 'assets/img/privateoffice.jpg',
        3 => 'assets/img/classroom.jpg',
        4 => 'assets/img/coworkingspace.jpg',
        5 => 'assets/img/eventspace.jpg',
        6 => 'assets/img/virtualoffice.jpg',
        // Add new rooms here - easy to add new entries
        // 7 => 'assets/img/newroom.jpg',
        // 8 => 'assets/img/anotherroom.jpg',

        // Default fallback for any room IDs not in the map
        'default' => 'assets/img/meetingroom.jpg'
    ];

    // Get image path by room ID
    return $roomImageMap[$roomId] ?? $roomImageMap['default'];
}

// Helper functions
function formatCurrency($amount) {
    return 'Rp ' . number_format($amount, 0, ',', '.');
}

function formatDate($date) {
    return date('d M Y', strtotime($date));
}
?>