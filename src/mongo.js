const { MongoClient } = require('mongodb');

// URL di connessione al tuo database MongoDB
const url = 'mongodb://10.200.200.201:27017';

// Nome del database che desideri utilizzare
const dbName = 'local';

// Crea una nuova istanza del client MongoDB
const client = new MongoClient(url);

// Funzione per connettersi al database e avviare l'applicazione
async function main() {
    try {
        // Connessione al server MongoDB
        await client.connect();
        console.log('Connesso al server MongoDB');

        // Seleziona il database
        const db = client.db(dbName);
        console.log(`Database ${dbName} selezionato`);

        // Ora puoi iniziare ad eseguire operazioni sul database, come ad esempio inserire, leggere, aggiornare o eliminare dati
        // Esempio: Leggere i documenti da una collezione
        const collection = db.collection('utenti');
        const documents = await collection.find({}).toArray();
        console.log('Documenti trovati:', documents);

    } catch (error) {
        console.error('Errore durante la connessione al server MongoDB:', error);
    } finally {
        // Chiudi la connessione quando hai finito
        await client.close();
        console.log('Connessione al server MongoDB chiusa');
    }
}

// Avvia l'applicazione
main().catch(console.error);