const express = require('express');
const path = require('path');       
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const authRouter = require('./routes/auth.routes.js');
const reelsRouter = require('./routes/reels.routes.js');
const frontendPath = path.join(__dirname, '..', 'frontend');
const authenticationPath = path.join(frontendPath, 'authentication');

app.use(express.static(frontendPath));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

function sendAuthenticationPage(res) {
    res.sendFile(path.join(authenticationPath, 'index.html'));
}

app.get('/', (req, res) => {
    sendAuthenticationPage(res);
});

app.get(['/authentication', '/authentication/'], (req, res) => {
    sendAuthenticationPage(res);
});

app.use('/api/auth', authRouter);

app.use('/api/reels', reelsRouter);

module.exports = app;     