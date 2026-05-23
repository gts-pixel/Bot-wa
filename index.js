const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const msgg = require('./msgg');
const rpg = require('./rpg');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const GRUP_IZIN = [
    '120363299346931674@g.us',
    '120363158480249048@g.us',
    '120363313283156757@g.us',
    '120363296922684488@g.us',
];

client.on('qr', (qr) => {
    console.log('Scan QR ini di WhatsApp kamu:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot siap!');
});

require('dotenv').config();
const conn = require('./db');

// Test database connection (optional)
conn.query('SELECT * FROM users', (err, rows) => {
  if (err) {
    console.warn('⚠️ Database query error (bot will continue):', err.message);
  } else {
    console.log('📊 Database query result:', rows);
  }
});

// ✅ Event message — sambungkan ke msgg.js atau rpg.js
client.on('message', async (message) => {
    const chat = await message.getChat();
    if (chat.isGroup && !GRUP_IZIN.includes(chat.id._serialized)) return;

    console.log(chat.id._serialized);

    const body = message.body || '';
    const command = body.startsWith('.') ? body.slice(1).trim().toLowerCase().split(/\s+/)[0] : '';

    // Daftar command RPG
    const rpgCommands = ['login', 'change', 'halo', 
        'profile', 'class', 'classes', 
        'skills', 'use', 'hunt', 
        'attack', 'flee', 'skill',
        'addstat', 'statpoint'];

    if (rpgCommands.includes(command)) {
        await rpg(client, message);
        return;
    }

    await msgg(client, message);
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();

        if (!GRUP_IZIN.includes(chat.id._serialized)) return;

        const namaMember = notification.recipientIds[0].split('@')[0];
        const namaGroup = chat.name;

        const pesanWelcome =
            `👋 Selamat datang *@${namaMember}* di grup *${namaGroup}*!\n\n` +
            `Senang kamu bergabung 🎉\n` +
            `Jangan lupa baca deskripsi grup ya!` +
            `\nKetik *.help* untuk melihat menu perintah yang tersedia.`;

        await chat.sendMessage(pesanWelcome, {
            mentions: [notification.recipientIds[0]]
        });

    } catch (error) {
        console.error('Error welcome:', error);
    }
});

client.initialize();