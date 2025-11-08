<?php
// Authentication API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

session_start();
require_once 'config/Database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Initialize database connection
$database = Database::getInstance();
$conn = $database->getConnection();

// Route request
$action = $_GET['action'] ?? '';
switch ($action) {
    case 'login':
        handleLogin($conn);
        break;
    case 'register':
        handleRegister($conn);
        break;
    case 'admin_login':
        handleAdminLogin($conn);
        break;
    default:
        sendError('Invalid action', 400);
}

// HANDLERS
function handleLogin($conn) {
    $data = getRequestData();

    $required = ['email', 'password'];
    if (!validateRequired($data, $required)) {
        return;
    }

    $email = sanitize($conn, $data['email']);
    $password = $data['password'];

    $user = findUserByEmail($conn, $email);
    if (!$user) {
        sendError('User not found', 404);
        return;
    }

    if (!password_verify($password, $user['password'])) {
        sendError('Invalid password', 401);
        return;
    }

    // Create session
    setUserSession($user);

    sendSuccess([
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'no_telp' => $user['no_telp']
        ]
    ]);
}

function handleRegister($conn) {
    $data = getRequestData();

    $required = ['name', 'email', 'password', 'no_telp'];
    if (!validateRequired($data, $required)) {
        return;
    }

    $email = sanitize($conn, $data['email']);

    if (emailExists($conn, $email)) {
        sendError('Email already exists', 409);
        return;
    }

    $user = [
        'name' => sanitize($conn, $data['name']),
        'email' => $email,
        'password' => password_hash($data['password'], PASSWORD_DEFAULT),
        'no_telp' => sanitize($conn, $data['no_telp'])
    ];

    $userId = createUser($conn, $user);
    if ($userId) {
        sendSuccess([
            'message' => 'User registered successfully',
            'user_id' => $userId
        ]);
    } else {
        sendError('Registration failed', 500);
    }
}

function handleAdminLogin($conn) {
    $data = getRequestData();

    $required = ['admin_name', 'password'];
    if (!validateRequired($data, $required)) {
        return;
    }

    $adminName = sanitize($conn, $data['admin_name']);
    $password = $data['password'];

    $admin = findAdminByName($conn, $adminName);
    if (!$admin) {
        sendError('Admin not found', 404);
        return;
    }

    // For demo: plain text comparison (CHANGE to password_verify in production)
    if ($admin['password'] !== $password) {
        sendError('Invalid admin credentials', 401);
        return;
    }

    setAdminSession($admin);

    sendSuccess([
        'admin' => [
            'id' => $admin['id'],
            'admin_name' => $admin['admin_name']
        ]
    ]);
}

// DATABASE OPERATIONS
function findUserByEmail($conn, $email) {
    $sql = "SELECT id, name, email, no_telp, password FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc() : null;
}

function findAdminByName($conn, $adminName) {
    $sql = "SELECT id, admin_name, password FROM admins WHERE admin_name = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $adminName);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc() : null;
}

function emailExists($conn, $email) {
    $sql = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    return $stmt->get_result()->num_rows > 0;
}

function createUser($conn, $user) {
    $sql = "INSERT INTO users (name, email, password, no_telp) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $user['name'], $user['email'], $user['password'], $user['no_telp']);
    return $stmt->execute() ? $conn->insert_id : false;
}

// SESSION MANAGEMENT
function setUserSession($user) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
}

function setAdminSession($admin) {
    $_SESSION['admin_id'] = $admin['id'];
    $_SESSION['admin_name'] = $admin['admin_name'];
}

// UTILITIES
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