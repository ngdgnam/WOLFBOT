// mirai.js - WolfBot Stable AutoFix Version (Rewritten for Robustness)
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const moment = require('moment-timezone');
const readline = require('readline');
const login = require('@dongdev/fca-unofficial');
const logger = require('./utils/log.js');

// === ENHANCED AUTO FIX & CLEANUP FOR COMMANDS ===
function autoFixCommands() {
  const commandDir = path.join(__dirname, 'modules/commands');

  function fixSyntax(content) {
    // Comprehensive regex-based fixes for common JS syntax errors
    return content
      // Fix await usage
      .replace(/\bawait\s+(\w+)/g, 'await $1')
      // Fix catch blocks
      .replace(/catch\s*(\w*)/g, 'catch ($1)')
      // Fix if-else chains
      .replace(/;\s*else/g, '} else')
      .replace(/else\s*if\s*\(/g, '} else if (')
      // Fix async function declarations
      .replace(/function\s+async\s+(\w+)/g, 'async function $1')
      .replace(/async\s+function\s+(\w*)\s*\(/g, 'async function $1 (')
      // Fix duplicate parens/brackets
      .replace(/\)\s*\)/g, ')')
      .replace(/\}\s*\{/g, '} {')
      // Fix trailing commas in objects/arrays
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // Ensure proper indentation (basic)
      .replace(/\n\s{4,}/g, '\n    ');
  }

  function generateBoilerplate(commandName) {
    return `module.exports.config = {
  name: "${commandName}",
  version: "1.0.0",
  credits: "AutoFixer",
  hasPermission: 0,
  description: "Command auto-generated and fixed",
  commandCategory: "AutoFix",
  usages: "",
  cooldowns: 5
};

module.exports.run = async function({ api, event, args }) {
  return api.sendMessage("✅ Command \${commandName} has been auto-fixed and is now functional!", event.threadID, event.messageID);
};

// Add your custom logic here
`;
  }

  function fixFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8').trim();
      
      // Skip if empty or non-JS
      if (!content || !content.includes('module.exports')) {
        // Backup original
        const backupPath = filePath + '.backup.js';
        fs.copySync(filePath, backupPath);
        
        // Generate full boilerplate
        content = generateBoilerplate(path.basename(filePath, '.js'));
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(chalk.green(`✅ Generated boilerplate for: ${filePath}`));
        return;
      }

      // Apply syntax fixes
      const fixedContent = fixSyntax(content);
      
      // Validate basic structure (try to require it)
      const tempPath = path.join(__dirname, 'temp_fix.js');
      fs.writeFileSync(tempPath, fixedContent, 'utf8');
      
      try {
        require(tempPath);
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        console.log(chalk.green(`✅ Syntax fixed: ${filePath}`));
      } catch (validateErr) {
        console.log(chalk.yellow(`⚠️ Validation failed for ${filePath}: ${validateErr.message}. Keeping original.`));
      } finally {
        fs.unlinkSync(tempPath); // Cleanup temp file
      }
    } catch (err) {
      // Severe error: Rename to .error.js
      const errorPath = filePath + '.error.js';
      fs.renameSync(filePath, errorPath);
      console.log(chalk.red(`❌ Severe error in ${filePath}, renamed to ${errorPath}`));
      console.log(chalk.gray(`Error: ${err.message}`));
    }
  }

  function walk(dir) {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          walk(fullPath);
        } else if (file.name.endsWith('.js') && !file.name.endsWith('.error.js') && !file.name.endsWith('.backup.js')) {
          fixFile(fullPath);
        }
      }
    } catch (err) {
      console.log(chalk.red(`❌ Error walking directory ${dir}: ${err.message}`));
    }
  }

  if (fs.existsSync(commandDir)) {
    console.log(chalk.blue('🔧 Starting AutoFix for all commands...'));
    walk(commandDir);
    console.log(chalk.green('✅ AutoFix completed for all commands.'));
  } else {
    console.log(chalk.yellow('⚠️ No modules/commands directory found — skipping AutoFix.'));
  }
}

// Run AutoFix immediately on startup
autoFixCommands();

// === GLOBALS SETUP (Enhanced for Better Error Handling) ===
const dataDir = './utils/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(chalk.green(`✅ Created data directory: ${dataDir}`));
}

global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  getTime: (type) => {
    try {
      return moment.tz("Asia/Ho_Chi_Minh").format({
        fullTime: "HH:mm:ss DD/MM/YYYY",
        fullHour: "HH:mm:ss",
        fullDate: "DD/MM/YYYY"
      }[type] || "HH:mm:ss DD/MM/YYYY");
    } catch (e) {
      return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
  }
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
  allThreadID: []
};

global.utils = require('./utils/func');
global.config = require('./config.json');
global.configModule = {};
global.language = {};

// === ENHANCED LANGUAGE LOADING ===
function loadLanguage() {
  try {
    const lang = global.config.language || 'en';
    const langPath = path.join(__dirname, 'languages', `${lang}.lang`);
    if (!fs.existsSync(langPath)) {
      console.log(chalk.yellow(`⚠️ Language file not found: ${lang}.lang. Using English defaults.`));
      return;
    }

    const content = fs.readFileSync(langPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));

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
    console.log(chalk.green(`✅ Loaded language: ${lang}`));
  } catch (e) {
    console.log(chalk.red(`❌ Language load error: ${e.message}`));
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

// === UTILITY: COOKIE TO APPSTATE CONVERSION ===
function parseCookiesToAppState(cookieString) {
  if (!cookieString) return [];
  return cookieString.split(';').map(pair => {
    const trimmed = pair.trim();
    if (!trimmed) return null;
    const [key, value] = trimmed.split('=', 2);
    return { key: key.trim(), value: value ? value.trim() : '' };
  }).filter(Boolean);
}

async function getCookieFromConsole(prompt = "👉 Paste your Facebook cookie here: ") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// === MAIN BOT INITIALIZER ===
async function initializeBot({ models }) {
  const fbstatePath = path.join(dataDir, 'fbstate.json');
  let appState = [];

  // Load existing appstate
  if (fs.existsSync(fbstatePath)) {
    try {
      appState = JSON.parse(fs.readFileSync(fbstatePath, 'utf8'));
      console.log(chalk.green('✅ Loaded existing fbstate.json for login.'));
    } catch (e) {
      console.log(chalk.red('❌ Invalid fbstate.json. Will prompt for new cookie.'));
      appState = [];
    }
  }

  // Prompt for cookie if needed
  if (!appState.length) {
    const cookie = await getCookieFromConsole();
    if (!cookie) {
      console.log(chalk.red('❌ No cookie provided. Exiting.'));
      process.exit(1);
    }
    appState = parseCookiesToAppState(cookie);
    fs.writeFileSync(fbstatePath, JSON.stringify(appState, null, 2));
    console.log(chalk.green('✅ Saved new fbstate.json.'));
  }

  console.log(chalk.yellow('🔄 Logging in with AppState...'));

  return new Promise((resolve, reject) => {
    login({ appState }, (err, api) => {
      if (err) {
        console.log(chalk.red('❌ Login failed:'), err.error || err.message || JSON.stringify(err));
        console.log(chalk.yellow('💡 Tip: Delete utils/data/fbstate.json and try again.'));
        reject(err);
        return;
      }

      // Update appstate with latest from API
      const updatedAppState = api.getAppState();
      fs.writeFileSync(fbstatePath, JSON.stringify(updatedAppState, null, 2));

      global.client.api = api;
      console.log(chalk.green('✅ Login successful!'));
      console.log(chalk.cyan(figlet.textSync('Wolf Bot', { horizontalLayout: 'fitted' })));

      // === ENHANCED MODULE LOADER ===
      const loadModules = (dir, target) => {
        if (!fs.existsSync(dir)) {
          console.log(chalk.yellow(`⚠️ Directory not found: ${dir}`));
          return 0;
        }
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let count = 0;
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          try {
            if (file.isDirectory()) {
              count += loadModules(filePath, target);
            } else if (file.name.endsWith('.js') && !file.name.endsWith('.error.js')) {
              delete require.cache[require.resolve(filePath)]; // Clear cache for hot reload
              const mod = require(filePath);
              // More flexible validation: Check for config.name and either run or onStart
              if (mod.config?.name && (mod.run || mod.onStart || mod.onLoad)) {
                global.client[target].set(mod.config.name, mod);
                count++;
                console.log(chalk.gray(`📦 Loaded ${target.slice(0, -1)}: ${mod.config.name}`));
              } else {
                console.log(chalk.yellow(`⚠️ Invalid module structure: ${filePath}`));
              }
            }
          } catch (e) {
            console.log(chalk.red(`❌ Load error for ${filePath}: ${e.message}`));
            // Optionally auto-fix on load failure, but since we did it at startup, just log
          }
        }
        return count;
      };

      const commands = loadModules(path.join(__dirname, 'modules/commands'), 'commands');
      const events = loadModules(path.join(__dirname, 'modules/events'), 'events');
      logger.loader(`Loaded ${commands} commands and ${events} events.`);

      // === MQTT LISTENER SETUP ===
      try {
        const listener = require('./includes/listen')({ api, models });
        api.listenMqtt((error, event) => {
          if (error) {
            logger.error('MQTT Error: ' + JSON.stringify(error));
            return;
          }
          if (["presence", "typ", "read_receipt"].includes(event.type)) return;
          listener(event);
        });
        console.log(chalk.green('[ MQTT ] Connected successfully.'));
      } catch (e) {
        console.log(chalk.red('❌ Listener initialization failed:'), e.message);
      }

      resolve(api);
    });
  });
}

// === DATABASE CONNECTION & BOT START ===
(async () => {
  try {
    console.log(chalk.blue('🗄️ Connecting to database...'));
    const { Sequelize, sequelize } = require("./includes/database");
    await sequelize.authenticate();
    const models = require('./includes/database/model')({ Sequelize, sequelize });
    console.log(chalk.green('[ DATABASE ] Connected successfully.'));

    await initializeBot({ models });
  } catch (e) {
    console.log(chalk.red('❌ Database connection failed:'), e.message);
    console.log(chalk.yellow('💡 Ensure your DB config is correct in config.json.'));
    process.exit(1);
  }
})();