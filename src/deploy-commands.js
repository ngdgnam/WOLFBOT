const fs = require('fs');
const path = require('path');
const { REST, Routes, Collection } = require('discord.js');
const config = require('./config/config');

// Dùng lại logic quét command nhưng chỉ để lấy JSON, không cần client Discord thật.
function collectCommandsJSON() {
  const commandsPath = path.join(__dirname, 'commands');
  const folders = fs.readdirSync(commandsPath).filter(f =>
    fs.statSync(path.join(commandsPath, f)).isDirectory()
  );

  const commandsJSON = [];
  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const command = require(path.join(folderPath, file));
      if (command?.data) commandsJSON.push(command.data.toJSON());
    }
  }
  return commandsJSON;
}

(async () => {
  if (!config.token || !config.clientId) {
    console.error('❌ Thiếu DISCORD_TOKEN hoặc CLIENT_ID trong .env');
    process.exit(1);
  }

  const commands = collectCommandsJSON();
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log(`⏳ Đang đăng ký ${commands.length} slash command...`);

    const route = config.guildId
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);

    await rest.put(route, { body: commands });

    console.log(
      config.guildId
        ? `✅ Đã đăng ký command cho guild ${config.guildId} (áp dụng ngay lập tức, dùng khi dev)`
        : '✅ Đã đăng ký command toàn cục (có thể mất tới 1 giờ để Discord cập nhật)'
    );
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash command:', err);
  }
})();
