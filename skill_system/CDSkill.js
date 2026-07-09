// skillCooldown.js — Sistem cooldown skill per turn dalam battle
// Disimpan per battle session (activeBattles[senderId].skillCooldowns)

/**
 * Cek apakah skill masih dalam cooldown.
 * @param {object} battle - battle session aktif
 * @param {string} skillKey - key skill ('1', '2', '3')
 * @returns {number} sisa turn cooldown, 0 jika bisa dipakai
 */
function getSkillCooldown(battle, skillKey) {
    return battle.skillCooldowns[skillKey] || 0;
}

/**
 * Set cooldown skill setelah dipakai.
 * @param {object} battle - battle session aktif
 * @param {object} skill - object skill (punya cooldownTurns)
 * @param {string} skillKey - key skill ('1', '2', '3')
 */
function setSkillCooldown(battle, skill, skillKey) {
    if (skill.cooldownTurns > 0) {
        battle.skillCooldowns[skillKey] = skill.cooldownTurns;
    }
}

/**
 * Kurangi semua skill cooldown sebanyak 1 turn.
 * Dipanggil tiap giliran selesai (setelah attack/skill).
 * @param {object} battle - battle session aktif
 */
function decrementSkillCooldowns(battle) {
    for (const key of Object.keys(battle.skillCooldowns)) {
        battle.skillCooldowns[key]--;
        if (battle.skillCooldowns[key] <= 0) {
            delete battle.skillCooldowns[key];
        }
    }
}

/**
 * Format tampilan cooldown skill aktif untuk status battle.
 * @param {object} battle - battle session aktif
 * @returns {string} teks cooldown, kosong jika tidak ada
 */
function formatSkillCooldowns(battle) {
    const cds = battle.skillCooldowns || {};
    const entries = Object.entries(cds).filter(([, v]) => v > 0);
    if (!entries.length) return '';
    return '\n⏳ CD: ' + entries.map(([k, v]) => `Skill ${k}: ${v} turn`).join(' | ');
}

module.exports = {
    getSkillCooldown,
    setSkillCooldown,
    decrementSkillCooldowns,
    formatSkillCooldowns,
};