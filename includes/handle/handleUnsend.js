const fs = require('fs-extra');

module.exports = function ({ api, event }) {
    return function (event ) {

        const { senderID, reaction, messageID, threadID } = event;
        const Unsend = "./modules/data/unsend.json";
        const groupData = fs.existsSync(Unsend) ? (() => { if (!fs.existsSync(Unsend, 'utf-8')) (() => { const dir = path.dirname(Unsend); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); return fs.writeFileSync(Unsend, 'utf-8', JSON.stringify({}, null, 2)); return JSON.parse(fs.readFileSync(Unsend, 'utf-8')); })().find(entry => entry.threadID === threadID) : null;

        if (senderID == api.getCurrentUserID()) {
            const icon = groupData ? groupData.Icon : "👍";
            if (reaction == icon) return api.unsendMessage(messageID);
        }
    };
}
