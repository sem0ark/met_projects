const express = require('express');
const mysql = require('mysql2/promise');
const redis = require('redis');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

let dbConnection;
let redisClient;

// Function to read secrets from files
const getSecret = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8').trim();
    } catch (error) {
        console.error(`Error reading secret from ${filePath}:`, error.message);
        return null; // Or throw an error
    }
};

const initDbAndRedis = async () => {
    try {
        const mysqlUserPassword = getSecret(process.env.MYSQL_USER_PASSWORD_FILE);
        const redisPassword = getSecret(process.env.REDIS_PASSWORD_FILE);

        if (!mysqlUserPassword || !redisPassword) {
            throw new Error("Missing database or Redis passwords.");
        }

        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: mysqlUserPassword,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });
        console.log('Connected to MySQL database!');

        redisClient = redis.createClient({
            url: `redis://default:${redisPassword}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        });
        redisClient.on('error', err => console.error('Redis Client Error', err));
        await redisClient.connect();
        console.log('Connected to Redis!');

    } catch (error) {
        console.error('Failed to connect to DB or Redis:', error);
        // In a real app, you might want to exit or retry
    }
};

app.get('/health', (req, res) => {
    // Check if DB and Redis connections are active
    const dbHealthy = dbConnection && dbConnection.connection.state === 'authenticated';
    const redisHealthy = redisClient && redisClient.isReady;

    if (dbHealthy && redisHealthy) {
        res.status(200).send('OK');
    } else {
        res.status(500).send('Dependencies not healthy');
    }
});

app.get('/', async (req, res) => {
    try {
        // Example: Fetch data from DB
        const [rows] = await dbConnection.execute('SELECT 1 + 1 AS solution');
        const solution = rows[0].solution;

        // Example: Set/Get data from Redis
        await redisClient.set('mykey', 'Hello from Redis!');
        const redisValue = await redisClient.get('mykey');

        res.json({
            message: 'Hello from Backend!',
            db_status: `MySQL connected, 1+1 solution: ${solution}`,
            redis_status: `Redis connected, mykey: ${redisValue}`
        });
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, async () => {
    console.log(`Backend API listening on port ${port}`);
    await initDbAndRedis();
});
