# WOLFBOT

WOLFBOT là một Messenger bot được chỉnh sửa (mod) từ nhiều nguồn gồm **Mirai**, **Niio**, **Lunar-Krystal** và một số module cộng đồng.  
Dự án hướng tới sự đơn giản, dễ tuỳ chỉnh và phù hợp với người muốn tự phát triển thêm tính năng.

---

## 1. Giới thiệu

WOLFBOT hoạt động dựa trên **Node.js** và **@dongdev/fca-unofficial**, hỗ trợ quản lý nhóm, tiện ích, thống kê và một số chức năng AI.  
Bot được xây dựng theo dạng module, dễ chỉnh sửa hoặc thêm lệnh mới.

---

## 2. Tính năng chính

- Quản lý nhóm: tag all, kick, đổi biệt danh, chào mừng – tạm biệt  
- AI: Simi / goibot1 / có thể tích hợp ChatGPT  
- Hình ảnh – Video – TTS  
- Thống kê tin nhắn, top chat  
- Tra cứu thông tin, tìm kiếm, tiện ích cơ bản  
- Hệ thống thuê bot (đang hoàn thiện)

---

## 3. Yêu cầu

- **Node.js** 16 / 18 / 20  
- **npm**  
- **Git**  
- appstate để đăng nhập Facebook

---

## 4. Cài đặt

```bash
git clone https://github.com/yourname/WOLFBOT
cd WOLFBOT
npm install
```

---

# WolfBot Installation & Setup Guide

## Quick Start

### Termux (Android)
```bash
bash <(curl -s https://raw.githubusercontent.com/ngdgnam/WOLFBOT/main/install-termux.sh)
```

Or if already cloned:
```bash
bash install-termux.sh
```

### VPS / Linux
```bash
bash <(curl -s https://raw.githubusercontent.com/ngdgnam/WOLFBOT/main/install-vps.sh)
```

Or if already cloned:
```bash
bash install-vps.sh
```

### Manual Setup (All Platforms)
```bash
bash setup.sh [termux|vps|auto]
```

---

## Prerequisites

### Termux
- Android device with Termux app installed
- Minimum 2GB RAM, 500MB free storage
- Network connection (WiFi or mobile data)

### VPS / Linux
- Ubuntu 18+, Debian 10+, CentOS 7+, or other Linux distributions
- Node.js 14+ (script will install if missing)
- 512MB RAM minimum (1GB recommended)
- sudo access

### All Platforms
- Facebook account (for bot login)
- Git (will be installed by setup script)

---

## Detailed Installation

### 1. Termux Setup

**Installation:**
```bash
# Download and run the installer
bash install-termux.sh

# Or clone first
git clone https://github.com/ngdgnam/WOLFBOT.git
cd WOLFBOT
bash install-termux.sh
```

**Configuration:**
```bash
# Edit config.json
nano config.json

# Add your Facebook admin ID and other settings
```

**Start the bot:**
```bash
npm start

# Or with Termux Boot (auto-start)
# Install "Termux:Boot" from F-Droid
# Create script: ~/.termux/boot/start-wolfbot.sh
```

**Optional - Keep running after closing terminal:**
```bash
# Install tmux
apt install -y tmux

# Create session
tmux new-session -d -s wolfbot 'npm start'

# Attach to session
tmux attach-session -t wolfbot

# Detach (Ctrl+B then D)
```

---

### 2. VPS Setup

**Installation:**
```bash
# Quick install
bash <(curl -s https://raw.githubusercontent.com/ngdgnam/WOLFBOT/main/install-vps.sh)

# Or manual clone
git clone https://github.com/ngdgnam/WOLFBOT.git wolfbot
cd wolfbot
bash install-vps.sh
```

**Configuration:**
```bash
# Edit config.json with your settings
nano config.json
```

**Start the bot:**

**Option A - Direct (simple):**
```bash
npm start
```

**Option B - Screen (recommended for manual):**
```bash
screen -S wolfbot -d -m npm start
screen -r wolfbot        # view logs
# Detach: Ctrl+A then D
```

**Option C - Tmux (alternative):**
```bash
tmux new-session -d -s wolfbot 'npm start'
tmux attach-session -t wolfbot
# Detach: Ctrl+B then D
```

**Option D - Systemd (recommended for auto-start):**
```bash
# After running install-vps.sh, the service file is created
sudo cp wolfbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable wolfbot
sudo systemctl start wolfbot

# Check status
sudo systemctl status wolfbot

# View logs
sudo journalctl -u wolfbot -f
sudo journalctl -u wolfbot -n 100  # last 100 lines
```

---

## Configuration

### config.json
```json
{
  "language": "vi",
  "PREFIX": ".",
  "BOTNAME": "WolfBot",
  "FACEBOOK_ADMIN": "your_admin_fb_uid",
  "ADMINBOT": ["your_bot_admin_uid"],
  "BOXADMIN": [],
  "NDH": [],
  "MAINTENANCE": false,
  "DeveloperMode": false
}
```

### Getting Facebook IDs
1. Go to Facebook
2. Open DevTools (F12 -> Console)
3. Run: `console.log(window.location.pathname)` to see your profile
4. Your ID is the number in the URL

---

## Git Workflow

### Initial Setup
```bash
# Clone repository
git clone https://github.com/ngdgnam/WOLFBOT.git
cd WOLFBOT

# Create your branch
git checkout -b my-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to your fork
git push origin my-feature
```

### Pulling Updates
```bash
# Update from main branch
git pull origin main

# Keep your changes
git stash           # save local changes
git pull origin main
git stash pop       # restore changes
```

### .gitignore
The repository includes `.gitignore` to protect sensitive files:
- `config.json` (your configuration)
- `cookie.txt` and `fbstate.json` (session data)
- `modules/data/` (runtime data)
- `node_modules/` (dependencies)

---

## Troubleshooting

### Termux Issues

**"Command not found: npm"**
```bash
apt install -y nodejs
npm --version
```

**"Permission denied" on startup**
```bash
# Grant storage access
termux-setup-storage
chmod +x install-termux.sh
bash install-termux.sh
```

**Bot keeps disconnecting**
```bash
# Check connection
ping 8.8.8.8

# Ensure Termux has internet permission
# Settings > Apps > Termux > Permissions > Network
```

### VPS Issues

**"sudo: command not found"**
- You may not have sudo installed
- Log in as root or contact your hosting provider

**"Port already in use"**
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

**Bot won't start**
```bash
# Check logs
npm start  # run directly to see errors

# Check config.json
cat config.json

# Verify Node.js
node --version
npm --version
```

**Systemd service won't start**
```bash
# Check service status
sudo systemctl status wolfbot

# View logs
sudo journalctl -u wolfbot -n 50

# Check service file
sudo cat /etc/systemd/system/wolfbot.service
```

---

## Useful Commands

### Development
```bash
npm run dev              # Run in development mode
npm start                # Run bot
npm test                 # Run tests (if available)
```

### Management
```bash
# View running processes
ps aux | grep node

# Kill bot process
pkill -f "node wolfbot.js"

# Restart bot
systemctl restart wolfbot  # or manually kill and restart
```

### Logs (VPS with Systemd)
```bash
# Real-time logs
sudo journalctl -u wolfbot -f

# Last N lines
sudo journalctl -u wolfbot -n 100

# Since specific time
sudo journalctl -u wolfbot --since "10 minutes ago"

# Export to file
sudo journalctl -u wolfbot > bot.log
```

### Database
```bash
# Backup database
cp Fca_Database/database.db Fca_Database/database.db.bak

# List database files
ls -lah Fca_Database/
```

---

## Performance Tips

### Termux
- Close other apps to free RAM
- Use tmux to prevent disconnections
- Keep phone plugged in while bot runs
- Set screen timeout to "Never" (Settings > Display)

### VPS
- Monitor CPU/memory: `top`, `htop`, `free -h`
- Use systemd for automatic restart
- Set up log rotation to prevent disk fill
- Keep system packages updated: `apt update && apt upgrade`

---

## Support & Issues

- GitHub Issues: https://github.com/ngdgnam/WOLFBOT/issues
- Check existing issues before creating new ones
- Include your OS, Node.js version, and error logs
- Don't share `config.json` with sensitive data

---

## Security Notes

⚠️ **Important:**
- Never commit `config.json` or `cookie.txt` to git
- Use `.gitignore` to protect sensitive files (already configured)
- Change passwords if bot account credentials are exposed
- Keep bot token/credentials private
- Review 3rd party modules before installing

---

# WOLFBOT - Bản tóm tắt các lỗi đã sửa

## 🔧 Các Lỗi Logic Đã Fix

### 1. **index.js** - Sai file được spawn
- **Lỗi**: Spawn file `niio-limit.js` không tồn tại
- **Sửa**: Thay đổi thành `wolfbot.js` (file main)
- **Dòng**: 6

### 2. **includes/listen.js** - Missing import logger
- **Lỗi**: Sử dụng `logger()` nhưng không import module
- **Sửa**: Thêm `const logger = require("../utils/log.js");`
- **Dòng**: 8

### 3. **config.json** - Missing configuration key
- **Lỗi**: `listen.js` kiểm tra `global.config.NOTIFICATION` nhưng key không tồn tại
- **Sửa**: Thêm `"NOTIFICATION": false` vào config.json
- **Dòng**: 43

### 4. **utils/log.js** - Undefined variable 'cra'
- **Lỗi**: Ghi `cra = gradient(...)` nhưng sử dụng `co`, biến undefined
- **Sửa**: Thay `cra = gradient("blue", "pink")` thành `co = gradient("blue", "pink")`
- **Dòng**: 31
- **Thêm**: Thêm error definition

### 5. **wolfbot.js** - Sai logic kiểm tra module
- **Lỗi**: Kiểm tra `commandCategory` khi load events (events không cần attribute này)
- **Sửa**: Tách kiểm tra `commandCategory` chỉ cho commands loại
- **Dòng**: 87-92

### 6. **modules/commands/Game/2048.js** - Typo property name
- **Lỗi**: `ctx.shadowOffstX` và `ctx.shadowOffstY` (typo)
- **Sửa**: Thay đổi thành `ctx.shadowOffsetX` và `ctx.shadowOffsetY`
- **Dòng**: 45-46

### 7. **modules/commands/Game/guess.js** - Missing semicolon & logic flow
- **Lỗi**: Dòng 65 thiếu semicolon sau unsend, không cần gọi unsend nếu messageID không tồn tại
- **Sửa**: Thêm semicolon và sửa logic flow
- **Dòng**: 65, 78

### 8. **modules/commands/Game/loto.js** - Null reference check missing
- **Lỗi**: Case 'start' truy cập `lotoData[threadID]` không kiểm tra tồn tại
- **Sửa**: Thêm kiểm tra `if (!(threadID in lotoData)) return send(getText("noGame"));`
- **Dòng**: 219-220

### 9. **modules/commands/masoi/format/diff2.format.js** - Logic inverted
- **Lỗi**: `if (result != -1)` throw error - logic bị đảo ngược
- **Sửa**: Thay đổi thành `if (result === -1)`
- **Dòng**: 21

### 10. **modules/commands/Game/tod.js** - Structure & scope issues
- **Lỗi**: 
  - Hàm `run` không return promise khi args[0] không tồn tại
  - `this.config.name` không hợp lệ, phải dùng `module.exports.config.name`
  - Structure của handleReply sai (missing break, extra closing brace)
- **Sửa**: Sửa structure, các return statements, break statement
- **Dòng**: 6-59

### 11. **includes/handle/handleData.js** - Promise destructuring mismatch
- **Lỗi**: Promise.all có 3 items nhưng destructure chỉ 2 biến `[threads, users]`
- **Sửa**: Thêm `currencies` vào destructuring
- **Dòng**: 3-4

### 12. **includes/hzi/src/Dev_shareTest3.js** - Debug log cleanup
- **Lỗi**: Có `console.log('11111111111')` - debug log không cần thiết
- **Sửa**: Loại bỏ dòng debug log
- **Dòng**: 19

## ✅ Xác Minh

- ✅ Không có lỗi syntax (checked by ESLint)
- ✅ Tất cả imports đã được xác minh
- ✅ Tất cả config keys đã được thêm
- ✅ Module loading logic đã được sửa
- ✅ Promise handling đã được sửa

## 📝 Ghi chú

- Tất cả các file lỗi đã được sửa
- Cấu trúc project vẫn được bảo toàn
- Không có breaking changes
- Logic flow đã được cải thiện

---

**Ngày cập nhật**: 9 Tháng 12, 2025

**Liên hệ**: https://github.com/ngdgnam/WOLFBOT

