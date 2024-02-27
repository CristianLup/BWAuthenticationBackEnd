const express = require('express');
const bodyParser = require('body-parser');
const radius = require('radius');
const dgram = require('dgram');
const mysql = require('mysql');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per analizzare i body JSON
app.use(bodyParser.json());

// Configurazione del server RADIUS
const radiusServer = {
    host: '10.200.200.201', 
    port: 1812, 
    secret: 'Tirocinio123' 
};

// Configurazione di MySQL
const mysqlConnection = mysql.createConnection({
    host: '10.200.200.201',
    user: 'radius',
    password: 'radiuspassword',
    database: 'radius'
});

mysqlConnection.connect((err) => {
    if (err) {
        console.error('Errore durante la connessione a MySQL:', err);
        throw err;
    }
    console.log('Connessione a MySQL avvenuta con successo');
});

// Connessione al database MongoDB
const mongoClient = new MongoClient('mongodb://10.200.200.201:27017', { useNewUrlParser: true, useUnifiedTopology: true });
mongoClient.connect((err) => {
    if (err) {
        console.error('Errore durante la connessione a MongoDB:', err);
        throw err;
    }
    console.log('Connessione a MongoDB avvenuta con successo');
});

// Route per gestire la registrazione di un nuovo utente
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Verifica se l'utente esiste già nel database MySQL
    mysqlConnection.query('SELECT * FROM radcheck WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Errore durante la verifica dell\'utente:', err);
            res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
            return;
        }

        if (results.length > 0) {
            res.status(400).json({ error: 'L\'utente esiste già' });
            return;
        }

        // Inserimento del nuovo utente nel database MySQL
        mysqlConnection.query('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [username, 'Cleartext-Password', ':=', password], (err, result) => {
            if (err) {
                console.error('Errore durante l\'inserimento dell\'utente:', err);
                res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
                return;
            }
            console.log('Nuovo utente registrato:', { username, password });

            // Salvataggio del log nel database MongoDB
            const db = mongoClient.db('local');
            const collection = db.collection('audit');
            collection.insertOne({ username, action: 'registration', success: true }, (err, result) => {
                if (err) {
                    console.error('Errore durante il salvataggio del log di registrazione:', err);
                    return;
                }
                console.log('Log di registrazione salvato con successo:', result.insertedId);
            });

            res.json({ success: true });
        });
    });
});

// Route per gestire l'autenticazione degli utenti
app.post('/authenticate', async (req, res) => {
    const { username, password } = req.body;

    // Connessione al server RADIUS per l'autenticazione
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
            console.error('Richiesta di autenticazione fallita:', err);
            res.status(500).json({ error: 'Richiesta di autenticazione fallita' });
            return;
        }

        client.once('message', (response) => {
            const decodedResponse = radius.decode({ packet: response, secret: radiusServer.secret });
            if (decodedResponse.code === 'Access-Accept') {
                // Salvataggio del log di autenticazione nel database MongoDB
                const db = mongoClient.db('local');
                const collection = db.collection('audit');
                collection.insertOne({ username, action: 'authentication', success: true }, (err, result) => {
                    if (err) {
                        console.error('Errore durante il salvataggio del log di autenticazione:', err);
                        return;
                    }
                    console.log('Log di autenticazione salvato con successo:', result.insertedId);
                });
                res.json({ success: true });
            } else {
                res.status(401).json({ success: false });
            }
            client.close();
        });
    });
});

// Avvio del server Express
app.listen(PORT, () => {
    console.log(`Server in esecuzione sulla porta ${PORT}`);
});
