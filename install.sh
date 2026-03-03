#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
#  vks-configurator installer
#  Installs Bun runtime + dependencies, works on macOS & Linux
# ──────────────────────────────────────────────────────────

REPO="https://github.com/Ares-main/vks-configurator.git"
INSTALL_DIR="${VKS_INSTALL_DIR:-$HOME/.vks-configurator}"
BIN_LINK="/usr/local/bin/vks-configurator"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Detect OS ─────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)  echo "linux" ;;
    *)      echo "unknown" ;;
  esac
}

OS=$(detect_os)
info "Detected OS: $OS"

if [ "$OS" = "unknown" ]; then
  fail "Unsupported operating system. Only macOS and Linux are supported."
fi

# ── Install Bun if missing ────────────────────────────────
if command -v bun &>/dev/null; then
  ok "Bun already installed: $(bun --version)"
else
  info "Installing Bun runtime..."
  curl -fsSL https://bun.sh/install | bash

  # Source bun into current session
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if command -v bun &>/dev/null; then
    ok "Bun installed: $(bun --version)"
  else
    fail "Bun installation failed. Please install manually: https://bun.sh"
  fi
fi

# ── Ensure PATH has bun ───────────────────────────────────
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# ── Clone or update repo ─────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing installation..."
  git -C "$INSTALL_DIR" pull --ff-only || warn "Could not pull latest, using existing version"
else
  if [ -d "$INSTALL_DIR" ]; then
    warn "Removing existing non-git directory at $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
  fi
  info "Cloning vks-configurator..."
  git clone "$REPO" "$INSTALL_DIR"
fi

# ── Install dependencies ─────────────────────────────────
info "Installing dependencies..."
cd "$INSTALL_DIR"
bun install
ok "Dependencies installed"

# ── Create launcher script ────────────────────────────────
LAUNCHER="$INSTALL_DIR/vks-configurator"
cat > "$LAUNCHER" << 'LAUNCHER_EOF'
#!/usr/bin/env bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bun run "$SCRIPT_DIR/src/index.tsx" "$@"
LAUNCHER_EOF
chmod +x "$LAUNCHER"

# ── Symlink to PATH ──────────────────────────────────────
if [ -w "$(dirname "$BIN_LINK")" ] 2>/dev/null; then
  ln -sf "$LAUNCHER" "$BIN_LINK"
  ok "Linked: $BIN_LINK → $LAUNCHER"
else
  info "Creating symlink requires elevated permissions..."
  sudo ln -sf "$LAUNCHER" "$BIN_LINK"
  ok "Linked: $BIN_LINK → $LAUNCHER"
fi

# ── Ensure bun is in shell RC ─────────────────────────────
add_to_rc() {
  local rc="$1"
  if [ -f "$rc" ] && ! grep -q 'BUN_INSTALL' "$rc"; then
    echo '' >> "$rc"
    echo '# bun' >> "$rc"
    echo 'export BUN_INSTALL="$HOME/.bun"' >> "$rc"
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$rc"
    info "Added bun to $rc"
  fi
}

if [ "$OS" = "macos" ]; then
  add_to_rc "$HOME/.zshrc"
  add_to_rc "$HOME/.bash_profile"
else
  add_to_rc "$HOME/.bashrc"
  add_to_rc "$HOME/.bash_profile"
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  vks-configurator installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Run:  ${CYAN}vks-configurator${NC}"
echo -e "  Or:   ${CYAN}cd $INSTALL_DIR && bun run start${NC}"
echo ""
echo -e "  ${YELLOW}Open a new terminal if the command is not found.${NC}"
echo ""
