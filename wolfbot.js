const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require("fs-extra");
const { join, resolve } = require("path");
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const login = require('@dongdev/fca-unofficial')
const fs = require('fs-extra');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
global.moment = moment;
const axios = require('axios');
// Avoid axios throwing on non-2xx so modules can handle rate-limit responses (429) gracefully
axios.defaults.validateStatus = () => true;
if (!fs.existsSync('./utils/data')) {
  fs.mkdirSync('./utils/data', { recursive: true });
}
global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: "",
  getTime: option => moment.tz("Asia/Ho_Chi_minh").format({ seconds: "ss", minutes: "mm", hours: "HH", date: "DD", month: "MM", year: "YYYY", fullHour: "HH:mm:ss", fullYear: "DD/MM/YYYY", fullTime: "HH:mm:ss DD/MM/YYYY" }[option])
};
global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.utils = require("./utils/func");
global.config = require('./config.json');
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
global.anti = resolve(__dirname, "./includes/data/anti/anti.json");
global.nodemodule = {
  "fs-extra": require("fs-extra"),
  "path": require("path"),
  "axios": require("axios"),
  "pidusage": require("pidusage")
};

const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}
global.getText = function (...args) {
    const langText = global.language;    
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
        let text = langText[args[0]][args[1]] || '';
        for (let i = 2; i < args.length; i++) {
          const regEx = RegExp(`%${i - 1}`, 'g');
          text = text.replace(regEx, args[i]);
        }
    return text;
}
function onBot({ models }) {
  // Load Facebook appState (cookie) safely with fallbacks
  let appState = null;
  try {
    if (fs.existsSync('./cookie.txt')) {
      const raw = fs.readFileSync('./cookie.txt', 'utf8');
      try { appState = global.utils.parseCookies(raw); } catch (e) { console.warn('Không thể parse cookie.txt:', e.message); }
    }
  } catch (e) { /* ignore */ }
  if (!appState) {
    try {
      const fbstatePath = './utils/data/fbstate.json';
      if (fs.existsSync(fbstatePath)) {
        appState = JSON.parse(fs.readFileSync(fbstatePath, 'utf8'));
      }
    } catch (e) { console.warn('Không thể đọc utils/data/fbstate.json:', e.message); }
  }
  if (!appState) {
    console.error('Không tìm thấy appState (cookie). Tạo file `cookie.txt` hoặc `./utils/data/fbstate.json` để tiếp tục.');
    return;
  }

  login({ appState }, async (loginError, api) => {
    if (loginError) return console.log(loginError);
        api.setOptions(global.config.FCAOption);
        writeFileSync('./utils/data/fbstate.json', JSON.stringify(api.getAppState(), null, 2));
        global.config.version = '3.0.0';
        global.client.timeStart = new Date().getTime();
        global.client.api = api;
        // Provide compatibility shim for upload helpers expecting api.postFormData
        try {
          if (typeof api.postFormData !== 'function') {
            api.postFormData = async function (url, form) {
              try {
                if (typeof api.httpPostFormData === 'function') return await api.httpPostFormData(url, form);
              } catch (e) {}
              const FormData = require('form-data');
              const axios = require('axios');
              const fd = new FormData();
              for (const k in form) fd.append(k, form[k]);
              const headers = fd.getHeaders ? fd.getHeaders() : {};
              const res = await axios.post(url, fd, { headers: headers, withCredentials: true });
              return { body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) };
            };
          }
        } catch (e) { console.error('Error setting postFormData shim:', e.message); }
        const userId = api.getCurrentUserID();
        const user = await api.getUserInfo([userId]);
        const userName = user[userId]?.name || null;
        logger(`Đăng nhập thành công - ${userName} (${userId})`, '[ LOGIN ] >');
        console.log(chalk.yellow(figlet.textSync('WOLFBOT', { horizontalLayout: 'full' })));
        const boxWidth = 70;
        const topBox = chalk.cyan("╔" + "═".repeat(boxWidth - 2) + "╗");
        const bottomBox = chalk.cyan("╚" + "═".repeat(26) + " W O L F B O T " + "═".repeat(26) + "╝");

        console.log(topBox);

        logger.loader(` Admin: ${global.config.ADMIN_NAME}`);
        logger.loader(` Admin UID: ${global.config.ADMINBOT[0]}`);
        logger.loader(` ID BOT: ${userId}`);
        logger.loader(` Prefix: ${global.config.PREFIX}`);
        logger.loader(` NAME BOT: ${(!global.config.BOTNAME) ? "" : global.config.BOTNAME}`);

        console.log(bottomBox);

        // Expose showFrame globally so other modules can invoke console logging for events
        global.showFrame = function ({ threadName, senderName, message, time }) {
          try {
            console.log(
              chalk.hex("#DEADED")("\n========= WolfBot Console Log ==============") + "\n" +
              chalk.hex("#C0FFEE")("├─ Nhóm: " + threadName) + "\n" +
              chalk.hex("#FFAACC")("├─ User: " + senderName) + "\n" +
              chalk.hex("#A3FF00")("├─ Nội dung: " + message) + "\n" +
              chalk.hex("#FFFF00")("├─ Time: " + time) + "\n" +
              chalk.hex("#DEADED")("============================================\n")
            );
          } catch (e) {
            console.error('showFrame error:', e.message);
          }
        };
        (function () {
            const loadModules = (path, collection, disabledList, type) => {
              let loadedCount = 0;
              
              const processDirectory = (dir) => {
                const items = readdirSync(dir);
                for (const item of items) {
                  const fullPath = join(dir, item);
                  const stat = require('fs-extra').statSync(fullPath);
                  
                  if (stat.isDirectory()) {
                    // Skip FolderGame and other helper directories
                    if (!['FolderGame', 'cache', 'data'].includes(item)) {
                      // Recursively process subdirectories
                      processDirectory(fullPath);
                    }
                  } else if (item.endsWith('.js') && !item.includes('example') && !disabledList.includes(item) && !['index.js', 'helper.js'].includes(item) && !item.match(/\.(format|gang|ability|role|role|type|spec)\.js$/)) {
                    try {
                      let mod;
                      try {
                        mod = require(fullPath);
                      } catch (e) {
                        console.error(`Lỗi khi require file ${item}:`, e.message);
                        continue;
                      }
                      const { config, run, onLoad, handleEvent } = mod || {};
                      // If this file does not export a command/event shape, skip silently (it's likely a helper/class)
                      if (!config || !run) {
                        continue;
                      }
                      if (type === 'commands' && !config.commandCategory) {
                        // Some modules use `category` instead of `commandCategory` or omit it.
                        // Prefer a warning and fallback rather than hard failure.
                        if (config.category) {
                          config.commandCategory = config.category;
                        } else {
                          console.warn(`Cảnh báo: Lệnh ${config.name || item} thiếu 'commandCategory' trong file: ${item}. Sử dụng 'General' làm mặc định.`);
                          config.commandCategory = config.commandCategory || 'General';
                        }
                      }
                      if (global.client[collection].has(config.name)) {
                        console.error(`Tên ${type === 'commands' ? 'lệnh' : 'sự kiện'} đã tồn tại: ${config.name}`);
                        continue;
                      }
                      if (config.envConfig) {
                        global.configModule[config.name] = global.configModule[config.name] || {};
                        global.config[config.name] = global.config[config.name] || {};  
                        for (const key in config.envConfig) {
                          global.configModule[config.name][key] = global.config[config.name][key] || config.envConfig[key] || '';
                          global.config[config.name][key] = global.configModule[config.name][key];
                        }
                      }
                      if (onLoad) onLoad(api, models);
                      if (handleEvent) global.client.eventRegistered.push(config.name);
                      global.client[collection].set(config.name, mod);
                      loadedCount++;
                    } catch (error) {
                      console.error(`Lỗi khi tải ${type === 'commands' ? 'lệnh' : 'sự kiện'} ${item}:`, error.message);
                    }
                  }
                }
              };
              
              processDirectory(path);
              if (loadedCount === 0) {
                console.log(`Không tìm thấy ${type === 'commands'? 'lệnh' :'sự kiện'} nào trong thư mục ${path}`); 
              }
              return loadedCount;
            };
            const commandPath = join(global.client.mainPath, 'modules', 'commands');
            const eventPath = join(global.client.mainPath, 'modules', 'events');
            const loadedCommandsCount = loadModules(commandPath, 'commands', global.config.commandDisabled, 'commands');
            logger.loader(`Loaded ${loadedCommandsCount} commands`);    
            const loadedEventsCount = loadModules(eventPath, 'events', global.config.eventDisabled, 'events');
            logger.loader(`Loaded ${loadedEventsCount} events`);
        })();
        // Provide compatibility shim for upload helpers expecting api.postFormData
        try {
          if (typeof api.postFormData !== 'function') {
            api.postFormData = async function (url, form) {
              try {
                if (typeof api.httpPostFormData === 'function') return await api.httpPostFormData(url, form);
              } catch (e) {}
              const FormData = require('form-data');
              const axios = require('axios');
              const fd = new FormData();
              for (const k in form) fd.append(k, form[k]);
              const headers = fd.getHeaders ? fd.getHeaders() : {};
              const res = await axios.post(url, fd, { headers: headers, withCredentials: true });
              return { body: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) };
            };
          }
        } catch (e) { console.error('Error setting postFormData shim:', e.message); }
        logger.loader(' Ping load source: ' + (Date.now() - global.client.timeStart) + 'ms');
        writeFileSync('./config.json', JSON.stringify(global.config, null, 4), 'utf8');
        const listener = require('./includes/listen')({ api, models });
        function listenerCallback(error, event) {
          if (error) {
            if (JSON.stringify(error).includes("601051028565049")) {
              const form = {
                av: api.getCurrentUserID(),
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "FBScrapingWarningMutation",
                variables: "{}",
                server_timestamps: "true",
                doc_id: "6339492849481770",
              };
              api.httpPost("https://www.facebook.com/api/graphql/", form, (e, i) => {
                const res = JSON.parse(i);
                if (e || res.errors) return logger("Lỗi không thể xóa cảnh cáo của facebook.", "error");
                if (res.data.fb_scraping_warning_clear.success) {
                  logger("Đã vượt cảnh cáo facebook thành công.", "[ SUCCESS ] >");
                  global.handleListen = api.listenMqtt(listenerCallback);
                  setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
                  logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
                }
              });
            } else {
              return logger(global.getText("mirai", "handleListenError", JSON.stringify(error)), "error");
            }
          }
          if (["presence", "typ", "read_receipt"].some((data) => data === event?.type)) return;
          if (global.config.DeveloperMode) console.log(event);
          return listener(event);
        }
        function connect_mqtt() {
          global.handleListen = api.listenMqtt(listenerCallback);
          setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
          logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
        }
        connect_mqtt();
    });
}
(async() => {
    try {
        const { Sequelize, sequelize } = require("./includes/database");
        await sequelize.authenticate();
        const models = require('./includes/database/model')({ Sequelize, sequelize });
        logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ]');
        onBot({ models });
    } catch (error) { 
        console.log(error);
      }
})();
process.on("unhandledRejection", (err, p) => {console.log(p)});
