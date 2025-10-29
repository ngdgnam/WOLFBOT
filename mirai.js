// mirai.js - WolfBot Stable Merged Version (No AutoFix, Robust & Optimized - Fixed Models & Duplicates)
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
const readline = require('readline');
const login = require('@dongdev/fca-unofficial');
const logger = require('./utils/log.js');

// Process Error Handlers
process.on('uncaughtException', error => console.error(chalk.red('Unhandled Exception:'), error));
process.on('unhandledRejection', (reason, promise) => {
  if (JSON.stringify(reason).includes("571927962827151")) {
    console.log(chalk.yellow(`Lỗi khi get dữ liệu mới! Khắc phục: hạn chế reset!!`));
  } else {
    console.error(chalk.red('Unhandled Rejection:'), reason);
  }
});

// GLOBALS SETUP
const dataDir = './utils/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logger.loader(chalk.green(`✅ Created data directory: ${dataDir}`));
}

global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: path.resolve(__dirname, 'config.json'),
  timeStart: Date.now(),
  getTime: (type) => moment.tz("Asia/Ho_Chi_Minh").format({
    seconds: "ss", minutes: "mm", hours: "HH", day: "dddd", date: "DD", month: "month", year: "month",
    fullHour: "HH:mm:ss", fullYear: "DD/MM/YYYY", fullTime: "HH:mm:ss DD/MM/YYYY"
  }[type] || "HH:mm:ss DD/MM/YYYY")
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: [],
  groupInteractionsData: []
};

global.utils = require('./utils/func');
global.config = require('./config.json');
global.configModule = {};
global.moduleData = [];
global.language = {};
global.nodemodule = new Proxy({}, {
  get: (target, name) => {
    if (!target[name]) target[name] = require(name);
    return target[name];
  }
});

// === ENHANCED MODULE LOADER (DEFINED EARLY) ===
function loadModules(dir, target, disabledList = []) {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter(f => f.name.endsWith('.js') && !f.name.includes('example') && !disabledList.includes(f.name));
  let count = 0;
  let errorCount = 0;
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    try {
      delete require.cache[require.resolve(filePath)];
      const mod = require(filePath);
      const { config, run, onStart, onLoad, handleEvent } = mod;
      if (!config?.name || (!run && !onStart)) {
        logger.loader(chalk.yellow(`⚠️ Invalid structure in ${target}: ${file.name}`));
        continue;
      }
      if (global.client[target].has(config.name)) {
        logger.loader(chalk.yellow(`⚠️ Duplicate ${target}: ${config.name} (${file.name})`));
        continue;
      }
      if (config.envConfig) {
        global.configModule[config.name] = global.configModule[config.name] || {};
        Object.assign(global.configModule[config.name], config.envConfig);
        Object.assign(global.config[config.name], config.envConfig);
      }
      // onLoad called later after api/models ready
      if (handleEvent) global.client.eventRegistered.push(config.name);
      global.client[target].set(config.name, mod);
      count++;
    } catch (e) {
      errorCount++;
      logger.loader(chalk.red(`❌ Load error ${target} ${file.name}: ${e.message}`));
    }
  }
  logger.loader(chalk.green(`✅ Total ${target}: ${count} (errors: ${errorCount})`));
  return count;
}

// LANGUAGE LOADING
function loadLanguage() {
  try {
    const lang = global.config.language || 'en';
    const langPath = path.join(__dirname, 'languages', `${lang}.lang`);
    if (!fs.existsSync(langPath)) {
      logger.loader(chalk.yellow(`⚠️ Language file not found: ${lang}.lang. Using defaults.`));
      return;
    }

    const content = fs.readFileSync(langPath, 'utf8');
    const lines = content.split(/\r?\n|\r/).filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const [key, ...valParts] = line.split('=');
      if (!key) continue;
      const value = valParts.join('=').trim().replace(/\\n/g, '\n');
      const [head, ...subParts] = key.trim().split('.');
      const subKey = subParts.join('.');
      if (head && subKey) {
        global.language[head] = global.language[head] || {};
        global.language[head][subKey] = value;
      }
    }
    logger.loader(chalk.green(`✅ Loaded language: ${lang}`));
  } catch (e) {
    logger.loader(chalk.red(`❌ Language load error: ${e.message}`), 'error');
  }
}
loadLanguage();

global.getText = (...args) => {
  try {
    const [module, key, ...replacements] = args;
    let text = global.language?.[module]?.[key] || '';
    replacements.forEach((rep, i) => {
      text = text.replace(new RegExp(`\\%${i + 1}`, 'g'), rep);
    });
    return text;
  } catch {
    return `[Missing translation: ${args.join('.')}]`;
  }
};

// UTILITY: COOKIE/APPSTATE
function parseCookiesToAppState(cookieString) {
  if (!cookieString) return [];
  return cookieString.split(';').map(pair => {
    const trimmed = pair.trim();
    if (!trimmed) return null;
    const [key, value] = trimmed.split('=', 2);
    return { key: key.trim(), value: value ? value.trim() : '' };
  }).filter(Boolean);
}

function getCookieFromConsole(prompt = "👉 Paste your Facebook cookie here: ") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Load AppState
const appstatePath = path.join(dataDir, 'appstate.json');
const cookiePath = './cookie.txt';
let appState = [];

if (fs.existsSync(appstatePath)) {
  try {
    appState = JSON.parse(fs.readFileSync(appstatePath, 'utf8'));
    logger.loader(chalk.green('✅ Loaded existing appstate.json for login.'));
  } catch (e) {
    logger.loader(chalk.red('❌ Invalid appstate.json. Falling back to cookie.'), 'error');
  }
}

if (!appState.length && fs.existsSync(cookiePath)) {
  try {
    const cookie = fs.readFileSync(cookiePath, 'utf8');
    appState = parseCookiesToAppState(cookie);
    logger.loader(chalk.green('✅ Loaded from cookie.txt.'));
  } catch (e) {
    logger.loader(chalk.red('❌ Invalid cookie.txt.'), 'error');
  }
}

if (!appState.length) {
  (async () => {
    const cookie = await getCookieFromConsole();
    if (!cookie) {
      logger.loader(chalk.red('❌ No cookie provided. Exiting.'), 'error');
      process.exit(1);
    }
    appState = parseCookiesToAppState(cookie);
    fs.writeFileSync(cookiePath, cookie);
    logger.loader(chalk.green('✅ Saved new cookie.txt.'));
    startBot(appState);
  })();
} else {
  startBot(appState);
}

// === MAIN BOT INITIALIZER ===
function startBot(appState) {
  const handleError = (err) => {
    logger(JSON.stringify(err, null, 2), chalk.red('[ LOGIN ERROR ] >'), 'error');
  };

  const clearFacebookWarning = (api, callback) => {
    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "FBScrapingWarningMutation",
      variables: "{}",
      server_timestamps: "true",
      doc_id: "6339492849481770",
    };

    api.httpPost("https://www.facebook.com/api/graphql/", form, (error, res) => {
      if (error || res.errors) {
        logger("Tiến hành vượt cảnh báo", 'error');
        return callback && callback(true);
      }
      if (res.data?.fb_scraping_warning_clear?.success) {
        logger("Đã vượt cảnh cáo Facebook thành công.", chalk.green('[ SUCCESS ] >'));
        return callback && callback(true);
      }
    });
  };

  login({ appState }, (err, api) => {
    if (err) return handleError(err);

    // Update appstate
    const updatedAppState = api.getAppState();
    fs.writeFileSync(appstatePath, JSON.stringify(updatedAppState, null, 2));

    api.setOptions(global.config.FCAOption || {});
    global.api = api;

    const userId = api.getCurrentUserID();
    api.getUserInfo(userId, (err, userInfo) => {
      if (err) {
        logger(chalk.red(`❌ Failed to get user info: ${err.message}`), 'error');
        return;
      }
      const userName = userInfo[userId]?.name || 'Unknown';
      logger.loader(chalk.green(`✅ Đăng nhập thành công - ${userName} (${userId})`), '[ LOGIN ] >');
      console.log(chalk.cyan(figlet.textSync('Wolf bot', { horizontalLayout: 'fitted' })) || chalk.yellow(figlet.textSync('NIIO LIMIT', { horizontalLayout: 'full' })));

      // Memory Monitor
      const formatMemory = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
      const logMemoryUsage = () => {
        const { rss } = process.memoryUsage();
        logger(`🔹 RAM đang sử dụng (RSS): ${formatMemory(rss)} MB`, chalk.gray('[ Giám sát ]'));
        if (rss > 800 * 1024 * 1024) {
          logger('⚠️ Phát hiện rò rỉ bộ nhớ, khởi động lại ứng dụng...', chalk.yellow('[ Giám sát ]'));
          process.exit(1);
        }
      };
      setInterval(logMemoryUsage, 10000);

      // Auto Clean Cache
      if (global.config.autoCleanCache?.Enable) {
        const cachePaths = global.config.autoCleanCache.CachePaths || [];
        const fileExtensions = (global.config.autoCleanCache.AllowFileExtension || []).map(ext => ext.toLowerCase());
        const deleteFileOrDirectory = (filePath) => {
          fs.stat(filePath, (err, stats) => {
            if (err) return console.error(chalk.red(`[ CLEANER ] Không thể truy cập: ${filePath}`), err);
            if (stats.isDirectory()) {
              fs.rm(filePath, { recursive: true, force: true }, (err) => {
                if (err) console.error(chalk.red(`[ CLEANER ] Lỗi khi xóa thư mục: ${filePath}`), err);
              });
            } else if (fileExtensions.includes(path.extname(filePath).toLowerCase())) {
              fs.unlink(filePath, (err) => {
                if (err) console.error(chalk.red(`[ CLEANER ] Lỗi khi xóa tệp: ${filePath}`), err);
              });
            }
          });
        };
        cachePaths.forEach(folderPath => {
          if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
          fs.readdir(folderPath, (err, files) => {
            if (err) return console.error(chalk.red(`[ CLEANER ] Lỗi khi đọc thư mục: ${folderPath}`), err);
            files.forEach(file => deleteFileOrDirectory(path.join(folderPath, file)));
          });
        });
        logger(`Đã xử lý tất cả các đường dẫn trong CachePaths.`, chalk.green('[ CLEANER ]'));
      } else {
        logger(`Auto Clean Cache đã bị tắt.`, chalk.yellow('[ CLEANER ]'));
      }

      // === ENHANCED MODULE LOADER (Shortened Log, AFTER API & MODELS) ===
      const loadModules = (dir, target, disabledList = []) => {
        if (!fs.existsSync(dir)) return 0;
        const files = fs.readdirSync(dir, { withFileTypes: true }).filter(f => f.name.endsWith('.js') && !f.name.includes('example') && !disabledList.includes(f.name));
        let count = 0;
        let errorCount = 0;
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          try {
            delete require.cache[require.resolve(filePath)];
            const mod = require(filePath);
            const { config, run, onStart, onLoad, handleEvent } = mod;
            if (!config?.name || (!run && !onStart)) {
              logger.loader(chalk.yellow(`⚠️ Invalid structure in ${target}: ${file.name}`));
              continue;
            }
            if (global.client[target].has(config.name)) {
              logger.loader(chalk.yellow(`⚠️ Duplicate ${target}: ${config.name} (${file.name})`));
              continue;
            }
            if (config.envConfig) {
              global.configModule[config.name] = global.configModule[config.name] || {};
              Object.assign(global.configModule[config.name], config.envConfig);
              Object.assign(global.config[config.name], config.envConfig);
            }
            // onLoad NOW with api & models
            if (onLoad) onLoad({ api, models: global.models });
            if (handleEvent) global.client.eventRegistered.push(config.name);
            global.client[target].set(config.name, mod);
            count++;
          } catch (e) {
            errorCount++;
            logger.loader(chalk.red(`❌ Load error ${target} ${file.name}: ${e.message}`));
          }
        }
        logger.loader(chalk.green(`✅ Total ${target}: ${count} (errors: ${errorCount})`));
        return count;
      };

      const commands = loadModules(path.join(__dirname, 'modules/commands'), 'commands', global.config.commandDisabled || []);
      const events = loadModules(path.join(__dirname, 'modules/events'), 'events', global.config.eventDisabled || []);
      logger.loader(chalk.green(`Loaded ${commands} commands and ${events} events.`));
      logger.loader(`Ping load source: ${Date.now() - global.client.timeStart}ms`);

      // OnLoad Modules
      const onloadDir = path.join(__dirname, 'modules/onload');
      if (fs.existsSync(onloadDir)) {
        fs.readdirSync(onloadDir).filter(module => module.endsWith('.js')).forEach(module => {
          try {
            require(path.join(onloadDir, module))({ api, models: global.models });
          } catch (e) {
            logger.loader(chalk.red(`❌ OnLoad error for ${module}: ${e.message}`));
          }
        });
      }

      // === LISTENER SETUP ===
      api.listen((error, event) => {
        if (error) {
          logger('Lỗi lắng nghe: ' + JSON.stringify(error), 'error');
          return;
        }

        const threadID = event.threadID;
        const senderID = event.senderID;
        const messageID = event.messageID;
        const body = event.body || "";

        // Skip bot messages
        if (senderID === userId) return;

        // Trigger event handlers
        for (const [name, eventHandler] of global.client.events) {
          if (eventHandler.handleEvent) eventHandler.handleEvent({ api, event, models: global.models });
        }

        // Command handling
        const prefix = global.config.prefix || "!";
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = global.client.commands.get(commandName);

        if (!command) return;

        // Run command with models
        try {
          command.run({ api, event, args, models: global.models });
        } catch (err) {
          console.error(chalk.red(`[ERROR] Command ${commandName}: ${err.message}`));
          api.sendMessage(`❌ Lỗi lệnh ${commandName}: ${err.message}`, threadID, messageID);
        }
      });

      logger.loader(chalk.green('[ LISTENER ] Connected successfully.'));
      logger.loader(chalk.green(`🚀 WolfBot started! | Time: ${moment().tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY")}`));
    });
  });
}

// === DATABASE CONNECTION & BOT START ===
(async () => {
  try {
    logger.loader(chalk.blue('🗄️ Connecting to database...'));
    const { Sequelize, sequelize } = require("./includes/database");
    await sequelize.authenticate();
    const models = require('./includes/database/model')({ Sequelize, sequelize });
    global.models = models;
    logger.loader(chalk.green(global.getText('mirai', 'successConnectDatabase') || '[ DATABASE ] Connected successfully.'));

    // Load modules AFTER DB & API (inside login callback)
    // ... (loadModules called inside login to ensure api & models ready)

  } catch (e) {
    logger.loader(chalk.red(`❌ Database connection failed: ${e.message}`), 'error');
    logger.loader(chalk.yellow('💡 Ensure your DB config is correct in config.json.'));
    process.exit(1);
  }
})();