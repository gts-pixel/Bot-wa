// msgg.js — Baileys compatible
const db = require('./db').promise();
const { checkCooldown } = require ('./rpg_system/cd')
const sharp = require('sharp');
const axios = require('axios');

module.exports = async (sock, message) => {
    try {
        const body   = message.body || '';
        const sender = message.from;
        const chat   = await message.getChat();
        const contact = await message.getContact();
        const nama   = contact.pushname || sender.split('@')[0];

        if (!body.startsWith('.')) return;

        // Ambil command (full, tanpa split — biar ping dll bisa pakai const)
        const fullCmd = body.slice(1).trim();
        const command = fullCmd.split(/\s+/)[0].toLowerCase();

        await db.query('INSERT IGNORE INTO users (nomor, nama) VALUES (?, ?)', [sender, nama]);
        await db.query('INSERT INTO log_perintah (nomor, perintah) VALUES (?, ?)', [sender, command]);
        console.log(`Perintah: ${command} dari ${sender}`);

        // ── ANTI-SPAM COOLDOWN ──
        const sisaCD = checkCooldown(sender);
        if (sisaCD > 0) {
            await chat.sendMessage(`⏳ Tunggu *${sisaCD} detik* lagi sebelum pakai command berikutnya.`);
            return;
        }

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
                    '✦ .play      → Memutar lagu\n' +
                    '╚══════════════════════╝\n\n' +

                    '╔══『 📜 Menu Downloader 』══╗\n\n' +
                    '✦ .tt        → Download video tiktok\n' +
                    '✦ .ig        → Download video instagram\n' +
                    '✦ .ytmp4     → Download video youtube\n' +
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
                    const buffer = Buffer.from(media.data, 'base64');
                    try {
                        const webp = await sharp(buffer)
                            .resize(512, 512, { fit: 'inside' })
                            .webp({ quality: 100 })
                            .toBuffer();

                        await sock.sendMessage(sender, { sticker: webp });
                    } catch (e) {
                        console.error('Gagal konversi gambar ke WebP:', e);
                        await chat.sendMessage('❌ Gagal membuat stiker. Coba kirim gambar yang lain.');
                    }
                } else {
                    await chat.sendMessage('❌ Balas gambar dengan caption .sticker untuk membuat stiker.');
                }
                break;

            case 'tt':
            case 'tiktok': {
                const text = fullCmd.slice(command.length).trim();

                if (!text) {
                    return await chat.sendMessage('❌ Gunakan format: .tt [link]');
                }

                console.log("BODY =", JSON.stringify(body));
                console.log("TEXT =", JSON.stringify(text));

                const api = `https://storeapi.ubet.my.id/api/tiktok?apikey=ubedpanel&url=${encodeURIComponent(text)}`;

                console.log("API :", api);

                try {
                    

                    const { data } = await axios.get(api, {
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    console.log(data);

                    if (!data.success) {
                        return await chat.sendMessage("❌ Gagal mengambil data TikTok.");
                    }

                    const video =
                        data.video?.hd ||
                        data.video?.nowm ||
                        data.video?.sd ||
                        data.video?.wm;

                    if (!video) {
                        return await chat.sendMessage("❌ URL video tidak ditemukan.");
                    }

                    

                    // Download video terlebih dahulu
                    const res = await axios.get(video, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    await sock.sendMessage(sender, {
                        video: Buffer.from(res.data),
                        mimetype: "video/mp4",
                        caption: `*TikTok Downloader*\n\n${data.title || "-"}`
                    });

                } catch (e) {
                    console.error("TikTok Error:", e);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }

                break;
            }

            case 'ig' : 
            case 'instagram' : {
                const text = fullCmd.slice(command.length).trim();

                if (!text) {
                    return await chat.sendMessage('❌ Gunakan format: .ig [link]');
                }

                console.log("BODY =", JSON.stringify(body));
                console.log("TEXT =", JSON.stringify(text));

                const api = `https://storeapi.ubet.my.id/api/instagram?apikey=ubedpanel&url=${encodeURIComponent(text)}`;

                console.log("API :", api);

                try {
                    

                    const { data } = await axios.get(api, {
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    console.log(data);

                    if (!data.success) {
                        return await chat.sendMessage("❌ Gagal mengambil data Instagram.");
                    }

                    const video =
                        data.video ||
                        data.video?.[0] ||
                        data.media?.[0];

                    if (!video) {
                        return await chat.sendMessage("❌ URL video tidak ditemukan.");
                    }

                    

                    // Download video terlebih dahulu
                    const res = await axios.get(video, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    await sock.sendMessage(sender, {
                        video: Buffer.from(res.data),
                        mimetype: "video/mp4",
                        caption: `*Instagram Downloader*\n\n${data.title || "-"}`
                    });

                } catch (e) {
                    console.error("Instagram Error:", e);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }

                break;
            }

            case 'pin':
            case 'pinterest': {
                const text = body.slice(body.indexOf(" ") + 1).trim(); // jangan pakai fullCmd

                if (!text || text === ".pin" || text === ".pinterest") {
                    return await chat.sendMessage("❌ Gunakan format: .pin [keyword]");
                }

                const api = `https://storeapi.ubet.my.id/api/pinterest?apikey=ubedpanel&q=${encodeURIComponent(text)}`;

                console.log("BODY :", body);
                console.log("TEXT :", text);
                console.log("API  :", api);

                try {
                    const { data } = await axios.get(api);

                    console.log(data);

                    if (!data.success) {
                        return await chat.sendMessage("❌ Gagal mengambil data Pinterest.");
                    }

                    if (!data.results || data.results.length === 0) {
                        return await chat.sendMessage("❌ Tidak ada hasil.");
                    }

                    await chat.sendMessage(
                        `📌 *Pinterest Search*\n\n` +
                        `Keyword : ${data.query}\n` +
                        `Total : ${data.total}`
                    );

                    const media = data.results[Math.floor(Math.random() * data.results.length)];

                    await sock.sendMessage(sender, {
                        image: { url: media.image },
                        caption: media.link
                    });

                } catch (err) {
                    console.error(err);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }

                break;
            }

            case 'ytmp4' : {
                const text = fullCmd.slice(command.length).trim();

                if (!text) {
                    return await chat.sendMessage('❌ Gunakan format: .ytmp4 [link]');
                }

                console.log("BODY =", JSON.stringify(body));
                console.log("TEXT =", JSON.stringify(text));

                const api = `https://storeapi.ubet.my.id/api/ytmp4?apikey=ubedpanel&url=${encodeURIComponent(text)}`;

                console.log("API :", api);

                try {
                    

                    const { data } = await axios.get(api, {
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    console.log(data);

                    if (!data.success) {
                        return await chat.sendMessage("❌ Gagal mengambil data YouTube.");
                    }

                    const video =
                        data.video;

                    if (!video) {
                        return await chat.sendMessage("❌ URL video tidak ditemukan.");
                    }

                    

                    // Download video terlebih dahulu
                    const res = await axios.get(video, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    await sock.sendMessage(sender, {
                        video: Buffer.from(res.data),
                        mimetype: "video/mp4",
                        caption: `*YouTube Downloader*\n\n${data.title || "-"}`
                    });

                } catch (e) {
                    console.error("YouTube Error:", e);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }

                break;
            }
 
            case 'play' : {
                const text = fullCmd.slice(command.length).trim();

                if (!text) {
                    return await chat.sendMessage('❌ Gunakan format: .play [link]');
                }

                console.log("BODY =", JSON.stringify(body));
                console.log("TEXT =", JSON.stringify(text));

                const api = `https://storeapi.ubet.my.id/api/play?apikey=ubedpanel&q=${encodeURIComponent(text)}`;

                console.log("API :", api);

                try {
                    

                    const { data } = await axios.get(api, {
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    console.log(data);

                    if (!data.success) {
                        return await chat.sendMessage("❌ Gagal mengambil data Play.");
                    }

                    const video =
                        data.video?.hd ||
                        data.video?.nowm ||
                        data.video?.sd ||
                        data.video?.wm;

                    if (!video) {
                        return await chat.sendMessage("❌ URL video tidak ditemukan.");
                    }

                    

                    // Download video terlebih dahulu
                    const res = await axios.get(video, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    await sock.sendMessage(sender, {
                        video: Buffer.from(res.data),
                        mimetype: "video/mp4",
                        caption: `*Play Music Downloader*\n\n${data.title || "-"}`
                    });

                } catch (e) {
                    console.error("Play Music Error:", e);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }
                break;
            }

            case 'update':
                await chat.sendMessage(
                    'Penambahan fitur Menu Downloader dan Play Music\n'
                );
                break;

            case 'kosong':
                await chat.sendMessage('');
                break;

            default:
                await chat.sendMessage(`❓ Command *.${command}* tidak dikenal. Ketik *.help* untuk daftar perintah.`);
        }

    } catch (err) {
        console.error('Error di msgg:', err);
    }
};