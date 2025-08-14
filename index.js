const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

require('events').EventEmitter.defaultMaxListeners = 100; // Reduce to avoid memory leaks

const app = express();
const PORT = process.env.PORT || 8000;

// Preload only essential routes to avoid slow startup
const qrRoute = require('./qr');
const codeRoute = require('./pair'); // Assuming ./pair handles both /code and /pair logic

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/qr', qrRoute);
app.use('/code', codeRoute);

app.get('/pair', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pair.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'main.html'));
});

// Start server quickly (important for Render)
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`🚀 Ready for Render on port ${PORT}`);
});

module.exports = app;