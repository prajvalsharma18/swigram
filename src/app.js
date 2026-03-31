const express = require('express');
const path = require('path');       
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const authRouter = require('./routes/auth.routes.js');
const frontendPath = path.join(__dirname, '..', 'frontend');

app.use(express.static(frontendPath)); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); 

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));  
});

app.use('/auth', authRouter);


module.exports = app;     