const { MongoClient } = require('mongodb');

const mongoClient = new MongoClient('mongodb://10.200.200.201:27017', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoClient.db('local');
const collection = db.collection('audit');

mongoClient.connect((err) => {
    if (err) {
        console.error('Errore durante la connessione a MongoDB:', err);
        throw err;
    }
    console.log('Connessione a MongoDB avvenuta con successo');
});


exports.insertMongoString = function(username, action, outcome){
    collection.insertOne({ username, action: action, outcome: outcome }, (err, result) => {
        if (err) {
            console.error('Errore durante il salvataggio del log di ${action}', err);
            return;
        }
        console.log('Log di ${action} salvato con successo:', result.insertedId);
    });
}