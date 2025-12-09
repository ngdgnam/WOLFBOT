// includes/listen.js - WolfBot Stable Event Listener (Cleaned & Optimized)
module.exports = function ({ api, models }) {
  const Users = require("./controllers/users")({ models, api });
  const Threads = require("./controllers/threads")({ models, api });
  const Currencies = require("./controllers/currencies")({ models });
  const fs = require('fs');
  const path = require('path');
  const moment = require('moment-timezone');
  const logger = require("../utils/log.js");

  // Load data handlers
  require('./handle/handleData')(api, models, Users, Threads, Currencies);

  // Load all handlers
  const handlers = [
    'handleRefresh', 'handleCreateDatabase', 'handleEvent', 'handleReaction', 'handleCommandEvent',
    'handleCommand', 'handleCommandNoprefix', 'handleReply', 'handleUnsend', 'handleSendEvent'
  ].reduce((acc, name) => {
    acc[name] = require(`./handle/${name}`)({ api, Threads, Users, Currencies });
    return acc;
  }, {});

  // Load schedule and notification handlers
  require('./handle/handleSchedule')(api, models, Users, Threads, Currencies);
  if (global.config.NOTIFICATION) {
    setInterval(() => require("./handle/handleNotification")({ api }), 1000 * 60);
  }

  // Initial data load
  (async () => {
    try {
      logger(global.getText("listen", "startLoadEnvironment"), "DATA");
      const [threads, users, currencies] = await Promise.all([
        Threads.getAll(),
        Users.getAll(['userID', 'name', 'data']),
        Currencies.getAll(['userID'])
      ]);

      for (const data of threads) {
        const threadID = String(data.threadID);
        global.data.allThreadID.push(threadID);
        global.data.threadData.set(threadID, data.data || {});
        global.data.threadInfo.set(threadID, data.threadInfo || {});
        if (data.data?.banned) {
          global.data.threadBanned.set(threadID, {
            reason: data.data.reason || '',
            dateAdded: data.data.dateAdded || ''
          });
        }
        if (data.data?.commandBanned?.length) {
          global.data.commandBanned.set(threadID, data.data.commandBanned);
        }
        if (data.data?.NSFW) {
          global.data.threadAllowNSFW.push(threadID);
        }
      }

      logger(global.getText("listen", "loadedEnvironmentThread"));

      for (const user of users) {
        const userID = String(user.userID);
        global.data.allUserID.push(userID);
        if (user.name?.length) {
          global.data.userName.set(userID, user.name);
        }
        if (user.data?.banned) {
          global.data.userBanned.set(userID, {
            reason: user.data.reason || '',
            dateAdded: user.data.dateAdded || ''
          });
        }
        if (user.data?.commandBanned?.length) {
          global.data.commandBanned.set(userID, user.data.commandBanned);
        }
      }

      for (const currency of currencies) {
        global.data.allCurrenciesID.push(String(currency.userID));
      }

      logger(`Loaded data for ${global.data.allThreadID.length} threads and ${global.data.allUserID.length} users`);
    } catch (error) {
      logger(global.getText("listen", "failLoadEnvironment", error), 'error');
    }
  })();

  // Check TT (Tương Tác) System
  // Standardize CHECKTT storage directory used by modules/commands/Thống kê/check.js
  const checkttDataPath = path.join(__dirname, '../modules/data/checktts');
  // Initialize guards so the scheduler does not fire a "New Day"/total summary immediately on bot startup
  // This prevents the noisy behaviour of sending summaries right after the bot starts.
  try {
    const nowInit = moment.tz('Asia/Ho_Chi_Minh');
    global.lastDay = global.lastDay ?? nowInit.day();
    global.lastCheckttSentDay = global.lastCheckttSentDay ?? nowInit.format('YYYY-MM-DD');
  } catch (e) { /* ignore */ }
  setInterval(async () => {
    const now = moment.tz("Asia/Ho_Chi_Minh");
    const day = now.day();
    // Send daily summary at 23:59 local time (once per day)
    try {
      const hour = now.hour();
      const minute = now.minute();
      const todayKey = now.format('YYYY-MM-DD');
      if (hour === 23 && minute === 59 && global.lastCheckttSentDay !== todayKey) {
        global.lastCheckttSentDay = todayKey;
        if (fs.existsSync(checkttDataPath)) {
          const files = fs.readdirSync(checkttDataPath);
          logger("--> CHECKTT: 23:59 Daily Send");
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
              const checktt = JSON.parse(fs.readFileSync(path.join(checkttDataPath, file)));
              let storage = [];
              let count = 1;
              for (const item of checktt.day || []) {
                const userName = await Users.getNameUser(item.id) || "Facebook User";
                const itemToPush = { ...item, name: userName };
                storage.push(itemToPush);
              }
              storage.sort((a, b) => b.count - a.count);
              let checkttBody = "[ Top 20 Tương Tác Ngày - 23:59 ]\n─────────────────\n";
              checkttBody += storage.slice(0, 20).map(item => `${count++}. ${item.name} - ${item.count} tin.`).join('\n');
              api.sendMessage(`${checkttBody}\n─────────────────\nTổng tin nhắn trong ngày: ${storage.reduce((a, b) => a + b.count, 0)} tin\n⚡ Các bạn khác cố gắng tương tác nếu muốn lên top nha :3`, file.replace('.json', ''), err => err ? logger(err) : '');
            } catch (e) { logger(e); }
          }
        }
      }
    } catch (e) { /* non-fatal */ }
    if (global.lastDay !== day) {
      global.lastDay = day;
      if (fs.existsSync(checkttDataPath)) {
        const files = fs.readdirSync(checkttDataPath);
        logger("--> CHECKTT: New Day");
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const checktt = JSON.parse(fs.readFileSync(path.join(checkttDataPath, file)));
          let storage = [];
          let count = 1;
          for (const item of checktt.day) {
            const userName = await Users.getNameUser(item.id) || "Facebook User";
            const itemToPush = { ...item, name: userName };
            storage.push(itemToPush);
          }
          storage.sort((a, b) => b.count - a.count);
          let checkttBody = "[ Top 20 Tương Tác Ngày ]\n─────────────────\n";
          checkttBody += storage.slice(0, 20).map(item => `${count++}. ${item.name} - ${item.count} tin.`).join('\n');
          api.sendMessage(`${checkttBody}\n─────────────────\nTổng tin nhắn trong ngày: ${storage.reduce((a, b) => a + b.count, 0)} tin\n⚡ Các bạn khác cố gắng tương tác nếu muốn lên top nha :3`, file.replace('.json', ''), err => err ? logger(err) : '');
          if (!checktt.last) checktt.last = { time: day, day: [], week: [] };
          checktt.last.day = [...checktt.day];
          checktt.day.forEach(e => e.count = 0);
          checktt.time = day;
          fs.writeFileSync(path.join(checkttDataPath, file), JSON.stringify(checktt, null, 4));
        }
        if (day === 1) {
          logger("--> CHECKTT: New Week");
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const checktt = JSON.parse(fs.readFileSync(path.join(checkttDataPath, file)));
            if (!checktt.last) checktt.last = { time: day, day: [], week: [] };
            let storage = [];
            let count = 1;
            for (const item of checktt.week) {
              const userName = await Users.getNameUser(item.id) || "Facebook User";
              const itemToPush = { ...item, name: userName };
              storage.push(itemToPush);
            }
            storage.sort((a, b) => b.count - a.count);
            let checkttBody = "[ Top 20 Tương Tác Tuần ]\n─────────────────\n";
            checkttBody += storage.slice(0, 10).map(item => `${count++}. ${item.name} - ${item.count} tin.`).join('\n');
            api.sendMessage(`${checkttBody}\n─────────────────\nTổng tin nhắn trong tuần: ${storage.reduce((a, b) => a + b.count, 0)} tin.\n⚡ Các bạn khác cố gắng tương tác nếu muốn lên top nha :>`, file.replace('.json', ''), err => err ? logger(err) : '');
            if (!checktt.last) checktt.last = { time: day, day: [], week: [] };
            checktt.last.week = [...checktt.week];
            checktt.week.forEach(e => e.count = 0);
            fs.writeFileSync(path.join(checkttDataPath, file), JSON.stringify(checktt, null, 4));
          }
        }
        global.client.sending_top = false;
      }
    }
  }, 10000);

  // DT Lich (Scheduled Message) System
  const datlichPath = path.join(__dirname, '../modules/commands/cache/datlich.json');
  const monthToMSObj = {
    1: 31 * 24 * 60 * 60 * 1000, 2: 28 * 24 * 60 * 60 * 1000, 3: 31 * 24 * 60 * 60 * 1000, 4: 30 * 24 * 60 * 60 * 1000,
    5: 31 * 24 * 60 * 60 * 1000, 6: 30 * 24 * 60 * 60 * 1000, 7: 31 * 24 * 60 * 60 * 1000, 8: 31 * 24 * 60 * 60 * 1000,
    9: 30 * 24 * 60 * 60 * 1000, 10: 31 * 24 * 60 * 60 * 1000, 11: 30 * 24 * 60 * 60 * 1000, 12: 31 * 24 * 60 * 60 * 1000
  };

  // Rent / Pending cleanup: remove expired rents and stale pending requests periodically
  (function rentAndPendingCleanup() {
    const rentFile = path.join(__dirname, '../modules/data/thuebot.json');
    const approvedThreadsPath = path.join(__dirname, '../utils/data/approvedThreads.json');
    const pendingThreadsPathLocal = path.join(__dirname, '../utils/data/pendingThreads.json');
    const pendingExpiryDays = (global.config && global.config.PENDING_EXPIRY_DAYS) ? parseInt(global.config.PENDING_EXPIRY_DAYS, 10) : 7;

    const cleanup = async () => {
      // cleanup expired rents
      try {
        if (!fs.existsSync(rentFile)) return;
        let rentData = JSON.parse(fs.readFileSync(rentFile, 'utf8')) || [];
        let changed = false;
        const now = Date.now();
        for (let i = rentData.length - 1; i >= 0; i--) {
          try {
            const parts = (rentData[i].time_end || '').split('/').reverse().join('/');
            const expire = new Date(parts).getTime();
            if (!expire || expire <= now) {
              // expired — remove and un-approve the thread if needed
              const removed = rentData.splice(i, 1)[0];
              changed = true;
              try {
                if (fs.existsSync(approvedThreadsPath)) {
                  let approved = JSON.parse(fs.readFileSync(approvedThreadsPath, 'utf8')) || [];
                  const idx = approved.indexOf(removed.t_id);
                  if (idx !== -1) {
                    approved.splice(idx, 1);
                    fs.writeFileSync(approvedThreadsPath, JSON.stringify(approved, null, 2), 'utf8');
                  }
                }
                // notify the group about expiry (best-effort)
                try { api.sendMessage(`⚠️ Thời gian thuê bot của nhóm này đã hết hạn. Vui lòng gia hạn hoặc liên hệ admin để tiếp tục sử dụng.`, removed.t_id); } catch (e) { /* ignore */ }
              } catch (e) { /* ignore */ }
            }
          } catch (e) { /* ignore parse errors */ }
        }
        if (changed) fs.writeFileSync(rentFile, JSON.stringify(rentData, null, 2), 'utf8');
      } catch (e) { /* non-fatal */ }

      // cleanup stale pending requests older than pendingExpiryDays
      try {
        if (!fs.existsSync(pendingThreadsPathLocal)) return;
        let pending = JSON.parse(fs.readFileSync(pendingThreadsPathLocal, 'utf8')) || [];
        const threshold = Date.now() - pendingExpiryDays * 24 * 60 * 60 * 1000;
        const newPending = pending.filter(item => {
          if (!item) return false;
          if (typeof item === 'string') return false; // old-format entries removed
          return (item.requestedAt && item.requestedAt >= threshold) || false;
        });
        if (newPending.length !== pending.length) fs.writeFileSync(pendingThreadsPathLocal, JSON.stringify(newPending, null, 2), 'utf8');
      } catch (e) { /* ignore */ }
    };

    // run cleanup now and every hour
    cleanup();
    setInterval(cleanup, 1000 * 60 * 60);
  })();
  const checkTime = (time) => new Promise(async resolve => {
    time.forEach((e, i) => time[i] = parseInt(String(e).trim()));
    const getDayFromMonth = (month) => month == 2 ? (time[2] % 4 == 0 ? 29 : 28) : [1,3,5,7,8,10,12].includes(month) ? 31 : 30;
    if (time[1] > 12 || time[1] < 1) return resolve("Tháng của bạn có vẻ không hợp lệ");
    if (time[0] > getDayFromMonth(time[1]) || time[0] < 1) return resolve("Ngày của bạn có vẻ không hợp lệ");
    if (time[2] < 2022) return resolve("Bạn sống ở kỷ nguyên nào thế?");
    if (time[3] > 23 || time[3] < 0) return resolve("Giờ của bạn có vẻ không hợp lệ");
    if (time[4] > 59 || time[4] < 0) return resolve("Phút của bạn có vẻ không hợp lệ");
    if (time[5] > 59 || time[5] < 0) return resolve("Giây của bạn có vẻ không hợp lệ");

    const yr = time[2] - 1970;
    const yearToMS = yr * 365 * 24 * 60 * 60 * 1000 + Math.floor((yr - 2) / 4) * 24 * 60 * 60 * 1000;
    let monthToMS = 0;
    for (let i = 1; i < time[1]; i++) monthToMS += monthToMSObj[i];
    if (time[2] % 4 == 0) monthToMS += 24 * 60 * 60 * 1000;
    const dayToMS = time[0] * 24 * 60 * 60 * 1000;
    const hourToMS = time[3] * 60 * 60 * 1000;
    const minuteToMS = time[4] * 60 * 1000;
    const secondToMS = time[5] * 1000;
    const oneDayToMS = 24 * 60 * 60 * 1000;
    const timeMs = yearToMS + monthToMS + dayToMS + hourToMS + minuteToMS + secondToMS - oneDayToMS;
    resolve(timeMs);
  });

  const tenMinutes = 10 * 60 * 1000;
  const checkAndExecuteEvent = async () => {
    if (!fs.existsSync(datlichPath)) fs.writeFileSync(datlichPath, JSON.stringify({}, null, 4));
    const data = JSON.parse(fs.readFileSync(datlichPath));
    const timeVN = moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY_HH:mm:ss").split("_");
    const timeVNArr = [...timeVN[0].split("/"), ...timeVN[1].split(":")];
    const vnMS = await checkTime(timeVNArr);
    let temp = [];
    let files = [];
    for (const boxID in data) {
      for (const timeKey of Object.keys(data[boxID])) {
        const getTimeMS = await checkTime(timeKey.split("_"));
        if (getTimeMS < vnMS) {
          if (vnMS - getTimeMS < tenMinutes) {
            data[boxID][timeKey].TID = boxID;
            temp.push(data[boxID][timeKey]);
            delete data[boxID][timeKey];
          } else delete data[boxID][timeKey];
        }
      }
      fs.writeFileSync(datlichPath, JSON.stringify(data, null, 4));
    }
    for (const el of temp) {
      try {
        const threadInfo = await api.getThreadInfo(el.TID);
        const all = threadInfo.participantIDs;
        all.splice(all.indexOf(api.getCurrentUserID()), 1);
        let body = el.REASON || "MỌI NGƯỜI ƠI";
        const mentions = [];
        let index = 0;
        for (let i = 0; i < all.length; i++) {
          if (i == body.length) body += " ‍ ";
          mentions.push({ tag: body[i], id: all[i], fromIndex: i - 1 });
        }
        const out = { body, mentions };
        if (el.ATTACHMENT) {
          out.attachment = [];
          for (const a of el.ATTACHMENT) {
            const response = await axios.get(a.url, { responseType: "arraybuffer" });
            fs.writeFileSync(path.join(__dirname, '../modules/commands/cache/', a.fileName), Buffer.from(response.data, "utf-8"));
            out.attachment.push(fs.createReadStream(path.join(__dirname, '../modules/commands/cache/', a.fileName)));
          }
        }
        if (el.BOX) await api.setTitle(el.BOX, el.TID);
        api.sendMessage(out, el.TID, () => {
          if (el.ATTACHMENT) el.ATTACHMENT.forEach(a => fs.unlinkSync(path.join(__dirname, '../modules/commands/cache/', a.fileName)));
        });
      } catch (e) {
        console.log(e);
      }
    }
  };
  setInterval(checkAndExecuteEvent, tenMinutes / 10);

  // Return main event handler
  return async (event) => {
    // Admin approval system
    const approvedThreadsPath = path.join(__dirname, '../utils/data/approvedThreads.json');
    const pendingThreadsPath = path.join(__dirname, '../utils/data/pendingThreads.json');
    if (!fs.existsSync(approvedThreadsPath)) fs.writeFileSync(approvedThreadsPath, JSON.stringify([]), 'utf-8');
    if (!fs.existsSync(pendingThreadsPath)) fs.writeFileSync(pendingThreadsPath, JSON.stringify([]), 'utf-8');
    const approvedThreads = JSON.parse(fs.readFileSync(approvedThreadsPath, 'utf-8'));
    const adminBot = global.config.ADMINBOT;
    const ndh = global.config.NDH;
    const boxAdmin = global.config.BOXADMIN;
    const threadInfo = await api.getThreadInfo(event.threadID);
    const threadName = threadInfo.threadName;
    // Allow rented boxes (thuebot) to bypass Admin approval requirement
    let isRentedBox = false;
    try {
      const rentFile = path.join(__dirname, '../modules/data/thuebot.json');
      if (fs.existsSync(rentFile)) {
        const rentData = JSON.parse(fs.readFileSync(rentFile, 'utf8')) || [];
        const rentEntry = (rentData || []).map(x => ({ ...x, t_id: String(x.t_id) })).find(x => String(x.t_id) === String(event.threadID));
        if (rentEntry) {
          // validate expiration
          try {
            const parts = rentEntry.time_end.split('/').reverse().join('/');
            const expire = new Date(parts).getTime();
            if (expire > Date.now()) isRentedBox = true;
          } catch (e) { /* ignore parse errors */ }
        }
      }
    } catch (e) { /* ignore */ }

    if (!approvedThreads.includes(event.threadID) && !adminBot.includes(event.senderID) && !ndh.includes(event.senderID) && !isRentedBox) {
      const data = await Threads.getData(String(event.threadID)) || {};
      const prefix = data.PREFIX || global.config.PREFIX;
      const botName = global.config.BOTNAME;
      if (event.body && event.body.toLowerCase() === 'duyetbox') {
        api.sendMessage(`[ Thông Báo ]\n\n📜 Yêu cầu duyệt từ box ID: ${event.threadID}`, boxAdmin);
        return api.sendMessage(`✅ Đã gửi yêu cầu duyệt đến nhóm admin!`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
          try {
            let pendingThreads = JSON.parse(fs.readFileSync(pendingThreadsPath, 'utf-8')) || [];
            // store as objects with timestamp so we can auto-expire pending requests
            if (!pendingThreads.some(item => (item && (item.threadID || item) == event.threadID))) {
              pendingThreads.push({ threadID: event.threadID, requestedAt: Date.now() });
              fs.writeFileSync(pendingThreadsPath, JSON.stringify(pendingThreads, null, 2), 'utf-8');
            }
          } catch (e) {
            try { fs.writeFileSync(pendingThreadsPath, JSON.stringify([{ threadID: event.threadID, requestedAt: Date.now() }], null, 2), 'utf-8'); } catch (err) { /* ignore */ }
          }
        });
      }
      if (event.body && event.body.startsWith(prefix)) {
        return api.sendMessage(`❎ Nhóm của bạn chưa được Admin duyệt, hãy chat "duyetbox" để yêu cầu được duyệt`, event.threadID, async (err, info) => {
          if (err) console.error(err);
          await new Promise(resolve => setTimeout(resolve, 10 * 1000));
          api.unsendMessage(info.messageID);
        });
      }
    }

    // Handle event types
    const { logMessageType, type } = event;
    if (logMessageType) {
      await handlers.handleSendEvent(event);
      await handlers.handleEvent(event);
      return handlers.handleRefresh(event);
    }

    // Show a console frame for incoming messages (if the global helper exists)
    try {
      if (type === 'message' && typeof global.showFrame === 'function') {
        const senderName = global.data.userName.get(String(event.senderID)) || await Users.getNameUser(String(event.senderID)) || 'Unknown';
        const threadNameLocal = threadName || (await api.getThreadInfo(event.threadID)).threadName || 'Unknown';
        const timeLocal = moment.tz('Asia/Ho_Chi_Minh').format('HH:mm:ss DD/MM/YYYY');
        global.showFrame({ threadName: threadNameLocal, senderName, message: event.body || '', time: timeLocal });
      }
    } catch (err) {
      logger('showFrame invocation error: ' + err.message, 'error');
    }

    switch (type) {
      case 'message':
        await handlers.handleCommandEvent(event);
        await handlers.handleCreateDatabase(event);
        handlers.handleCommandNoprefix(event);
        return handlers.handleCommand(event);
      case 'message_reaction':
        handlers.handleUnsend(event);
        return handlers.handleReaction(event);
      case 'message_reply':
        await handlers.handleReply(event);
        handlers.handleCommandEvent(event);
        await handlers.handleCreateDatabase(event);
        handlers.handleCommandNoprefix(event);
        return handlers.handleCommand(event);
      case 'message_unsend':
        return handlers.handleCommandEvent(event);
      default:
        return;
    }
  };
};