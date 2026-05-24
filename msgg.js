// msgg.js — Baileys compatible
const db = require('./db').promise();

module.exports = async (sock, message) => {
    try {
        const body   = message.body || '';
        const sender = message.from;
        const chat   = await message.getChat();
        const contact = await message.getContact();
        const nama   = contact.pushname || sender.split('@')[0];

        if (!body.startsWith('.')) return;

        // Ambil command (full, tanpa split — biar ping dll bisa pakai const)
        const fullCmd = body.slice(1).trim().toLowerCase();
        const command = fullCmd.split(/\s+/)[0];

        await db.query('INSERT IGNORE INTO users (nomor, nama) VALUES (?, ?)', [sender, nama]);
        await db.query('INSERT INTO log_perintah (nomor, perintah) VALUES (?, ?)', [sender, command]);
        console.log(`Perintah: ${command} dari ${sender}`);

        switch (command) {
            case 'halo':
                await chat.sendMessage('Halo! 👋 Ada yang bisa dibantu?');
                break;

            case 'help':
                await chat.sendMessage(
                    '╔═══『 📜 Menu Bot 』═══╗\n\n' +
                    '✦ .halo      → Menyapa bot\n' +
                    '✦ .waktu     → Jam sekarang\n' +
                    '✦ .help      → Menu ini\n' +
                    '✦ .ping      → Cek koneksi\n' +
                    '✦ .info      → Info grup\n' +
                    '✦ .owner     → Info pembuat bot\n' +
                    '✦ .sticker   → Ubah gambar jadi stiker\n' +
                    '✦ .update    → Lihat update terbaru\n' +
                    '╚══════════════════════╝\n\n' +
                    '╔═══『 ⚔️ RPG Menu 』═══╗\n\n' +
                    '✦ .login     → Login RPG\n' +
                    '✦ .change    → Ubah nama\n' +
                    '✦ .profile   → Lihat Profile\n' +
                    '✦ .class [nama] → Pilih class\n' +
                    '✦ .classes   → Daftar Classes\n' +
                    '✦ .skill     → Skill dimiliki\n' +
                    '✦ .use [1/2/3] → Gunakan skill\n' +
                    '✦ .hunt      → Berburu monster\n' +
                    '✦ .attack    → Serang musuh\n' +
                    '✦ .flee      → Kabur Battle\n' +
                    '✦ .item [nama] → Pakai item\n' +
                    '✦ .inv       → Lihat inventory\n' +
                    '✦ .addstat [stat] [jml] → Tambah Stat\n' +
                    '✦ .statpoint → Lihat Stat Point\n' +
                    '╚══════════════════════╝\n\n' +
                    '📌 Fitur RPG masih dalam pengembangan!\n' +
                    '\nketik .update untuk melihat update terbaru!'
                );
                break;

            case 'ping': {
                const start = Date.now();
                await chat.sendMessage('Pong! 🏓');
                const ping = Date.now() - start;
                await chat.sendMessage(`⚡ Ping: *${ping}ms*`);
                break;
            }

            case 'waktu': {
                const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                await chat.sendMessage(`🕐 Waktu sekarang: ${now}`);
                break;
            }

            case 'info':
                if (message.isGroup) {
                    await chat.sendMessage(
                        `ℹ️ *Info Grup*\n\n` +
                        `Nama: ${chat.name}\n` +
                        `Deskripsi: ${chat.description || 'Tidak ada deskripsi'}\n` 
                    );
                } else {
                    await chat.sendMessage('ℹ️ Info grup hanya tersedia di grup.');
                }
                break;

            case 'owner':
                await chat.sendMessage(
                    '👤 *Info Pembuat Bot*\n\n' +
                    'Nama: カビゴンSnorlax\n' +
                    'GitHub: https://github.com/gts-pixel'
                );
                break;

            case 'sticker':
            case 's':
                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    await sock.sendMessage(sender, {
                        sticker: Buffer.from(media.data, 'base64'),
                    });
                } else {
                    await chat.sendMessage('❌ Balas gambar dengan caption .sticker untuk membuat stiker.');
                }
                break;

            case 'update':
                await chat.sendMessage('Penambahan fitur .inv, .item' + '\nFitur ini masih dalam tahap beta dan masih butuh perbaikan kedepannya');
                break;

            default:
                await chat.sendMessage(`❓ Command *.${command}* tidak dikenal. Ketik *.help* untuk daftar perintah.`);
        }

    } catch (err) {
        console.error('Error di msgg:', err);
    }
};