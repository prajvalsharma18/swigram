const mongoose = require('mongoose');

require('dotenv').config();

const rawMongoUri = (process.env.MONGO_URI || '').trim();
const MONGO_URI = rawMongoUri.replace('majority;', 'majority');

if (!MONGO_URI) {
    console.log('Error connecting to MongoDB: MONGO_URI is missing');
} else {
    mongoose.connect(MONGO_URI)
    .then(() =>{
        console.log('Connected to MongoDB');
    }).catch(err =>{
        console.log('Error connecting to MongoDB:', err);
    });
}