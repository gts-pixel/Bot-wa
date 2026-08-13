const db = require('../db').promise();

// ── In-memory state (konsisten sama pola activeBattles di battle.js) ──
const parties = {};          // partyId -> party object
const memberOf = {};         // senderId -> partyId
const pendingInvites = {};   // targetSenderId -> { partyId, invitedBy, expiresAt }

const INVITE_TIMEOUT_MS = 2 * 60 * 1000; // 2 menit
const DEFAULT_MAX_SIZE = 4;
const MIN_SIZE = 2;
const MAX_SIZE_CAP = 8;

function toJid(nomor) {
    return nomor.includes('@') ? nomor : `${nomor}@s.whatsapp.net`;
}

// nomor di DB (kolom `nomor`) & senderId di seluruh kode disimpan sebagai JID PENUH
// (mis. "628123456789@s.whatsapp.net"), bukan angka doang. Semua target dari
// .invite/.kickparty (baik dari tag @nama maupun ketik manual) harus dinormalisasi
// ke format JID penuh ini sebelum dipakai buat query DB atau dibandingkan ke senderId.
function normalizeTarget(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (s.includes('@')) return s; // udah JID penuh (dari tag WA)
    const digits = s.replace(/\D/g, '');
    return digits ? `${digits}@s.whatsapp.net` : null;
}

// buat ditampilin ke user, JID penuh dipotong jadi nomor doang
function displayNumber(id) {
    return String(id || '').split('@')[0];
}

// ambil nama player dari DB buat ditampilin (fallback ke nomor kalau gak ketemu)
async function getDisplayName(id) {
    try {
        const [rows] = await db.query('SELECT nama FROM rpg_players WHERE nomor = ?', [id]);
        return rows.length && rows[0].nama ? rows[0].nama : displayNumber(id);
    } catch (e) {
        return displayNumber(id);
    }
}

function getParty(senderId) {
    const partyId = memberOf[senderId];
    return partyId ? parties[partyId] : null;
}

function isLeader(senderId) {
    const party = getParty(senderId);
    return party && party.leader === senderId;
}

async function notifyMembers(party, text, sock, exceptId = null) {
    for (const memberId of party.members) {
        if (memberId === exceptId) continue;
        try {
            await sock.sendMessage(toJid(memberId), { text });
        } catch (e) {
            // gagal kirim ke 1 member gak boleh gagalin proses lainnya
        }
    }
}

// =====================
// CREATE PARTY
// =====================
async function createParty(senderId, chat, sizeArg) {
    if (memberOf[senderId]) {
        await chat.sendMessage('❌ Kamu udah tergabung dalam party. Ketik *.leaveparty* dulu.');
        return;
    }

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [senderId]);
    if (!rows.length) {
        await chat.sendMessage('❌ Kamu belum terdaftar. Ketik *.login* dulu.');
        return;
    }

    let maxSize = parseInt(sizeArg);
    if (isNaN(maxSize)) maxSize = DEFAULT_MAX_SIZE;
    maxSize = Math.min(MAX_SIZE_CAP, Math.max(MIN_SIZE, maxSize));

    const partyId = senderId; // partyId dari nomor pembuat, gak berubah walau leadership pindah
    parties[partyId] = {
        id: partyId,
        leader: senderId,
        maxSize,
        members: [senderId],
        battle: null, // diisi partyBattle.js pas .phunt
    };
    memberOf[senderId] = partyId;

    await chat.sendMessage(
        `🎉 *Party dibuat!*\n` +
        `👑 Leader: kamu\n` +
        `👥 Kapasitas: 1/${maxSize}\n\n` +
        `Undang teman dengan *.invite 628xxx*`
    );
}

// =====================
// INVITE
// =====================
async function invite(senderId, targetNumberRaw, chat, sock) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu belum punya party. Ketik *.createparty* dulu.');
        return;
    }
    if (party.leader !== senderId) {
        await chat.sendMessage('❌ Cuma leader party yang bisa invite.');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('❌ Party lagi battle, gak bisa invite sekarang.');
        return;
    }
    if (party.members.length >= party.maxSize) {
        await chat.sendMessage(`❌ Party udah penuh (${party.maxSize}/${party.maxSize}).`);
        return;
    }

    const target = normalizeTarget(targetNumberRaw);
    if (!target) {
        await chat.sendMessage('❌ Format salah. Tag pakai *.invite @nama* atau ketik *.invite 628123456789*');
        return;
    }
    if (target === senderId) {
        await chat.sendMessage('❌ Gak bisa invite diri sendiri 😅');
        return;
    }
    if (memberOf[target]) {
        await chat.sendMessage('❌ Player itu udah ada di party (lain).');
        return;
    }

    const [rows] = await db.query('SELECT * FROM rpg_players WHERE nomor = ?', [target]);
    if (!rows.length) {
        await chat.sendMessage('❌ Nomor itu belum terdaftar main.');
        return;
    }

    pendingInvites[target] = {
        partyId: party.id,
        invitedBy: senderId,
        expiresAt: Date.now() + INVITE_TIMEOUT_MS,
    };

    await chat.sendMessage(`✅ Invite terkirim ke *${await getDisplayName(target)}*. Menunggu konfirmasi (*.joinparty*), berlaku 2 menit.`);

    try {
        await sock.sendMessage(toJid(target), {
            text:
                `⚔️ Kamu diundang gabung party oleh *${await getDisplayName(senderId)}*!\n` +
                `Ketik *.joinparty* dalam 2 menit untuk gabung.`
        });
    } catch (e) {
        // sock gagal kirim DM ke target — invite tetap tercatat, target masih bisa .joinparty manual
    }
}

// =====================
// JOIN
// =====================
async function joinParty(senderId, chat, sock) {
    const inv = pendingInvites[senderId];
    if (!inv || inv.expiresAt < Date.now()) {
        delete pendingInvites[senderId];
        await chat.sendMessage('❌ Gak ada invite aktif buat kamu. Minta leader party invite ulang.');
        return;
    }
    if (memberOf[senderId]) {
        delete pendingInvites[senderId];
        await chat.sendMessage('❌ Kamu udah tergabung dalam party lain.');
        return;
    }

    const party = parties[inv.partyId];
    if (!party) {
        delete pendingInvites[senderId];
        await chat.sendMessage('❌ Party udah bubar.');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('❌ Party lagi battle, tunggu sampai selesai buat join.');
        return;
    }
    if (party.members.length >= party.maxSize) {
        delete pendingInvites[senderId];
        await chat.sendMessage('❌ Party udah penuh duluan.');
        return;
    }

    party.members.push(senderId);
    memberOf[senderId] = party.id;
    delete pendingInvites[senderId];

    await chat.sendMessage(`🎉 Berhasil gabung party!\n👥 Member: ${party.members.length}/${party.maxSize}`);
    await notifyMembers(party, `👋 *${await getDisplayName(senderId)}* bergabung ke party! (${party.members.length}/${party.maxSize})`, sock, senderId);
}

// =====================
// LEAVE
// =====================
async function leaveParty(senderId, chat, sock) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu gak tergabung dalam party manapun.');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('❌ Gak bisa leave saat party lagi battle. Selesaikan dulu atau *.pflee*.');
        return;
    }

    party.members = party.members.filter(m => m !== senderId);
    delete memberOf[senderId];

    if (party.members.length === 0) {
        delete parties[party.id];
        await chat.sendMessage('👋 Kamu keluar dari party. Party dibubarkan (kosong).');
        return;
    }

    let leadershipMsg = '';
    if (party.leader === senderId) {
        party.leader = party.members[0];
        leadershipMsg = `\n👑 Leadership pindah ke *${await getDisplayName(party.leader)}*.`;
    }

    await chat.sendMessage(`👋 Kamu keluar dari party.`);
    await notifyMembers(party, `⚠️ *${await getDisplayName(senderId)}* keluar dari party. (${party.members.length}/${party.maxSize})${leadershipMsg}`, sock);
}

// =====================
// KICK (leader only)
// =====================
async function kickParty(senderId, targetNumberRaw, chat, sock) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu gak tergabung dalam party manapun.');
        return;
    }
    if (party.leader !== senderId) {
        await chat.sendMessage('❌ Cuma leader yang bisa kick member.');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('❌ Gak bisa kick saat party lagi battle.');
        return;
    }

    const target = normalizeTarget(targetNumberRaw);
    if (!target) {
        await chat.sendMessage('❌ Format salah. Tag pakai *.kickparty @nama* atau ketik *.kickparty 628123456789*');
        return;
    }
    if (target === senderId) {
        await chat.sendMessage('❌ Gak bisa kick diri sendiri. Pakai *.disbandparty* buat bubarin party.');
        return;
    }
    if (!party.members.includes(target)) {
        await chat.sendMessage('❌ Player itu bukan member party ini.');
        return;
    }

    party.members = party.members.filter(m => m !== target);
    delete memberOf[target];

    const targetName = await getDisplayName(target);
    await chat.sendMessage(`👢 *${targetName}* dikeluarkan dari party.`);
    try {
        await sock.sendMessage(toJid(target), { text: `👢 Kamu dikeluarkan dari party oleh leader.` });
    } catch (e) { /* abaikan */ }
    await notifyMembers(party, `👢 *${targetName}* dikeluarkan dari party. (${party.members.length}/${party.maxSize})`, sock);
}

// =====================
// DISBAND (leader only)
// =====================
async function disbandParty(senderId, chat, sock) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu gak tergabung dalam party manapun.');
        return;
    }
    if (party.leader !== senderId) {
        await chat.sendMessage('❌ Cuma leader yang bisa membubarkan party.');
        return;
    }
    if (party.battle) {
        await chat.sendMessage('❌ Gak bisa bubarin party saat lagi battle.');
        return;
    }

    await notifyMembers(party, `💥 Party dibubarkan oleh leader.`, sock, senderId);
    for (const m of party.members) delete memberOf[m];
    delete parties[party.id];

    await chat.sendMessage('💥 Party dibubarkan.');
}

// =====================
// INFO
// =====================
async function partyInfo(senderId, chat) {
    const party = getParty(senderId);
    if (!party) {
        await chat.sendMessage('❌ Kamu gak tergabung dalam party manapun.\nKetik *.createparty* untuk bikin party baru.');
        return;
    }

    const memberList = (await Promise.all(
        party.members.map(async m => `${m === party.leader ? '👑' : '•'} ${await getDisplayName(m)}`)
    )).join('\n');

    await chat.sendMessage(
        `👥 *PARTY INFO*\n\n` +
        `Kapasitas: ${party.members.length}/${party.maxSize}\n` +
        `Status: ${party.battle ? '⚔️ Sedang battle' : '🕊️ Idle'}\n\n` +
        `${memberList}`
    );
}

module.exports = {
    parties, memberOf, pendingInvites,
    getParty, isLeader, toJid, notifyMembers, displayNumber, normalizeTarget, getDisplayName,
    createParty, invite, joinParty, leaveParty, kickParty, disbandParty, partyInfo,
};