const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Start server immediately to pass Render port scan
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Load routers after server is listening
app.use('/qr', require('./qr'));
app.use('/pair', require('./pair'));

// Serve static HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.get('/pair.html', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));