<?php
class Database {
    private const HOST = "localhost";
    private const USERNAME = "root";
    private const PASSWORD = "";
    private const DATABASE = "seru_db";
    private const CHARSET = "utf8mb4";

    private $connection;

    private static $instance = null;

    private function __construct() {
        $this->connect();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function connect() {
        try {
            mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

            $this->connection = new mysqli(
                self::HOST,
                self::USERNAME,
                self::PASSWORD,
                self::DATABASE
            );

            $this->connection->set_charset(self::CHARSET);

        } catch (mysqli_sql_exception $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed. Please try again later.");
        }
    }

    //DB Connect
    public function getConnection() {
        return $this->connection;
    }

    public function query($sql) {
        return $this->connection->query($sql);
    }

    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }

    public function escape($string) {
        return $this->connection->real_escape_string($string);
    }

    public function getLastInsertId() {
        return $this->connection->insert_id;
    }

    public function tableExists($tableName) {
        $tableName = $this->connection->real_escape_string($tableName);
        $result = $this->connection->query("SHOW TABLES LIKE '$tableName'");
        return $result->num_rows > 0;
    }

    public function beginTransaction() {
        return $this->connection->begin_transaction();
    }

    public function commit() {
        return $this->connection->commit();
    }

    public function rollback() {
        return $this->connection->rollback();
    }

    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }

    private function __clone() {}

    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }

    public function __destruct() {
        $this->close();
    }
}