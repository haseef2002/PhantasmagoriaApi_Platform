const mysql = require('mysql2/promise');
require('dotenv').config();

// 1. Create a connection pool to manage concurrent database connections
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, // Allows up to 10 concurrent connections at a time
    queueLimit: 0
});

// 2. Test the connection on initialization
const testConnection = async () => {
    try {
        // Attempt to get a connection from the pool
        const connection = await pool.getConnection();
        console.log('--- Successfully connected to the MySQL database (phantasmagoria_db)----');
        
        // Always release the connection back to the pool when done
        connection.release();
    } catch (error) {
        console.error('... Error connecting to the MySQL database:', error.message);
        // Optional: Exit the process if the database connection fails, 
        // as the API cannot function without it.
        process.exit(1); 
    }
};

// Execute the test
testConnection();

// 3. Export the pool to be used directly inside the model files
module.exports = pool;