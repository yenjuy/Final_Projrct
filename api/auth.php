<?php
// Authentication API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PUT, OPTIONS');
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
    case 'update_profile':
        handleUpdateProfile($conn);
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

    // Validate password strength
    if (!validatePasswordStrength($data['password'])) {
        sendError('Password must be at least 8 characters long and include uppercase, lowercase, and numbers');
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

    if (!password_verify($password, $admin['password'])) {
        sendError('Invalid admin credentials', 401);
        return;
    }

    setAdminSession($admin);

    sendSuccess([
        'admin' => [
            'id' => $admin['id'],
            'admin_name' => $admin['admin_name'],
            'loginTime' => date('Y-m-d H:i:s')
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

// PROFILE UPDATE HANDLER
function handleUpdateProfile($conn) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        sendError('Authentication required', 401);
        return;
    }

    $data = getRequestData();

    // Get current user ID from session
    $userId = $_SESSION['user_id'];

    // Validate required fields
    if (!isset($data['name']) || empty(trim($data['name']))) {
        sendError('Name is required', 400);
        return;
    }

    // Sanitize inputs
    $name = sanitize($conn, $data['name']);
    $noTelp = isset($data['no_telp']) ? sanitize($conn, $data['no_telp']) : null;

    // Validate password if provided
    if (isset($data['password']) && !empty($data['password'])) {
        if (!validatePasswordStrength($data['password'])) {
            sendError('Password must be at least 8 characters long and include uppercase, lowercase, and numbers');
            return;
        }
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

        // Update user profile with password
        $sql = "UPDATE users SET name = ?, no_telp = ?, password = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssi", $name, $noTelp, $hashedPassword, $userId);
    } else {
        // Update user profile without password
        $sql = "UPDATE users SET name = ?, no_telp = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssi", $name, $noTelp, $userId);
    }

    if ($stmt->execute()) {
        // Update session name
        $_SESSION['user_name'] = $name;

        // Get updated user data
        $updatedUser = findUserById($conn, $userId);

        sendSuccess([
            'user' => [
                'id' => $updatedUser['id'],
                'name' => $updatedUser['name'],
                'email' => $updatedUser['email'],
                'no_telp' => $updatedUser['no_telp']
            ]
        ], 'Profile updated successfully');
    } else {
        sendError('Failed to update profile', 500);
    }
}

function findUserById($conn, $id) {
    $sql = "SELECT id, name, email, no_telp FROM users WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc() : null;
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

function validatePasswordStrength($password) {
    // Password should be at least 8 characters long
    if (strlen($password) < 8) {
        return false;
    }

    // Should contain at least one uppercase letter
    if (!preg_match('/[A-Z]/', $password)) {
        return false;
    }

    // Should contain at least one lowercase letter
    if (!preg_match('/[a-z]/', $password)) {
        return false;
    }

    // Should contain at least one number
    if (!preg_match('/\d/', $password)) {
        return false;
    }

    return true;
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