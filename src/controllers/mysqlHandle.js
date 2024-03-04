const mongo = require('./controllers/mongoHandle.js');
const mysql = require('mysql')

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

exports.insertUserMysql = function (username){
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

}