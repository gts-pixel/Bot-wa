const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino')
const qrcode = require('qrcode-terminal');
const msgg = require('./msgg');
const rpg = require('./rpg');
require('dotenv').config();
const readline = require('readline');

const conn = require('./db');
conn.query('SELECT 1', (err) => {
    if (err) console.warn('⚠️ DB error:', err.message);
    else console.log('✅ Database connected!');
});

const GRUP_IZIN = [
    '120363158480249048@g.us',
    '120363313283156757@g.us',
    '120363296922684488@g.us',
    '120363299346931674@g.us',
];

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    let NOMOR_WA = '';
        if (!state.creds.registered) {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            NOMOR_WA = await new Promise(resolve => {
                rl.question('Masukkan nomor WA bot (contoh: 6281234567890): ', ans => {
                    rl.close();
                    resolve(ans.trim());
                });
            });
        }

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent'}),
        printQRInTerminal: true,
        shouldIgnoreJid: jid => jid.endsWith('@lid'),
        getMessage: async (key) => {
            return {conversation: ''};
        }
    });

    // ── QR ──
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('Scan QR ini:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, reconnect:', shouldReconnect);
            if (shouldReconnect) startBot();
        }
        if (connection === 'open') {
            console.log('✅ Bot siap!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ── PESAN MASUK ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (msg.key.fromMe) continue;
            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');

            // Filter grup
            if (isGroup && !GRUP_IZIN.includes(from)) continue;

            // Ambil teks pesan
            const body = msg.message?.conversation
                || msg.message?.extendedTextMessage?.text
                || msg.message?.imageMessage?.caption
                || '';

            if (!body.startsWith('.')) continue;

            const command = body.slice(1).trim().toLowerCase().split(/\s+/)[0];

            const rpgCommands = [
                'login', 'change', 'profile', 'class', 'classes',
                'skill', 'skills', 'use', 'hunt', 'attack', 'flee',
                'item', 'inv', 'addstat', 'statpoint', 'leaderboard', 'lb',
                'addsysitem', 'addeffect', 'iteminfo', 'items', 'inventory',
                'equip', 'inequip', 'useitem', 'redeem', 'addcode',
                'myskills', 'skillpool', 'equipskill', 'unequipskill',
            ];

            // Bungkus msg agar kompatibel dengan handler lama
            const wrappedMsg = wrapMessage(sock, msg, from, body, isGroup);

            if (rpgCommands.includes(command)) {
                await rpg(sock, wrappedMsg).catch(e => console.error('RPG error:', e));
            } else {
                await msgg(sock, wrappedMsg).catch(e => console.error('MSGG error:', e));
            }
        }
    });

    // ── MEMBER JOIN ──
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!GRUP_IZIN.includes(id)) return;
        if (action !== 'add') return;

        try {
            const metadata = await sock.groupMetadata(id);
            for (const participant of participants) {
                const nomor = participant.split('@')[0];
                const pesanWelcome =
                    `👋 Selamat datang *@${nomor}* di grup *${metadata.subject}*!\n\n` +
                    `Senang kamu bergabung 🎉\n` +
                    `Jangan lupa baca deskripsi grup ya!`;
                await sock.sendMessage(id, {
                    text: pesanWelcome,
                    mentions: [participant]
                });
            }
        } catch (e) {
            console.error('Welcome error:', e);
        }
    });
}

// ── WRAPPER ──────────────────────────────────────────────
// Membuat object msg Baileys kompatibel dengan handler yang sudah ada
function wrapMessage(sock, msg, from, body, isGroup) {
    const senderId = isGroup
        ? (msg.key.participant || msg.key.remoteJid)
        : msg.key.remoteJid;

    const pushname = msg.pushName || senderId.split('@')[0];

    return {
        // Data dasar
        body,
        from,
        author: senderId,          // di grup = nomor pengirim
        id: msg.key.id,
        isGroup,
        pushName: pushname,
        hasMedia: !!(msg.message?.imageMessage || msg.message?.videoMessage),
        _raw: msg,                 // raw Baileys message

        // Ambil chat (simulasi)
        getChat: async () => ({
            id: { _serialized: from },
            isGroup,
            name: isGroup ? (await sock.groupMetadata(from).catch(() => ({ subject: from }))).subject : from,
            sendMessage: async (text, opts) => {
                const mentions = opts?.mentions || [];
                return sock.sendMessage(from, { text, mentions });
            },
        }),

        // Ambil kontak
        getContact: async () => ({
            pushname,
            name: pushname,
            number: senderId.split('@')[0],
        }),

        // Reply ke pesan ini
        reply: async (text) => {
            return sock.sendMessage(from, {
                text,
                quoted: msg,
            });
        },

        // Download media (jika ada)
        downloadMedia: async () => {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const mimetype = msg.message?.imageMessage?.mimetype
                || msg.message?.videoMessage?.mimetype
                || 'image/jpeg';
            return {
                data: buffer.toString('base64'),
                mimetype,
            };
        },
    };
}

startBot();