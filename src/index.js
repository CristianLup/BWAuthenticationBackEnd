const express = require('express');
const bodyParser = require('body-parser');
const radius = require('radius');
const dgram = require('dgram');
const mysql = require('mysql');

const mongo = require('./controllers/mongoHandle.js');

const app = express();
const PORT = process.env.PORT || 3000;
const apiUrl = 'http://10.200.200.1:8080/api/v2/'; 

app.use(bodyParser.urlencoded({ extended: true }));

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

// Route per gestire la registrazione di un nuovo utente
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Verifica se l'utente esiste già nel database MySQL
    mysqlConnection.query('SELECT * FROM radcheck WHERE username = ?', [username], (err, results) => {
        if (err) {
            mongo.insertMongoString(username,'registrazione','failed')

            console.error('Errore durante la verifica dell\'utente:', err);
            res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
            return;
        }

        if (results.length > 0) {

            mongo.insertMongoString(username,'registrazione','user_existing')
            //res.status(400).json({ error: 'L\'utente esiste già' });

            const script = `
      <script>
        alert("Utente già esistente!");
      </script>
    `;
    // Invia la risposta al client, includendo lo script JavaScript
    res.send(script);
    res.redirect('http://10.200.200.3:3001')
    return;
        }

        // Inserimento del nuovo utente nel database MySQL
        mysqlConnection.query('INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)', [username, 'Cleartext-Password', ':=', password], (err, result) => {
            if (err) {
                mongo.insertMongoString(username,'registrazione','err_sql_insert')
                console.error('Errore durante l\'inserimento dell\'utente:', err);
                res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
                return;
            }
            
            console.log('Nuovo utente registrato:', { username, password });


            mongo.insertMongoString(username,'registrazione','sql_success_register');


        });

        // TESTUSERGROUP
        mysqlConnection.query('INSERT INTO radusergroup (username,groupname,priority) VALUES (?, ?, ?)', [username, 'usersTirocinio', 0], (err, result) => {
            if (err) {
                mongo.insertMongoString(username,'registrazione','err_sql_insert_group');

                console.error('Errore durante l\'inserimento dell\'utente:', err);
                res.status(500).json({ error: 'Errore durante la registrazione dell\'utente' });
                return;
            }
            
            // Salvataggio del log nel database MongoDB
            mongo.insertMongoString(username,'registrazione','sql_success_register_group');

            res.json({ success: true });
        });


    });
});



// Route per gestire l'autenticazione degli utenti
app.post('/authenticate', async (req, res) => {
    console.log(req.body)
    const { username, password } = req.body;

    console.log(username,password)

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
            
            mongo.insertMongoString(username,'autenticazione',decodedResponse.code );

               

            if (decodedResponse.code === 'Access-Accept') {

//TEST
            
//TEST

                res.redirect('http://10.200.200.3:3001/success')
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
