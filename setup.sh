#!/bin/bash
# setup.sh - Universal setup script for WolfBot (Termux & VPS)
# Usage: bash setup.sh [termux|vps|auto]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform
PLATFORM="${1:-auto}"
if [ "$PLATFORM" = "auto" ]; then
  if [ -d "$PREFIX" ] && [ -f "$PREFIX/bin/bash" ]; then
    PLATFORM="termux"
  else
    PLATFORM="vps"
  fi
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}WolfBot Setup Script${NC}"
echo -e "${BLUE}Platform: $PLATFORM${NC}"
echo -e "${BLUE}================================${NC}\n"

# Termux setup
if [ "$PLATFORM" = "termux" ]; then
  echo -e "${YELLOW}Setting up for Termux...${NC}"
  
  # Update packages
  echo -e "${BLUE}[1/5] Updating packages...${NC}"
  apt update && apt upgrade -y
  
  # Install dependencies
  echo -e "${BLUE}[2/5] Installing dependencies...${NC}"
  apt install -y nodejs git curl wget openssh
  
  # Set storage access (if not already done)
  if [ ! -d "$HOME/storage" ]; then
    echo -e "${YELLOW}Granting storage access...${NC}"
    termux-setup-storage
  fi
  
  # Create proper directories
  echo -e "${BLUE}[3/5] Setting up directories...${NC}"
  mkdir -p "$HOME/wolfbot"
  cd "$HOME/wolfbot" || exit 1
  
# VPS setup
elif [ "$PLATFORM" = "vps" ]; then
  echo -e "${YELLOW}Setting up for VPS/Linux...${NC}"
  
  # Detect OS
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
  fi
  
  # Update packages
  echo -e "${BLUE}[1/5] Updating packages...${NC}"
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update && sudo apt-get upgrade -y
    sudo apt-get install -y curl wget git
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
      echo -e "${BLUE}Installing Node.js...${NC}"
      curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
      sudo apt-get install -y nodejs
    fi
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
    sudo yum install -y curl wget git nodejs
  fi
  
  # Create proper directories
  echo -e "${BLUE}[2/5] Setting up directories...${NC}"
  mkdir -p ~/wolfbot
  cd ~/wolfbot || exit 1
fi

# Common setup for both
echo -e "${BLUE}[4/5] Installing Node.js dependencies...${NC}"
npm install

# Create config template if not exists
if [ ! -f config.json ]; then
  echo -e "${YELLOW}Creating config.json template...${NC}"
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
  "FACEBOOK_ADMIN": "your_admin_id_here",
  "ADMINBOT": ["your_bot_admin_id"],
  "NDH": [],
  "BOXADMIN": [],
  "version": "3.0.0"
}
EOF
  echo -e "${YELLOW}⚠️  Created config.json template. Please edit it with your settings.${NC}"
fi

# Create .env template if not exists
if [ ! -f .env.example ]; then
  echo -e "${YELLOW}Creating .env.example template...${NC}"
  cat > .env.example << 'EOF'
# Facebook Login (for account-based login if not using appState)
FACEBOOK_EMAIL=your_email@gmail.com
FACEBOOK_PASSWORD=your_password

# Optional: API Keys
YOUTUBE_API=your_youtube_api_key
MINE_API=your_mine_api_key

# Bot Settings
LOG_LEVEL=info
ENVIRONMENT=production
EOF
fi

echo -e "${BLUE}[5/5] Finalizing setup...${NC}"

# Create necessary directories
mkdir -p utils/data modules/data modules/commands/cache logs

# Display next steps
echo -e "\n${GREEN}✅ Setup completed successfully!${NC}\n"
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Edit ${YELLOW}config.json${NC} with your settings:"
echo -e "     - Add your FACEBOOK_ADMIN ID"
echo -e "     - Add bot admin IDs to ADMINBOT array"
echo -e ""
echo -e "  2. Create ${YELLOW}cookie.txt${NC} or ${YELLOW}utils/data/fbstate.json${NC}"
echo -e "     (from your Facebook login session)"
echo -e ""
echo -e "  3. Start the bot:"
if [ "$PLATFORM" = "termux" ]; then
  echo -e "     ${YELLOW}npm start${NC}"
else
  echo -e "     ${YELLOW}npm start${NC} or use screen/tmux for background"
fi
echo -e ""
echo -e "${BLUE}For VPS (background execution):${NC}"
echo -e "  ${YELLOW}screen -S wolfbot -d -m npm start${NC}"
echo -e "  ${YELLOW}tmux new-session -d -s wolfbot 'npm start'${NC}"
echo -e ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "  - Check SETUP.md for detailed instructions"
echo -e "  - GitHub: https://github.com/ngdgnam/WOLFBOT"
echo -e ""
