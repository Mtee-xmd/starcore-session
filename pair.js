const express = require('express');
const fs = require('fs');
const path = require('path');
const { makeid } = require('./id');
const router = express.Router();
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

require('events').EventEmitter.defaultMaxListeners = 100;

let activePairs = 0;
const MAX_PAIRS = 2;

function removeFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    fs.rmSync(filePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    if (activePairs >= MAX_PAIRS) return res.status(429).send({ error: 'Too many pairing requests. Try again later.' });
    activePairs++;

    const id = makeid();
    const tempPath = path.join(__dirname, 'temp', id);

    async function generatePair() {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(tempPath);

            const socket = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            socket.ev.on('creds.update', saveCreds);

            socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'open') {
                    await delay(5000);
                    const credsFile = path.join(tempPath, 'creds.json');
                    if (fs.existsSync(credsFile)) {
                        const data = fs.readFileSync(credsFile);
                        const b64data = Buffer.from(data).toString('base64');
                        await socket.sendMessage(socket.user.id, { text: 'starcore~' + b64data });
                        removeFile(tempPath);
                        await socket.ws.close();
                    }
                } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
                    await delay(10000);
                    generatePair();
                }
            });

        } catch (err) {
            console.error('Pairing failed:', err);
            removeFile(tempPath);
            if (!res.headersSent) res.send({ code: 'Service Currently Unavailable' });
        } finally {
            activePairs--;
        }
    }

    generatePair();
});

module.exports = router;