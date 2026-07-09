const db = require('../db').promise();
const rpg = require('../rpg_system/rpg');
const msgg = require('../rpg_system/msgg');

async function monsterRpgTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS monster_rpg (
            nama VARCHAR(255) PRIMARY KEY,
            level INT NOT NULL,
            hp INT NOT NULL,
            strength INT NOT NULL,
            defense INT NOT NULL,
            agility INT NOT NULL,
            intelligence INT NOT NULL,
            wisdom INT NOT NULL,
            luck INT NOT NULL,
            dexterity INT NOT NULL,
            expReward INT NOT NULL,
            goldReward INT NOT NULL
        )
    `;
    await db.query(createTableQuery);
}
