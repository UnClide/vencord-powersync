# PowerSync for Vencord

> Don't want to download third-party apps just to automatically switch power plans while gaming? This Vencord plugin does it for you — fully automatic, zero manual configuration.

[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://img.shields.io/badge/platform-Windows-blue)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📌 Overview

**PowerSync** is a Vencord plugin that automatically switches your Windows power plan when you launch a game and restores it when you close the game.

It leverages Discord's own game detection database — the same one that powers your "Playing..." status — so any game Discord recognizes is automatically supported. No manual setup, no list to maintain.

- ⚡ Switches to High Performance (or any plan you choose) when a game starts
- 💤 Restores your previous plan when the game closes
- 🎮 Uses Discord's built-in game database — thousands of games supported out of the box
- 🔋 Optional: skip switching when running on battery (laptops)
- 🚫 Blacklist specific processes you don't want to trigger the switch

---

## 🖥 Requirements

- Windows 10 or Windows 11
- Vencord installed **from source** (locally built)
- `pnpm` installed

> Installer builds of Vencord are not supported.

---

## 📦 Installation

### 1️⃣ Navigate to your Vencord source directory
```
cd path/to/Vencord/src
```

### 2️⃣ Create `userplugins` folder (if missing)
```
mkdir -p userplugins
```

### 3️⃣ Clone this repository
```
cd userplugins
git clone https://github.com/UnClide/vencord-powersync powerSync
```

### 4️⃣ Build Vencord
```
cd ../..
pnpm build
```

### 5️⃣ Restart Vencord

Press `Ctrl + R` or use **Vencord → Restart Client**

---

## ⚙️ Usage

1. Open **User Settings**
2. Navigate to **Vencord → Plugins**
3. Find **PowerSync** and enable it
4. Configure your preferred power plan in plugin settings
5. Launch any game — the plan switches automatically

---

## 🔧 Settings

| Setting | Description |
|---|---|
| Power Plan | Which plan to activate when a game is detected |
| Custom GUID | Your own plan GUID if using the Custom option |
| Blacklist | Comma-separated processes to ignore (e.g. `spotify.exe, code.exe`) |
| Only on AC Power | Skip switching when running on battery |
| Restore Previous | Restore your original plan when the game closes |

---

## 🛠 How It Works

PowerSync subscribes to Discord's internal `RUNNING_GAMES_CHANGE` event, which fires whenever Discord detects a game starting or stopping. When a valid game is detected, it calls `powercfg /setactive` via Node.js to switch the active Windows power scheme. No background services, no scheduled tasks, no telemetry.

---

## 🤝 Pairs Well With

**[GPU Binder](https://github.com/UnClide/vencord-gpubinder)** — another Vencord plugin by the same author that forces Discord to use a specific GPU and keeps the setting after updates. Together, PowerSync and GPU Binder give you full hardware control directly from Discord with zero third-party software.

---

## ❗ Important Notes

- ✅ Windows only
- ❌ Not compatible with non-source Vencord installs  
- ℹ️ `powercfg /setactive` does not require administrator rights

---

## 🛡 License

MIT — see [LICENSE](LICENSE) for details.

---
