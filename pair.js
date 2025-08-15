const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const router = express.Router();
const {
    default: Malvin_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

// Reduce default max listeners to avoid memory leaks
require('events').EventEmitter.defaultMaxListeners = 100;

// Concurrency control
let activeSessions = 0;
const MAX_SESSIONS = 2;

// Helper to remove files/folders safely
function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

// QR route
router.get('/', async (req, res) => {
    if (activeSessions >= MAX_SESSIONS) {
        return res.status(429).send({ error: 'Too many session requests. Try again later.' });
    }
    activeSessions++;

    const id = makeid();
    let num = req.query.number;

    async function generateSession() {
        const tempPath = path.join(__dirname, 'temp', id);
        const { state, saveCreds } = await useMultiFileAuthState(tempPath);

        try {
            const socket = Malvin_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            socket.ev.on('creds.update', saveCreds);

            // Request pairing code if not registered
            if (!socket.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await socket.requestPairingCode(num);
                if (!res.headersSent) {
                    res.send({ code });
                }
            }

            // Handle connection updates
            socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    await delay(5000);

                    // Read creds file briefly, convert to Base64, send, then free memory
                    const credsFile = path.join(tempPath, 'creds.json');
                    if (fs.existsSync(credsFile)) {
                        const data = fs.readFileSync(credsFile);
                        const b64data = Buffer.from(data).toString('base64');

                        await socket.sendMessage(socket.user.id, { text: 'starcore~' + b64data });

                        // Optional: send decorative message
                        const msgText = `
╭─═⌬─⊹⊱✦⊰⊹─═⌬─ 
╎   『 SESSION CONNECTED 』   
╎  ✦ sᴛᴀʀᴄᴏʀᴇ session
╎  ✦ by dev Malvin
╰╴╴╴
                        `;
                        await socket.sendMessage(socket.user.id, { text: msgText });

                        // Cleanup
                        removeFile(tempPath);
                        await delay(100);
                        await socket.ws.close();
                    }
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    generateSession(); // Retry
                }
            });

        } catch (err) {
            console.error('Session generation failed:', err);
            removeFile(tempPath);
            if (!res.headersSent) {
                res.send({ code: 'Service Currently Unavailable' });
            }
        } finally {
            activeSessions--;
        }
    }

    generateSession();
});

module.exports = router;