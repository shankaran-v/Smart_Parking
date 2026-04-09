require('dotenv').config();
const mysql = require('mysql2/promise');

// MySQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '090626',
  database: process.env.DB_NAME || 'smart_parking_system',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;

  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    console.log('Connected successfully!');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`Database '${dbConfig.database}' created or already exists.`);

    // Close connection and reconnect with database
    await connection.end();

    connection = await mysql.createConnection(dbConfig);
    console.log('Reconnected to database successfully!');

    // Create tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        role ENUM('owner','user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS parking_spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        address TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        phone VARCHAR(50),
        available_slots INT DEFAULT 1,
        total_slots INT DEFAULT 1,
        status ENUM('active','inactive','maintenance') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        parking_id INT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status ENUM('pending','confirmed','rejected','cancelled','completed') DEFAULT 'pending',
        total_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NOT NULL,
        parking_id INT NOT NULL,
        rating TINYINT UNSIGNED CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parking_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('Tables created successfully!');

    // Insert sample data
    await connection.execute(`
      INSERT IGNORE INTO users (name, email, password, phone, address, role) VALUES
        ('John Owner', 'owner@example.com', '$2b$10$examplehashedpassword', '+1234567890', '123 Owner Lane, New York, NY', 'owner'),
        ('Sarah User', 'user@example.com', '$2b$10$examplehashedpassword', '+1234567891', '456 User Street, New York, NY', 'user')
    `);

    await connection.execute(`
      INSERT IGNORE INTO parking_spaces (owner_id, latitude, longitude, address, price, phone, available_slots, total_slots) VALUES
        (1, 40.7128, -74.0060, '123 Main St, New York, NY 10001', 5.00, '+1234567890', 3, 3),
        (1, 40.7130, -74.0070, '456 Broadway, New York, NY 10002', 7.50, '+1234567890', 2, 2),
        (1, 40.7140, -74.0080, '789 Park Ave, New York, NY 10003', 10.00, '+1234567890', 1, 1)
    `);

    console.log('Sample data inserted successfully!');

    // Verify tables
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [parking] = await connection.execute('SELECT COUNT(*) as count FROM parking_spaces');
    const [bookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
    const [reviews] = await connection.execute('SELECT COUNT(*) as count FROM reviews');

    console.log('\\nDatabase setup complete!');
    console.log(`Users: ${users[0].count}`);
    console.log(`Parking spaces: ${parking[0].count}`);
    console.log(`Bookings: ${bookings[0].count}`);
    console.log(`Reviews: ${reviews[0].count}`);

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

setupDatabase();