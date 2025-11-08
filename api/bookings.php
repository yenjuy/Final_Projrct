<?php
// Bookings API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'config/Database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

session_start();

// Initialize database connection
try {
    $database = Database::getInstance();
    $conn = $database->getConnection();
} catch (Exception $e) {
    sendError('Database connection failed: ' . $e->getMessage(), 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        if ($action === 'get_booking' && isset($_GET['id'])) {
            handleGetBooking($conn, $_GET['id']);
        } elseif ($action === 'user_bookings' && isset($_GET['user_id'])) {
            handleGetUserBookings($conn, $_GET['user_id']);
        } else {
            requireAdmin();
            handleGetAllBookings($conn);
        }
        break;
    case 'POST':
        handleCreateBooking($conn);
        break;
    case 'PUT':
        if (isset($_GET['id'])) {
            handleUpdateBooking($conn, $_GET['id']);
        } else {
            sendError('Booking ID is required', 400);
        }
        break;
    case 'DELETE':
        requireAdmin();
        if (isset($_GET['id'])) {
            handleDeleteBooking($conn, $_GET['id']);
        } else {
            sendError('Booking ID is required', 400);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

// HANDLERS
function handleGetAllBookings($conn) {
    try {
        $bookings = getAllBookingsFromDB($conn);
        $formattedBookings = array_map('formatBookingWithDetails', $bookings);

        sendSuccess($formattedBookings);
    } catch (Exception $e) {
        sendError('Failed to fetch bookings: ' . $e->getMessage(), 500);
    }
}

function handleGetBooking($conn, $id) {
    try {
        $booking = getBookingById($conn, $id);
        if (!$booking) {
            sendError('Booking not found', 404);
            return;
        }

        $formattedBooking = formatBookingWithDetails($booking);
        sendSuccess($formattedBooking);
    } catch (Exception $e) {
        sendError('Failed to fetch booking: ' . $e->getMessage(), 500);
    }
}

function handleGetUserBookings($conn, $userId) {
    try {
        $bookings = getUserBookingsFromDB($conn, $userId);
        $formattedBookings = array_map('formatBookingData', $bookings);

        sendSuccess($formattedBookings);
    } catch (Exception $e) {
        sendError('Failed to fetch user bookings: ' . $e->getMessage(), 500);
    }
}

function handleCreateBooking($conn) {
    $data = getRequestData();

    $required = ['room_id', 'name', 'email', 'phone_number', 'start_date', 'end_date', 'price'];
    if (!validateRequired($data, $required)) {
        return;
    }

    if (!validateBookingDates($data['start_date'], $data['end_date'])) {
        return;
    }

    $userId = getCurrentUserId();
    if (!$userId) {
        sendError('User must be logged in to create a booking', 401);
        return;
    }

    $bookingData = prepareBookingData($conn, $data, $userId);

    try {
        $paymentId = createPaymentRecord($conn, $bookingData['price'], $bookingData['payment']);

        $bookingData['payment_id'] = $paymentId;
        $bookingId = createBookingInDB($conn, $bookingData);

        if ($bookingId) {
            sendSuccess([
                'message' => 'Booking created successfully',
                'booking_id' => $bookingId,
                'payment_id' => $paymentId
            ]);
        } else {
            sendError('Failed to create booking', 500);
        }
    } catch (Exception $e) {
        sendError('Booking creation failed: ' . $e->getMessage(), 500);
    }
}

function handleUpdateBooking($conn, $id) {
    $booking = getBookingById($conn, $id);
    if (!$booking) {
        sendError('Booking not found', 404);
        return;
    }

    $data = getRequestData();
    if (!isset($data['status'])) {
        sendError('Status is required', 400);
        return;
    }

    // Validate user permissions
    $currentUserId = getCurrentUserId();

    // Allow users to cancel their own confirmed bookings only
    if ($data['status'] === 'cancelled') {
        if ($booking['user_id'] != $currentUserId) {
            sendError('You can only cancel your own bookings', 403);
            return;
        }
        if ($booking['status'] !== 'confirmed') {
            sendError('You can only cancel confirmed bookings', 403);
            return;
        }
    } else {
        // For other status changes, require admin privileges
        requireAdmin();
    }

    try {
        updatePaymentStatus($conn, $id, $data['status']);

        $success = updateBookingStatus($conn, $id, $data['status']);

        if ($success) {
            sendSuccess(['message' => 'Booking updated successfully']);
        } else {
            sendError('Failed to update booking', 500);
        }
    } catch (Exception $e) {
        sendError('Booking update failed: ' . $e->getMessage(), 500);
    }
}

function handleDeleteBooking($conn, $id) {
    $booking = getBookingById($conn, $id);
    if (!$booking) {
        sendError('Booking not found', 404);
        return;
    }

    if (!canDeleteBooking($booking['status'])) {
        sendError('Cannot delete confirmed booking', 400);
        return;
    }

    try {
        $success = deleteBookingFromDB($conn, $id);

        if ($success) {
            sendSuccess(['message' => 'Booking deleted successfully']);
        } else {
            sendError('Failed to delete booking', 500);
        }
    } catch (Exception $e) {
        sendError('Booking deletion failed: ' . $e->getMessage(), 500);
    }
}

// DATABASE OPERATIONS
function getAllBookingsFromDB($conn) {
    $sql = "SELECT b.*, r.room_name, u.name as user_name, u.email as user_email
            FROM booking b
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC";

    $result = $conn->query($sql);
    if (!$result) {
        throw new Exception($conn->error);
    }

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = $row;
    }

    return $bookings;
}

function getBookingById($conn, $id) {
    $sql = "SELECT b.*, r.room_name, u.name as user_name, u.email as user_email
            FROM booking b
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    return $result->num_rows > 0 ? $result->fetch_assoc() : null;
}

function getUserBookingsFromDB($conn, $userId) {
    $sql = "SELECT b.*, r.room_name
            FROM booking b
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        $bookings[] = $row;
    }

    return $bookings;
}

function createPaymentRecord($conn, $price, $paymentMethod = 'pending') {
    $sql = "INSERT INTO payments (price, payment_method, status) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);

    $status = 'pending';
    $stmt->bind_param("iss", $price, $paymentMethod, $status);

    if (!$stmt->execute()) {
        throw new Exception('Failed to create payment record: ' . $stmt->error);
    }

    return $conn->insert_id;
}

function createBookingInDB($conn, $bookingData) {
    $sql = "INSERT INTO booking (user_id, room_id, payment_id, name, email, phone_number,
            start_date, end_date, price, payment, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare booking statement: ' . $conn->error);
    }

    $stmt->bind_param("iiisssssiss",
        $bookingData['user_id'],
        $bookingData['room_id'],
        $bookingData['payment_id'],
        $bookingData['name'],
        $bookingData['email'],
        $bookingData['phone_number'],
        $bookingData['start_date'],
        $bookingData['end_date'],
        $bookingData['price'],
        $bookingData['payment'],
        $bookingData['status']
    );

    if (!$stmt->execute()) {
        throw new Exception('Failed to create booking: ' . $stmt->error);
    }

    $stmt->close();
    return $conn->insert_id;
}

function updateBookingStatus($conn, $id, $status) {
    $status = strtolower($status);
    if ($status !== 'pending' && $status !== 'confirmed' && $status !== 'cancelled') {
        throw new Exception('Invalid booking status. Only pending, confirmed, or cancelled are allowed.');
    }

    $sql = "UPDATE booking SET status = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $status, $id);
    return $stmt->execute();
}

function updatePaymentStatus($conn, $bookingId, $bookingStatus) {
    $paymentStatus = match($bookingStatus) {
        'confirmed' => 'completed',
        'cancelled' => 'refunded',
        default => 'pending'
    };

    $sql = "UPDATE payments SET status = ? WHERE id = (SELECT payment_id FROM booking WHERE id = ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $paymentStatus, $bookingId);
    return $stmt->execute();
}

function deleteBookingFromDB($conn, $id) {
    $sql = "DELETE FROM booking WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    return $stmt->execute();
}

// VALIDATION & UTILITIES
function validateBookingDates($startDate, $endDate) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        sendError('Invalid date format. Please use YYYY-MM-DD format.', 400);
        return false;
    }

    $startDateObj = DateTime::createFromFormat('Y-m-d', $startDate);
    $endDateObj = DateTime::createFromFormat('Y-m-d', $endDate);

    if (!$startDateObj || !$endDateObj || $endDateObj <= $startDateObj) {
        sendError('Invalid dates. End date must be after start date.', 400);
        return false;
    }

    return true;
}

function prepareBookingData($conn, $data, $userId) {
    return [
        'user_id' => (int)$userId,
        'room_id' => (int)$data['room_id'],
        'name' => sanitize($conn, $data['name']),
        'email' => sanitize($conn, $data['email']),
        'phone_number' => sanitize($conn, $data['phone_number']),
        'start_date' => sanitize($conn, $data['start_date']),
        'end_date' => sanitize($conn, $data['end_date']),
        'price' => (int)$data['price'],
        'payment' => sanitize($conn, $data['payment'] ?? 'pending'),
        'status' => 'confirmed'
    ];
}

function formatBookingWithDetails($booking) {
    return [
        'id' => (int)$booking['id'],
        'user_id' => (int)$booking['user_id'],
        'room_id' => (int)$booking['room_id'],
        'payment_id' => (int)$booking['payment_id'],
        'name' => $booking['name'],
        'email' => $booking['email'],
        'phone_number' => $booking['phone_number'],
        'start_date' => $booking['start_date'],
        'end_date' => $booking['end_date'],
        'price' => (int)$booking['price'],
        'payment' => $booking['payment'],
        'status' => $booking['status'],
        'room_name' => $booking['room_name'],
        'user_name' => $booking['user_name'],
        'user_email' => $booking['user_email'],
        'created_at' => $booking['created_at']
    ];
}

function formatBookingData($booking) {
    return [
        'id' => (int)$booking['id'],
        'user_id' => (int)$booking['user_id'],
        'room_id' => (int)$booking['room_id'],
        'payment_id' => (int)$booking['payment_id'],
        'name' => $booking['name'],
        'email' => $booking['email'],
        'phone_number' => $booking['phone_number'],
        'start_date' => $booking['start_date'],
        'end_date' => $booking['end_date'],
        'price' => (int)$booking['price'],
        'payment' => $booking['payment'],
        'status' => $booking['status'],
        'room_name' => $booking['room_name'],
        'created_at' => $booking['created_at']
    ];
}

function canDeleteBooking($status) {
    return $status !== 'confirmed';
}

function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

function requireAdmin() {
    if (!isset($_SESSION['admin_id'])) {
        sendError('Admin access required', 403);
        exit();
    }
}

function getRequestData() {
    $data = json_decode(file_get_contents('php://input'), true);
    return $data ?? [];
}

function validateRequired($data, $required) {
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            sendError(ucfirst($field) . ' is required', 400);
            return false;
        }
    }
    return true;
}

function sanitize($conn, $value) {
    return $conn->real_escape_string(trim($value));
}

function sendSuccess($data = [], $message = 'Success') {
    $response = ['success' => true];
    if (!empty($data)) {
        $response['data'] = $data;
    }
    if ($message !== 'Success') {
        $response['message'] = $message;
    }
    sendJsonResponse($response);
}

function sendError($message, $code = 400) {
    sendJsonResponse(['error' => $message], $code);
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}
?>