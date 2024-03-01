const express = require('express');
const bodyParser = require('body-parser');
const radius = require('radius');
const dgram = require('dgram');
const mysql = require('mysql');
const fetch = require('node-fetch');
const mongo = require('./controllers/mongoHandle.js');

const app = express();
const PORT = process.env.PORT || 3000;


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

//TEST URL

//TEST URL




    console.log(req.body)
    const { username, password, magic, post } = req.body;

    console.log(username,password,magic,post)

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

        client.once('message', async (response) => {
            const decodedResponse = radius.decode({ packet: response, secret: radiusServer.secret });
            
            mongo.insertMongoString(username,'autenticazione',decodedResponse.code );

               

            if (decodedResponse.code === 'Access-Accept') {

//TEST
const formData = new URLSearchParams();
    formData.append('magic', magic);
    formData.append('username', username);
    formData.append('password', password);

  try {
    // Invio della richiesta POST all'URL di destinazione
    const response = await fetch('http://10.233.233.1:1000/fgtauth', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      
    });
    console.log('POROCCCIO'+response)
    const data = await response.json();
    console.log(data);
//        res.send('Login avvenuto con successo');

    //      if (response.ok) {
//        res.send('Login avvenuto con successo');
//      } else {
//        res.status(response.status).send('Errore durante il login');
//      }
    } catch (error) {
      console.error('Errore durante la richiesta al server:', error);
      res.status(500).send('Errore interno del server');
    }


//TEST

           //     res.redirect('http://10.200.200.3:3001/success')
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
