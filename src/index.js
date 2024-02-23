const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

const url = 'mongodb://10.200.200.201:27017';
const dbName = 'mydatabase';

// Middleware per il parsing del body delle richieste
app.use(express.json());

// Connessione al database MongoDB
async function connectToMongoDB() {
    const client = new MongoClient(url, { useUnifiedTopology: true });

    try {
        await client.connect();
        console.log('Connessione a MongoDB avvenuta con successo');
        return client.db(local);
    } catch (error) {
        console.error('Errore durante la connessione a MongoDB:', error);
        throw error;
    }
}

// Gestione delle richieste HTTP con Express
app.get('/', async (req, res) => {
    const db = await connectToMongoDB();
    const usersCollection = db.collection('utenti');

    try {
        const users = await usersCollection.find({}).toArray();
        res.json(users);
    } catch (error) {
        console.error('Errore durante il recupero degli utenti:', error);
        res.status(500).send('Errore durante il recupero degli utenti');
    } finally {
        await db.client.close();
    }
});

app.post('/users', async (req, res) => {
    const db = await connectToMongoDB();
    const usersCollection = db.collection('users');
    const newUser = req.body;

    try {
        await usersCollection.insertOne(newUser);
        res.status(201).send('Utente creato con successo');
    } catch (error) {
        console.error('Errore durante la creazione dell\'utente:', error);
        res.status(500).send('Errore durante la creazione dell\'utente');
    } finally {
        await db.client.close();
    }
});

// Avvio del server Express
app.listen(port, () => {
    console.log(`Server Express in esecuzione sulla porta ${port}`);
});