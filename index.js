const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');

// Limit max listeners to reduce memory usage
require('events').EventEmitter.defaultMaxListeners = 100;

const app = express();
const PORT = process.env.PORT || 8000;

// --- Start server immediately to pass Render port scan ---
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes (load light, avoid blocking)
app.use('/qr', require('./qr'));       // Session QR route
app.use('/code', require('./pair'));   // Code generation logic

// Static HTML pages
app.get('/pair', (req, res) => res.sendFile(path.join(process.cwd(), 'pair.html')));
app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'main.html')));