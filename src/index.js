const express = require('express');
const bodyParser = require('body-parser');
const radius = require('radius');
const dgram = require('dgram');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// RADIUS server configuration
const radiusServer = {
    host: '10.200.200.201', // Replace with your RADIUS server IP
    port: 1812, // RADIUS server port (usually 1812 for authentication)
    secret: 'Tirocinio123' // Shared secret
};

// Route to handle user authentication
app.post('/authenticate', (req, res) => {
    const { username, password } = req.body;

    const packet = {
        code: 'Access-Request',
        secret: radiusServer.secret,
        attributes: [
            ['User-Name', username],
            ['User-Password', password]
        ]
    };

    const client = dgram.createSocket('udp4');

    const encodedPacket = radius.encode(packet);
    client.send(encodedPacket, 0, encodedPacket.length, radiusServer.port, radiusServer.host, (err) => {
        if (err) {
            console.error('Authentication request failed:', err);
            res.status(500).json({ error: 'Authentication request failed' });
            return;
        }

        client.once('message', (response) => {
            const decodedResponse = radius.decode({ packet: response, secret: radiusServer.secret });
            if (decodedResponse.code === 'Access-Accept') {
                res.json({ success: true });
            } else {
                res.status(401).json({ success: false });
            }
            client.close();
        });
    });
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});