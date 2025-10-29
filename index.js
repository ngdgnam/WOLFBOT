// start.js - WolfBot/Niio-Limit Robust Starter (Merged & Enhanced)
const { spawn } = require("child_process");
const fs = require('fs-extra');
const path = require('path');
const logger = require("./utils/log"); // Unified logger (works for both 'logger' and 'log')

// Optional requires (e.g., for specific bots)
try {
  require('./includes/chess/covua');
  logger('✅ Loaded chess module (covua).', '[ INIT ]');
} catch (e) {
  logger(`⚠️ Skipped chess module: ${e.message}`, '[ INIT ]');
}

// Configurable options
const config = {
  script: process.env.BOT_SCRIPT || 'mirai.js', // Default to mirai.js; set env for niio-limit.js
  maxRestarts: process.env.MAX_RESTARTS || 5, // Prevent infinite loops
  baseDelay: 1000, // 1s base for delays
  logPrefix: '⟦ KÍCH HOẠT ⟧⪼ ', // Vietnamese style with emoji
  initialMessage: '🌸 ĐANG KHỞI ĐỘNG BOT'
};

// Global counters
let countRestart = 0;
let mqttClient; // If needed for external reconnect (from mirai.js context)

// Unified delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function startBot(message = config.initialMessage) {
  logger(message, config.logPrefix || '[ Starting ]');

  const child = spawn("node", [
    "--trace-warnings",
    "--async-stack-traces",
    config.script
  ], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", async (exitCode) => {
    const restartMsg = "🔄 BOT ĐANG KHỞI ĐỘNG LẠI!!!";
    const heavyErrorMsg = "🔄 BOT ĐANG KHỞI ĐỘNG LẠI DO LỖI NẶNG!!!";
    const delayMsg = (delaySec) => `🌸 BOT ĐÃ ĐƯỢC KÍCH HOẠT, VUI LÒNG CHỜ ${delaySec} GIÂY!!!`;

    if (countRestart >= config.maxRestarts) {
      logger(`❌ Max restarts (${config.maxRestarts}) reached. Exiting to prevent loop.`, '[ Starting ]');
      process.exit(1);
      return;
    }

    if (exitCode === 1) {
      logger(restartMsg, '[ Khởi động ]');
      countRestart++;
      startBot(restartMsg);
    } else if (exitCode >= 200 && exitCode < 300) {
      const delayMs = (exitCode - 200) * config.baseDelay;
      logger(delayMsg(delayMs / 1000), '[ Khởi động ]');
      await delay(delayMs);
      countRestart++;
      startBot(restartMsg);
    } else if (exitCode === 134) {
      logger(heavyErrorMsg, '[ Khởi động ]');
      countRestart++;
      startBot(heavyErrorMsg);
    } else if (exitCode !== 0) {
      // Fallback for other non-zero: Restart with limit check
      logger(`${restartMsg} (Exit code: ${exitCode})`, '[ Khởi động ]');
      countRestart++;
      if (countRestart < config.maxRestarts) {
        startBot(restartMsg);
      } else {
        process.exit(exitCode);
      }
    } else {
      logger(`✅ Bot ended gracefully with exit code ${exitCode}.`, '[ Khởi động ]');
      process.exit(0);
    }
  });

  child.on("error", (error) => {
    logger(`❌ An error occurred: ${JSON.stringify(error)}`, '[ Starting ]');
    // Optional: Restart on spawn error after delay
    setTimeout(() => {
      if (countRestart < config.maxRestarts) {
        countRestart++;
        startBot("🔄 Restarting after spawn error...");
      } else {
        process.exit(1);
      }
    }, config.baseDelay);
  });

  // Expose child for external access (e.g., graceful shutdown)
  global.botChild = child;
}

// Graceful shutdown handler
process.on('SIGINT', () => {
  logger('🛑 Received SIGINT. Shutting down gracefully...', '[ Shutdown ]');
  if (global.botChild) global.botChild.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger('🛑 Received SIGTERM. Shutting down gracefully...', '[ Shutdown ]');
  if (global.botChild) global.botChild.kill('SIGTERM');
  process.exit(0);
});

// Start the bot
startBot();