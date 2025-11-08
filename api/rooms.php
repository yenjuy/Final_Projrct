<?php
// Rooms API
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
        if ($action === 'get_room' && isset($_GET['id'])) {
            handleGetRoom($conn, $_GET['id']);
        } else {
            handleGetAllRooms($conn);
        }
        break;
    case 'POST':
        requireAdmin();
        handleCreateRoom($conn);
        break;
    case 'PUT':
        requireAdmin();
        if (isset($_GET['id'])) {
            handleUpdateRoom($conn, $_GET['id']);
        } else {
            sendError('Room ID is required', 400);
        }
        break;
    case 'DELETE':
        requireAdmin();
        if (isset($_GET['id'])) {
            handleDeleteRoom($conn, $_GET['id']);
        } else {
            sendError('Room ID is required', 400);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

// HANDLERS
function handleGetAllRooms($conn) {
    try {
        checkRoomsTable($conn);

        $rooms = getAllRoomsFromDB($conn);
        $formattedRooms = array_map('formatRoomData', $rooms);

        sendSuccess($formattedRooms);
    } catch (Exception $e) {
        sendError('Failed to fetch rooms: ' . $e->getMessage(), 500);
    }
}

function handleGetRoom($conn, $id) {
    $room = getRoomById($conn, $id);
    if (!$room) {
        sendError('Room not found', 404);
        return;
    }

    sendSuccess(formatRoomData($room));
}

function handleCreateRoom($conn) {
    $data = getRequestData();

    $required = ['room_name', 'price'];
    if (!validateRequired($data, $required)) {
        return;
    }

    $room = prepareRoomData($conn, $data);
    $roomId = createRoomInDB($conn, $room);

    if ($roomId) {
        sendSuccess([
            'message' => 'Room created successfully',
            'room_id' => $roomId
        ]);
    } else {
        sendError('Failed to create room', 500);
    }
}

function handleUpdateRoom($conn, $id) {
    $room = getRoomById($conn, $id);
    if (!$room) {
        sendError('Room not found', 404);
        return;
    }

    $data = getRequestData();
    $required = ['room_name', 'price'];
    if (!validateRequired($data, $required)) {
        return;
    }

    $updatedRoom = prepareRoomData($conn, $data);
    $success = updateRoomInDB($conn, $id, $updatedRoom);

    if ($success) {
        sendSuccess(['message' => 'Room updated successfully']);
    } else {
        sendError('Failed to update room', 500);
    }
}

function handleDeleteRoom($conn, $id) {
    $room = getRoomById($conn, $id);
    if (!$room) {
        sendError('Room not found', 404);
        return;
    }

    $success = deleteRoomFromDB($conn, $id);

    if ($success) {
        sendSuccess(['message' => 'Room deleted successfully']);
    } else {
        sendError('Failed to delete room', 500);
    }
}

// DATABASE OPERATIONS
function getAllRoomsFromDB($conn) {
    $sql = "SELECT id, room_name, price, description, IFNULL(status, 'available') as status FROM rooms ORDER BY room_name";
    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $rooms = [];
    while ($row = $result->fetch_assoc()) {
        // Generate hardcoded image path based on room name
        $row['image_url'] = getHardcodedImagePath($row['room_name']);
        $rooms[] = $row;
    }

    return $rooms;
}

function getRoomById($conn, $id) {
    $sql = "SELECT id, room_name, price, description, IFNULL(status, 'available') as status FROM rooms WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $room = $result->fetch_assoc();
        // Generate hardcoded image path based on room name
        $room['image_url'] = getHardcodedImagePath($room['room_name']);
        return $room;
    }

    return null;
}

function createRoomInDB($conn, $room) {
    $sql = "INSERT INTO rooms (room_name, price, description, status) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("siss", $room['room_name'], $room['price'], $room['description'], $room['status']);

    return $stmt->execute() ? $conn->insert_id : false;
}

function updateRoomInDB($conn, $id, $room) {
    $sql = "UPDATE rooms SET room_name = ?, price = ?, description = ?, status = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sissi", $room['room_name'], $room['price'], $room['description'], $room['status'], $id);

    return $stmt->execute();
}

function deleteRoomFromDB($conn, $id) {
    // Check if room has bookings
    if (hasBookings($conn, $id)) {
        // Soft delete: Mark room as unavailable and append timestamp to name
        $timestamp = time();
        $deleteSuffix = " (Deleted $timestamp)";

        $updateRoom = "UPDATE rooms SET
                       status = 'unavailable',
                       room_name = CONCAT(room_name, ?)
                       WHERE id = ?";
        $stmt = $conn->prepare($updateRoom);
        $stmt->bind_param("si", $deleteSuffix, $id);

        return $stmt->execute();
    } else {
        // Hard delete if no bookings exist
        $sql = "DELETE FROM rooms WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);

        return $stmt->execute();
    }
}

function hasBookings($conn, $roomId) {
    $sql = "SELECT COUNT(*) as booking_count FROM booking WHERE room_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $roomId);
    $stmt->execute();
    $result = $stmt->get_result();

    return $result->fetch_assoc()['booking_count'] > 0;
}

// IMAGE MAPPING FUNCTION
function getHardcodedImagePath($roomName) {
    // Map room names to their corresponding image files
    $roomImageMap = [
        'Meeting Room' => 'assets/img/meetingroom.jpg',
        'Private Office' => 'assets/img/privateoffice.jpg',
        'Class Room' => 'assets/img/classroom.jpg',
        'Coworking Space' => 'assets/img/coworkingspace.jpg',
        'Event Room' => 'assets/img/eventspace.jpg',
        'Virtual Office' => 'assets/img/virtualoffice.jpg',
        // Variations and partial matches
        'Co-Working Space' => 'assets/img/coworkingspace.jpg',
        'Event Space' => 'assets/img/eventspace.jpg',
        // Default fallback for any room names not in the map
        'default' => 'assets/img/meetingroom.jpg'
    ];

    // Clean up room name for matching (case insensitive, trim spaces)
    $cleanRoomName = trim(strtolower($roomName));

    // Create a case-insensitive lookup map
    $lowerCaseMap = array_change_key_case($roomImageMap, CASE_LOWER);

    // Try to find exact match first
    if (isset($lowerCaseMap[$cleanRoomName])) {
        return $lowerCaseMap[$cleanRoomName];
    }

    // Try partial matching for room names that contain our keywords
    foreach ($lowerCaseMap as $key => $path) {
        if ($key !== 'default' && strpos($cleanRoomName, $key) !== false) {
            return $path;
        }
    }

    // Return default image if no match found
    return $roomImageMap['default'];
}

// VALIDATION & UTILITIES
function checkRoomsTable($conn) {
    $checkTable = $conn->query("SHOW TABLES LIKE 'rooms'");
    if ($checkTable->num_rows === 0) {
        throw new Exception('Rooms table not found. Please run create_tables.sql');
    }
}

function prepareRoomData($conn, $data) {
    $status = isset($data['status']) ? strtolower(sanitize($conn, $data['status'])) : 'available';
    if ($status !== 'available' && $status !== 'unavailable') {
        $status = 'available'; // Default to available for invalid status
    }

    return [
        'room_name' => sanitize($conn, $data['room_name']),
        'price' => (int)$data['price'],
        'description' => isset($data['description']) ? sanitize($conn, $data['description']) : '',
        'status' => $status
    ];
}

function formatRoomData($room) {
    $status = strtolower($room['status']);
    if ($status !== 'available' && $status !== 'unavailable') {
        $status = 'available'; // Default to available for any invalid status
    }

    return [
        'id' => (int)$room['id'],
        'room_name' => $room['room_name'],
        'price' => (int)$room['price'],
        'description' => $room['description'],
        'image_url' => $room['image_url'],
        'status' => $status
    ];
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