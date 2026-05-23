// msgg.js
const db = require('./db').promise(); // Import koneksi database MySQL promise wrapper

module.exports = async (client, message) => {
    try {
        const body = message.body || "";
        const sender = message.from;
        const chat = await message.getChat();
        const contact = await message.getContact();
        const nama = contact.pushname || contact.name || sender.split('@')[0];

        // Prefix Bot
        if (!body.startsWith(".")) return;

        // Ambil command setelah prefix
        const command = body.slice(1).trim().toLowerCase();

        // Simpan user ke DB kalau belum ada
        await db.query(`
            INSERT IGNORE INTO users (nomor, nama) VALUES (?, ?)
        `, [sender, nama]);

        // Log setiap perintah
        await db.query(`
            INSERT INTO log_perintah (nomor, perintah) VALUES (?, ?)
        `, [sender, command]);

        // Log pesan masuk
        console.log(`Perintah diterima: ${command} dari ${sender}`);

        switch (command) {
            case "halo":
                await chat.sendMessage("Halo! 👋 Ada yang bisa dibantu?");
                break;
            case "help":
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
                    '\n╔═══『 ⚔️ RPG Menu 』═══╗\n\n' +
                    '✦ .login     → Login Rpg\n' +
                    '✦ .change    → Ubah nama\n' +
                    '✦ .profile   → Lihat Profile\n' +
                    '✦ .class [nama class] → Pilih class\n' +
                    '✦ .classes   → Daftar Classes\n' +
                    '✦ .skill     → Skill dimiliki\n' +
                    '✦ .use [1/2/3] → Gunakan skill\n' +
                    '✦ .hunt      → Berburu monster\n' +
                    '✦ .attack    → Serang musuh\n' +
                    '✦ .flee      → Kabur Battle\n' +
                    '✦ .addstat [stat] [jumlah] → Tambah Stat\n' +
                    '✦ .statpoint → Lihat Stat Point\n' +
                    '╚══════════════════════╝'+
                    '\n\n📌 Catatan: Fitur RPG masih dalam tahap pengembangan, jadi harap bersabar ya!'
                );
                break;

            case "ping":
                const start = Date.now();
                const sent = await chat.sendMessage("Pong! 🏓");
                const ping = Date.now() - start;
                await sent.reply(`⚡ Ping: *${ping}ms*`);
                break;

            case "waktu":
                const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
                await chat.sendMessage(`🕐 Waktu sekarang: ${now}`);
                break;

            case "info":
                if (chat.isGroup) {
                    await chat.sendMessage(
                        `ℹ️ *Info Grup*\n\n` +
                        `Nama: ${chat.name}\n` +
                        `Deskripsi: ${chat.description || 'Tidak ada deskripsi'}\n` +
                        `Jumlah Anggota: ${chat.participants.length}`
                    );
                } else {
                    await chat.sendMessage("ℹ️ Info grup hanya tersedia di grup.");
                }
                break;
            case "owner":
                await chat.sendMessage(
                    "👤 *Info Pembuat Bot*\n\n" +
                    "Nama: カビゴンSnorlax\n" +
                    "GitHub: https://github.com/gts-pixel"
                );
                break;
            case "sticker":
                if (message.hasMedia) {
                    const media = await message.downloadMedia();    
                    await message.reply(media, null, { sendMediaAsSticker: true });
                } else {
                    await chat.sendMessage("❌ Balas gambar dengan caption .sticker untuk membuat stiker.");
                }
            case "s":
                if (message.hasMedia) {
                    const media = await message.downloadMedia();  
                    await message.reply(media, null, { sendMediaAsSticker: true });  
                    } else {
                    await chat.sendMessage("❌ Balas gambar dengan caption .sticker untuk membuat stiker.");
                }
                break;
            case "toimg":
                if (message.hasMedia) {
                    const media = await message.downloadMedia();
                    await message.reply(media, null, { sendMediaAsSticker: false }); 
                } else {
                    await chat.sendMessage("❌ Balas stiker dengan caption .toimg untuk mengubahnya menjadi gambar.");
                }
                break;    
            case "update":
                await chat.sendMessage("Penambahan fitur .hunt, .attack, dan .flee ");
                await chat.sendMessage("\n untuk kedepannya tidak akan ada update fitur baru dan kemungkinan tidak ada perbaikan sementara hingga awal bulan depan")    
                break;
            default:
                await chat.sendMessage(`❓ Command *.${command}* tidak dikenal. Ketik *.help* untuk melihat daftar perintah.`);
                break;
        }

    } catch (error) {
        console.error("Error di msgg:", error);
    }
};
