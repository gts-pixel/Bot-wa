// cooldown.js — Anti-spam cooldown global per user
// Cooldown berlaku lintas semua command (RPG maupun non-RPG)

const COOLDOWN_MS = 5_000; // 5 detik
const cooldownMap = new Map();

/**
 * Cek apakah user masih dalam cooldown.
 * Jika tidak, langsung set timestamp sekarang.
 * @param {string} userId - nomor WA pengirim
 * @returns {number} sisa detik cooldown, 0 jika bebas
 */
function checkCooldown(userId) {
    const now = Date.now();
    const lastUsed = cooldownMap.get(userId);

    if (lastUsed && now - lastUsed < COOLDOWN_MS) {
        return Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
    }

    cooldownMap.set(userId, now);
    return 0;
}

module.exports = { checkCooldown };