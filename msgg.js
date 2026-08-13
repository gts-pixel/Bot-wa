// msgg.js — Baileys compatible
const db = require('./db').promise();
const { checkCooldown } = require ('./rpg_system/cd')
const axios = require('axios');

// ══════════════════════════════════════════
// MENU DATA — dipake .menu [kategori] & .help
// ══════════════════════════════════════════
const MENU_DATA = {
    bot: {
        title: '🤖 Menu Bot Umum',
        items: [
            ['.halo', 'Menyapa bot'],
            ['.waktu', 'Jam sekarang'],
            ['.ping', 'Cek koneksi'],
            ['.info', 'Info grup'],
            ['.owner', 'Info pembuat bot'],
            ['.update', 'Lihat update terbaru'],
            ['.menu [kategori]', 'Buka menu kategori tertentu'],
        ],
    },
    downloader: {
        title: '📥 Menu Downloader',
        items: [
            ['.tt [link]', 'Download video TikTok'],
            ['.ig [link]', 'Download video Instagram'],
            ['.pin [keyword]', 'Cari & kirim gambar Pinterest'],
            ['.ytmp4 [link]', 'Download video YouTube'],
            ['.play [judul lagu]', 'Cari & kirim audio lagu'],
        ],
    },
    rpg: {
        title: '⚔️ Menu RPG — Akun & Profile',
        items: [
            ['.login', 'Daftar / mulai main RPG'],
            ['.change [nama]', 'Ubah nama karakter'],
            ['.profile', 'Lihat profile karakter'],
            ['.class [nama]', 'Pilih class'],
            ['.classes', 'Lihat daftar class'],
            ['.addstat [stat] [jml]', 'Alokasi stat point'],
            ['.statpoint', 'Lihat sisa stat point'],
            ['.leaderboard / .lb', 'Lihat leaderboard'],
        ],
    },
    skill: {
        title: '📖 Menu Skill',
        items: [
            ['.skill / .skills', 'Lihat skill yang dimiliki'],
            ['.myskills', 'Lihat slot skill aktif'],
            ['.skillpool', 'Lihat semua skill class kamu'],
            ['.equipskill [nama]', 'Pasang skill ke slot aktif'],
            ['.unequipskill [slot]', 'Lepas skill dari slot'],
        ],
    },
    battle: {
        title: '🗡️ Menu Battle (Solo)',
        items: [
            ['.hunt', 'Cari & mulai battle monster'],
            ['.attack', 'Serang fisik'],
            ['.use [1-4]', 'Gunakan skill di slot tsb'],
            ['.flee', 'Kabur dari battle'],
        ],
    },
    party: {
        title: '👥 Menu Party',
        items: [
            ['.createparty [size]', 'Bikin party baru (default 4, max 8)'],
            ['.invite @nama / nomor', 'Undang ke party (cuma leader)'],
            ['.joinparty', 'Terima invite party (berlaku 2 menit)'],
            ['.leaveparty', 'Keluar dari party'],
            ['.kickparty @nama / nomor', 'Keluarkan member (cuma leader)'],
            ['.disbandparty', 'Bubarkan party (cuma leader)'],
            ['.partyinfo', 'Lihat info party'],
        ],
    },
    pbattle: {
        title: '⚔️👥 Menu Party Battle (Co-op)',
        items: [
            ['.phunt', 'Mulai battle party (cuma leader, min 2 member)'],
            ['.pattack', 'Serang fisik (pas giliranmu)'],
            ['.puse [1-4]', 'Pakai skill (pas giliranmu)'],
            ['.pflee', 'Coba bawa party kabur dari battle'],
        ],
    },
    item: {
        title: '🎒 Menu Item & Inventory',
        items: [
            ['.inv / .inventory / .items', 'Lihat inventory'],
            ['.iteminfo [nama]', 'Lihat detail item'],
            ['.item [nama]', 'Pakai item (di luar battle)'],
            ['.useitem [nama]', 'Pakai item (dalam battle)'],
            ['.equip [nama]', 'Pakai equipment'],
            ['.unequip [nama]', 'Lepas equipment'],
        ],
    },
    shop: {
        title: '🏪 Menu Shop',
        items: [
            ['.shop [kategori]', 'Lihat shop (equipment/consumable/material)'],
            ['.buy [nama] [jml]', 'Beli item'],
            ['.sell [nama] [jml]', 'Jual item'],
        ],
    },
    gather: {
        title: '🎣 Menu Gathering',
        items: [
            ['.buy Fishing Rod / Pickaxe / Axe', 'Beli alat (sekali beli, gak abis)'],
            ['.fish', 'Mancing (butuh Fishing Rod)'],
            ['.mine', 'Menambang (butuh Pickaxe)'],
            ['.chop', 'Nebang pohon (butuh Axe)'],
        ],
    },
    farm: {
        title: '🌾 Menu Farming',
        items: [
            ['.buy [nama benih]', 'Beli benih: Wheat/Carrot/Melon/Golden Seed'],
            ['.plant [nama benih]', 'Tanam di plot kosong'],
            ['.myfarm', 'Cek status plot (tumbuh/siap panen)'],
            ['.harvest', 'Panen semua plot yang siap'],
        ],
    },
    quest: {
        title: '📜 Menu Quest',
        items: [
            ['.quests', 'Lihat semua quest aktif + progress'],
            ['.claimquest [kode]', 'Klaim reward quest yang udah selesai'],
        ],
    },
    redeem: {
        title: '🎁 Menu Redeem',
        items: [
            ['.redeem [kode]', 'Tukar kode redeem jadi gold/exp/item'],
        ],
    },
    admin: {
        title: '🛠️ Menu Admin',
        items: [
            ['.addsysitem ...', 'Tambah item sistem'],
            ['.addeffect ...', 'Tambah efek item'],
            ['.addcode KODE gold:.. exp:.. uses:..', 'Buat kode redeem'],
            ['.addquest KEY type:.. objective:.. target:..', 'Buat quest baru'],
            ['.removequest KODE', 'Nonaktifkan quest'],
        ],
    },
};

const MENU_ALIASES = {
    dl: 'downloader', download: 'downloader',
    profile: 'rpg', account: 'rpg', akun: 'rpg',
    skills: 'skill',
    hunt: 'battle', solo: 'battle',
    partybattle: 'pbattle', phunt: 'pbattle', coop: 'pbattle', 'co-op': 'pbattle',
    inventory: 'item', inv: 'item',
    toko: 'shop',
    gathering: 'gather', fish: 'gather', mine: 'gather', chop: 'gather',
    farming: 'farm', tani: 'farm',
    quests: 'quest',
    general: 'bot', umum: 'bot',
};

function formatMenu(catKey) {
    const cat = MENU_DATA[catKey];
    const body = cat.items.map(([cmd, desc]) => `✦ *${cmd}*\n   ↳ ${desc}`).join('\n\n');
    return `╔══『 ${cat.title} 』══╗\n\n${body}\n\n╚══════════════════════╝`;
}

function formatMenuOverview() {
    return (
        `╔═══『 📜 MENU UTAMA 』═══╗\n\n` +
        `Ketik *.menu [kategori]* buat buka menu-nya.\n` +
        `Contoh: *.menu battle*\n\n` +
        `🤖 *bot* — command umum\n` +
        `📥 *downloader* — tiktok/ig/yt/pinterest/play\n\n` +
        `⚔️ *rpg* — akun & profile\n` +
        `📖 *skill* — skill karakter\n` +
        `🗡️ *battle* — hunt solo\n` +
        `👥 *party* — manajemen party\n` +
        `⚔️👥 *pbattle* — battle party (co-op)\n` +
        `🎒 *item* — inventory & equipment\n` +
        `🏪 *shop* — jual beli\n` +
        `🎣 *gather* — mancing/mining/nebang\n` +
        `🌾 *farm* — tanam & panen\n` +
        `📜 *quest* — daily & one-time quest\n` +
        `🎁 *redeem* — kode redeem\n` +
        `🛠️ *admin* — command admin\n\n` +
        `╚══════════════════════╝\n` +
        `📌 Ketik *.update* buat lihat update terbaru!`
    );
}

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

            case 'menu':
            case 'help': {
                const catArg = fullCmd.split(/\s+/).slice(1).join(' ').toLowerCase().trim();
                if (!catArg) {
                    await chat.sendMessage(formatMenuOverview());
                    break;
                }
                const catKey = MENU_ALIASES[catArg] || (MENU_DATA[catArg] ? catArg : null);
                if (!catKey) {
                    await chat.sendMessage(`❌ Kategori *${catArg}* gak ketemu. Ketik *.menu* buat lihat daftar kategori.`);
                    break;
                }
                await chat.sendMessage(formatMenu(catKey));
                break;
            }

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

            // case 'sticker':
            // case 's':
            //     if (!sharp) {
            //         if (message.hasMedia) {
            //             try {
            //                 const media = await message.downloadMedia();
            //                 const buffer = Buffer.from(media.data, 'base64');
            //                 await sock.sendMessage(sender, {
            //                     image: buffer,
            //                     caption: '⚠️ Fitur stiker tidak tersedia (sharp tidak terpasang). Mengirim gambar sebagai pengganti.'
            //                 });
            //             } catch (e) {
            //                 console.error('Gagal mengirim fallback image saat sharp tidak tersedia:', e);
            //                 await chat.sendMessage('❌ Fitur stiker tidak tersedia karena modul sharp belum terinstal di server.');
            //             }
            //         } else {
            //             await chat.sendMessage('❌ Fitur stiker tidak tersedia karena modul sharp belum terinstal di server.');
            //         }
            //         break;
            //     }

            //     if (message.hasMedia) {
            //         const media = await message.downloadMedia();
            //         const buffer = Buffer.from(media.data, 'base64');
            //         try {
            //             const webp = await sharp(buffer)
            //                 .resize(512, 512, { fit: 'inside' })
            //                 .webp({ quality: 100 })
            //                 .toBuffer();

            //             await sock.sendMessage(sender, { sticker: webp });
            //         } catch (e) {
            //             console.error('Gagal konversi gambar ke WebP:', e);
            //             await chat.sendMessage('❌ Gagal membuat stiker. Coba kirim gambar yang lain.');
            //         }
            //     } else {
            //         await chat.sendMessage('❌ Balas gambar dengan caption .sticker untuk membuat stiker.');
            //     }
            //     break;

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

                    const mediaType = data.type === 'image' ? 'image' : (data.type === 'video' ? 'video' : (data.video ? 'video' : 'image'));
                    const imageUrl = Array.isArray(data.images) && data.images.length > 0
                        ? data.images[0]
                        : Array.isArray(data.raw?.data) && data.raw.data.length > 0
                            ? data.raw.data[0]
                            : data.cover;
                    const videoUrl =
                        data.video?.hd ||
                        data.video?.nowm ||
                        data.video?.sd ||
                        data.video?.wm;
                    const mediaUrl = mediaType === 'video' ? videoUrl : imageUrl;

                    if (!mediaUrl) {
                        return await chat.sendMessage("❌ URL media tidak ditemukan.");
                    }

                    const res = await axios.get(mediaUrl, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    const buffer = Buffer.from(res.data);

                    if (mediaType === 'image') {
                        await sock.sendMessage(sender, {
                            image: buffer,
                            caption: `*TikTok Downloader*\n\n${data.title || "-"}`
                        });
                    } else {
                        await sock.sendMessage(sender, {
                            video: buffer,
                            mimetype: "video/mp4",
                            caption: `*TikTok Downloader*\n\n${data.title || "-"}`
                        });
                    }

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
 
            case 'play': {
                const text = fullCmd.slice(command.length).trim();

                if (!text) {
                    return await chat.sendMessage("❌ Gunakan format: .play [judul lagu]");
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

                    if (!data.success || !data.selected) {
                        return await chat.sendMessage("❌ Lagu tidak ditemukan.");
                    }

                    const song = data.selected;

                    const res = await axios.get(song.audio, {
                        responseType: "arraybuffer",
                        headers: {
                            "User-Agent": "Mozilla/5.0"
                        }
                    });

                    await sock.sendMessage(sender, {
                        audio: Buffer.from(res.data),
                        mimetype: "audio/mpeg",
                        ptt: false
                    });

                    await chat.sendMessage(
            `🎵 *Play Music*

            📌 *Judul* : ${song.title}
            ⏱️ *Durasi* : ${song.duration}

            🔗 ${song.source}`
                    );

                } catch (e) {
                    console.error("Play Error:", e);
                    await chat.sendMessage("❌ Terjadi kesalahan.");
                }
                break;
            }

            case 'update':
                await chat.sendMessage(
                    '📢 *UPDATE TERBARU*\n\n' +
                    '👥 *Party System*\n' +
                    '  ✦ Bikin party, invite pake tag @nama atau nomor manual\n' +
                    '  ✦ Co-op battle bareng party (*.phunt*/*.pattack*/*.puse*/*.pflee*), giliran bergantian antar member, monster di-scale sesuai jumlah member\n\n' +
                    '❄️ *Battle — Crowd Control*\n' +
                    '  ✦ Efek *stun* (skip 1 giliran) & *freeze* (skip 2 giliran), bisa kena ke player maupun monster\n\n' +
                    '🎣 *Gathering*\n' +
                    '  ✦ *.fish* / *.mine* / *.chop* — butuh tool (Fishing Rod/Pickaxe/Axe), ada cooldown\n\n' +
                    '🌾 *Farming*\n' +
                    '  ✦ *.plant* benih, tunggu tumbuh (real-time), *.harvest* buat panen, cek progress di *.myfarm*\n\n' +
                    '📜 *Quest System*\n' +
                    '  ✦ Daily & one-time quest, progress ke-track otomatis dari hunt/fish/mine/chop/plant/harvest\n' +
                    '  ✦ *.quests* buat lihat progress, *.claimquest* buat klaim reward\n\n' +
                    'Penghapusan fitur sticker karena terjadi masalah compatibility\n' +
                    '📖 Ketik *.menu* buat lihat semua command yang tersedia!'
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