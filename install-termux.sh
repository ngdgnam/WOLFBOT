#!/bin/bash
# install-termux.sh - Termux-specific installation script

echo "╔════════════════════════════════════╗"
echo "║   WolfBot - Termux Installer       ║"
echo "╚════════════════════════════════════╝"
echo ""

# Check if running in Termux
if [ ! -d "$PREFIX" ]; then
  echo "❌ This script should be run in Termux"
  exit 1
fi

echo "📱 Detected Termux environment"
echo ""

# Step 1: Update packages
echo "📦 Step 1: Updating Termux packages..."
apt update
apt upgrade -y

# Step 2: Install required packages
echo "📥 Step 2: Installing required packages..."
apt install -y \
  nodejs \
  git \
  curl \
  wget \
  openssh \
  python

# Step 3: Setup storage access
echo "💾 Step 3: Setting up storage access..."
if [ ! -d "$HOME/storage" ]; then
  echo "Run this command when prompted:"
  echo "  termux-setup-storage"
  termux-setup-storage
else
  echo "✅ Storage already configured"
fi

# Step 4: Clone or setup repo
echo "📂 Step 4: Setting up WolfBot directory..."
cd "$HOME" || exit 1

if [ ! -d "wolfbot" ]; then
  git clone https://github.com/ngdgnam/WOLFBOT.git wolfbot
  cd wolfbot || exit 1
else
  cd wolfbot || exit 1
  git pull origin main
fi

# Step 5: Install npm dependencies
echo "📚 Step 5: Installing Node.js dependencies..."
npm install --no-optional

# Step 6: Create necessary directories
echo "🗂️  Step 6: Creating data directories..."
mkdir -p utils/data
mkdir -p modules/data
mkdir -p modules/commands/cache
mkdir -p logs

# Step 7: Setup config
echo "⚙️  Step 7: Creating configuration files..."

if [ ! -f config.json ]; then
  cp config.json.example config.json 2>/dev/null || cat > config.json << 'EOF'
{
  "FCAOption": {
    "forceLogin": true,
    "listenEvents": true
  },
  "language": "vi",
  "PREFIX": ".",
  "BOTNAME": "WolfBot",
  "FACEBOOK_ADMIN": "",
  "ADMINBOT": [],
  "version": "3.0.0"
}
EOF
  echo "⚠️  Created config.json - Please edit with your settings"
fi

# Step 8: Final instructions
echo ""
echo "╔════════════════════════════════════╗"
echo "║    ✅ Setup Complete!               ║"
echo "╚════════════════════════════════════╝"
echo ""
echo "📝 Next steps:"
echo "  1. Edit config.json with your settings"
echo "  2. Add cookie.txt or fbstate.json"
echo "  3. Run: npm start"
echo ""
echo "🚀 Start the bot:"
echo "  npm start"
echo ""
echo "💡 Tips:"
echo "  - Keep terminal open or use tmux/screen"
echo "  - Enable 'Termux:Boot' to auto-start on device boot"
echo "  - Check logs in the 'logs' directory"
echo ""
