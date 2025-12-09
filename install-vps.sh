#!/bin/bash
# install-vps.sh - VPS/Linux-specific installation script

set -e

echo "╔════════════════════════════════════╗"
echo "║   WolfBot - VPS Installer          ║"
echo "╚════════════════════════════════════╝"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  echo "🐧 Detected OS: $OS"
else
  echo "❌ Unable to detect OS"
  exit 1
fi

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Step 1: Update system
echo ""
echo "🔄 Step 1: Updating system packages..."

if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  sudo apt-get update
  sudo apt-get upgrade -y
  sudo apt-get install -y curl wget git build-essential
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
  sudo yum update -y
  sudo yum groupinstall -y "Development Tools"
  sudo yum install -y curl wget git
elif [ "$OS" = "arch" ]; then
  sudo pacman -Syu --noconfirm
  sudo pacman -S --noconfirm base-devel curl wget git
fi

# Step 2: Install Node.js
echo ""
echo "📦 Step 2: Installing Node.js..."

if ! command_exists node; then
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
  elif [ "$OS" = "arch" ]; then
    sudo pacman -S --noconfirm nodejs npm
  fi
  echo "✅ Node.js installed"
else
  echo "✅ Node.js already installed: $(node --version)"
fi

# Step 3: Clone repository
echo ""
echo "📥 Step 3: Setting up WolfBot..."

if [ ! -d "wolfbot" ]; then
  git clone https://github.com/ngdgnam/WOLFBOT.git wolfbot
fi

cd wolfbot || exit 1

# Step 4: Install dependencies
echo ""
echo "📚 Step 4: Installing Node.js dependencies..."
npm install

# Step 5: Create directories
echo ""
echo "🗂️  Step 5: Creating data directories..."
mkdir -p utils/data
mkdir -p modules/data
mkdir -p modules/commands/cache
mkdir -p logs

# Step 6: Setup config
echo ""
echo "⚙️  Step 6: Creating configuration files..."

if [ ! -f config.json ]; then
  cat > config.json << 'EOF'
{
  "FCAOption": {
    "forceLogin": true,
    "listenEvents": true,
    "updatePresence": true,
    "listenTyping": true,
    "selfListen": false,
    "selfListenEvent": true,
    "autoMarkDelivery": false,
    "autoReconnect": true,
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15"
  },
  "language": "vi",
  "DeveloperMode": false,
  "autoCreateDB": true,
  "MAINTENANCE": false,
  "allowInbox": false,
  "PREFIX": ".",
  "BOTNAME": "WolfBot",
  "FACEBOOK_ADMIN": "your_admin_id",
  "ADMINBOT": [],
  "NDH": [],
  "BOXADMIN": [],
  "version": "3.0.0"
}
EOF
  echo "⚠️  Created config.json - Please edit with your settings"
fi

# Step 7: Create systemd service (optional)
echo ""
echo "🔧 Step 7: Creating systemd service (optional)..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cat > wolfbot.service << EOF
[Unit]
Description=WolfBot Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "📋 Service file created: wolfbot.service"
echo "To install: sudo cp wolfbot.service /etc/systemd/system/ && sudo systemctl daemon-reload"

# Final instructions
echo ""
echo "╔════════════════════════════════════╗"
echo "║    ✅ Setup Complete!               ║"
echo "╚════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo "  1. Edit config.json:"
echo "     nano config.json"
echo "  2. Add your Facebook cookie/appState"
echo "  3. Start the bot"
echo ""
echo "🚀 Run the bot:"
echo ""
echo "   Option 1 - Direct:"
echo "     npm start"
echo ""
echo "   Option 2 - Using screen:"
echo "     screen -S wolfbot -d -m npm start"
echo "     screen -r wolfbot  # to view logs"
echo ""
echo "   Option 3 - Using tmux:"
echo "     tmux new-session -d -s wolfbot 'npm start'"
echo "     tmux attach-session -t wolfbot  # to view logs"
echo ""
echo "   Option 4 - Using systemd (recommended):"
echo "     sudo cp wolfbot.service /etc/systemd/system/"
echo "     sudo systemctl daemon-reload"
echo "     sudo systemctl enable wolfbot"
echo "     sudo systemctl start wolfbot"
echo "     sudo systemctl status wolfbot  # check status"
echo ""
echo "📖 Useful commands:"
echo "   npm run dev        # development mode"
echo "   npm stop           # stop the bot"
echo "   journalctl -u wolfbot -f  # view logs (if using systemd)"
echo ""
