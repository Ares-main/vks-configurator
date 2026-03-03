# vks-configurator

A terminal UI tool that automates the setup and configuration required to work with **vSphere VKS** (Kubernetes on vSphere) environments. It handles Harbor registry configuration, tool installation, certificate management, and cluster connectivity — so you can go from zero to `kubectl` in minutes.

![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Tool Detection & Install** — checks for `kubectl`, `docker`, `helm`, and VCF/vSphere CLI plugins; offers install guidance per platform
- **Harbor Registry Setup** — fetches and installs TLS certificates, configures Docker trust, logs into Harbor, lists projects, and creates Kubernetes pull secrets
- **VKS / Supervisor Connection** — connects to vSphere Supervisor clusters via the VCF CLI (`vcf context create`) or the legacy `kubectl vsphere login` flow
- **Cluster Info Dashboard** — displays nodes, namespaces, pods, and resource usage at a glance
- **Cross-platform** — works on macOS (Homebrew) and Linux (apt, pacman)

## Requirements

| Dependency | Notes |
|------------|-------|
| **macOS 12+** or **Linux** (Debian/Ubuntu, Arch) | Windows WSL2 should work but is untested |
| **Git** | To clone the repo |
| **Bun ≥ 1.0** | Installed automatically by the install script |
| **Docker** | Required for Harbor registry operations |
| **kubectl** | Required for cluster operations |

> `helm` and the VCF CLI / `kubectl-vsphere` plugin are optional but recommended. The tool will detect and guide installation.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/Ares-main/vks-configurator/master/install.sh | bash
```

Or clone manually:

```bash
git clone https://github.com/Ares-main/vks-configurator.git
cd vks-configurator
bun install
bun run start
```

The install script will:
1. Detect your OS (macOS or Linux)
2. Install Bun if not already present
3. Clone the repository to `~/.vks-configurator`
4. Install dependencies
5. Create a `vks-configurator` command in your PATH

## Usage

```bash
# If installed via install.sh
vks-configurator

# If cloned manually
bun run start
```

Navigate the TUI with arrow keys and Enter. The main menu provides:

1. **Check & Install Tools** — scans for required CLI tools and helps install missing ones
2. **Connect to VKS / Supervisor** — authenticate to a vSphere environment by IP/hostname
3. **Setup Harbor Registry** — full Harbor certificate + Docker configuration pipeline
4. **Cluster Info** — live dashboard of your connected cluster

## Uninstall

```bash
rm -rf ~/.vks-configurator
sudo rm -f /usr/local/bin/vks-configurator
```

## Development

```bash
git clone https://github.com/Ares-main/vks-configurator.git
cd vks-configurator
bun install
bun run start      # Launch the TUI
bun run typecheck   # Type-check with tsc
```

### Project Structure

```
src/
├── index.tsx              # Entry point
├── app.tsx                # Screen router
├── components/
│   ├── theme.tsx          # Tokyo Night design system
│   ├── Header.tsx         # App header
│   ├── MainMenu.tsx       # Main menu screen
│   └── StatusBar.tsx      # Bottom status bar
├── screens/
│   ├── ToolCheckScreen.tsx
│   ├── ConnectScreen.tsx
│   ├── HarborSetupScreen.tsx
│   └── ClusterInfoScreen.tsx
└── lib/
    ├── shell.ts           # Shell command helpers
    ├── state.ts           # Global app state
    ├── platform.ts        # OS / platform detection
    ├── tools.ts           # Tool detection & install
    ├── certs.ts           # Certificate management
    ├── connection.ts      # VKS / Supervisor login
    └── harbor.ts          # Harbor registry operations
```

## License

MIT
