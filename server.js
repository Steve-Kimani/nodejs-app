// server.js (ESM)
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';

// Configure environment variables
dotenv.config();

// Reconstruct __dirname and __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Read the Cloudflare Origin CA Root Certificate
const caCertPath = path.join(__dirname, process.env.CA_CERT_PATH);
let caCert;
try {
    caCert = fs.readFileSync(caCertPath);
    console.log(`Successfully loaded CA certificate from ${caCertPath}`);
} catch (err) {
    console.error(`Failed to load CA certificate from ${caCertPath}:`, err);
    process.exit(1); // Exit the application if the certificate can't be loaded
}

// Create an HTTPS agent with the custom CA
const httpsAgent = new https.Agent({
    ca: caCert
});

// POST route to handle form submissions
app.post('/submit-form', async (req, res) => {
    const payload = req.body;

    try {
        // Make the request to the external API with environment variables
        const response = await fetch('https://muledev.touchsuite.com/json2sf/uma', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client_id': process.env.CLIENT_ID,        // from .env
                'client_secret': process.env.CLIENT_SECRET // from .env
            },
            body: JSON.stringify(payload),
            agent: httpsAgent // Use the custom agent
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Received non-JSON response');
        }

        const result = await response.json();
        return res.status(response.status).json(result);
    } catch (error) {
        console.error('Error during fetch to /json2sf/uma:', error);
        return res.status(500).json({
            Error: "Internal Server Error",
            Description: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
            Code: "500"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
