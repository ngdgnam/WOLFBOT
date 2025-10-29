const stringSimilarity = require("string-similarity");
const fs = require("fs-extra");
const path = require("path");
const logger = require("../../utils/log.js");

// === Đảm bảo global có đầy đủ Map ===
if (!global.client) global.client = {};
if (!global.client.noprefix) global.client.noprefix = new Map();
if (!global.client.cooldowns) global.client.cooldowns = new Map();
if (!global.data) global.data = {};
if (!global.data.commandBanned) global.data.commandBanned = new Map();

// === File JSON AutoFix Helper ===
function ensureJSON(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
}

module.exports = function ({ api, models, Users, Threads, Currencies }) {
  return async function (event) {
    try {
      const { ADMINBOT = [], MAINTENANCE = false, FACEBOOK_ADMIN = "Chưa cấu hình", NDH = [] } = global.config;
      const { commandBanned } = global.data;
      const { commands, cooldowns, noprefix } = global.client;
      let { body, senderID, threadID, messageID } = event;

      if (!body || senderID === api.getCurrentUserID()) return;

      senderID = String(senderID);
      threadID = String(threadID);
      const firstWord = body.trim().split(/\s+/)[0]?.toLowerCase();
      if (!firstWord) return;

      const cmd = noprefix.get(firstWord);
      if (!cmd) return;

      // === AUTO FIX FILE DATA ===
      const rentPath = path.join(process.cwd(), "modules/data/thuebot.json");
      const threadSettingsPath = path.join(process.cwd(), "utils/data/noprefix_settings.json");
      const rentData = ensureJSON(rentPath, []);
      const threadSettings = ensureJSON(threadSettingsPath, {});

      // === Thuê Bot Kiểm Tra ===
      if (!ADMINBOT.includes(senderID)) {
        const threadRent = rentData.find(x => x.t_id == threadID);
        if (!threadRent) {
          return api.sendMessage(
            `❎ Nhóm của bạn chưa thuê bot.\nLiên hệ Admin: ${FACEBOOK_ADMIN}`,
            threadID,
            (err, info) => {
              global.client.handleReply.push({
                name: "rent",
                messageID: info.messageID,
                threadID,
                type: "RentKey"
              });
            }
          );
        }

        const expireTime = new Date(threadRent.time_end.split("/").reverse().join("/")).getTime();
        if (expireTime <= Date.now()) {
          return api.sendMessage(
            `⚠️ Hết hạn thuê bot.\nLiên hệ Admin: ${FACEBOOK_ADMIN}`,
            threadID
          );
        }
      }

      // === Bảo Trì ===
      if (!ADMINBOT.includes(senderID) && MAINTENANCE)
        return api.sendMessage("⚠️ Bot đang bảo trì, vui lòng thử lại sau.", threadID);

      // === Check Ban ===
      const userData = (await Users.getData(senderID)).data || {};
      const threadData = (await Threads.getData(threadID)).data || {};
      if (
        (userData.banned || threadData.banned) &&
        !ADMINBOT.includes(senderID) &&
        !NDH.includes(senderID)
      ) {
        const banned = userData.banned ? userData : threadData;
        const reason = banned.reason || "Không rõ";
        return api.sendMessage(
          `⛔ Bạn hoặc nhóm đã bị ban!\nLý do: ${reason}\nLiên hệ: ${FACEBOOK_ADMIN}`,
          threadID
        );
      }

      // === Lệnh đặc biệt on/off/clear ===
      if (["on", "off", "clear"].includes(firstWord)) {
        if (!threadSettings[threadID]) threadSettings[threadID] = { active: true };
        switch (firstWord) {
          case "on":
            threadSettings[threadID].active = true;
            api.sendMessage("🐺 Sói đã bật chế độ trò chuyện nhóm.", threadID);
            break;
          case "off":
            threadSettings[threadID].active = false;
            api.sendMessage("🐺 Sói đã tắt chế độ trò chuyện nhóm.", threadID);
            break;
          case "clear":
            delete threadSettings[threadID];
            api.sendMessage("🧹 Sói đã xoá toàn bộ dữ liệu trò chuyện nhóm.", threadID);
            break;
        }
        fs.writeFileSync(threadSettingsPath, JSON.stringify(threadSettings, null, 2));
        return;
      }

      // === Cooldown ===
      if (!cooldowns.has(cmd.config.name)) cooldowns.set(cmd.config.name, new Map());
      const timestamps = cooldowns.get(cmd.config.name);
      const cooldownAmount = (cmd.config.cooldowns || 1) * 1000;
      if (timestamps.has(senderID)) {
        const expiration = timestamps.get(senderID) + cooldownAmount;
        if (Date.now() < expiration) {
          const timeLeft = ((expiration - Date.now()) / 1000).toFixed(1);
          return api.sendMessage(`⏳ Vui lòng chờ ${timeLeft}s trước khi dùng lại.`, threadID);
        }
      }
      timestamps.set(senderID, Date.now());

      // === Thực thi lệnh ===
      await cmd.run({
        api,
        event,
        args: body.split(/\s+/),
        models,
        Users,
        Threads,
        Currencies,
        permssion: 0,
        getText: () => ""
      });
    } catch (e) {
      logger(`❌ Lỗi noprefix: ${e.stack}`, "error");
      try {
        api.sendMessage(`❌ Lỗi: ${e.message}`, event.threadID, event.messageID);
      } catch {}
    }
  };
};
