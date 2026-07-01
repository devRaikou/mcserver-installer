# mcserver-installer

English | [Türkçe](README_TR.md)

A professional command-line interface (CLI) tool for automating Minecraft server installation, configuration, and management on Linux systems (optimized for Debian/Ubuntu). 

Designed for administrators who require visual clarity, operational safety, and full control over their server lifecycles.

---

## Developer

Developed by **devRaikou** and released under the MIT License.

---

## Features

- **Automated Java JRE Manager:** Scans the host system for isolated runtime installations (Java 8, 17, 21, 25), identifies requirements based on the chosen Minecraft version, and downloads/configures JREs.
- **Multiple Server Platforms:** Automatically fetches builds and updates for:
  - Production Softwares: Vanilla, Paper, Folia, Purpur, Fabric, Forge, NeoForge
  - Proxy Softwares: Velocity, Waterfall, BungeeCord
- **Real-time Resource Monitor:** Dynamic dashboard showcasing live CPU, RAM (with visual progress bar gauges based on start configuration), and storage footprints.
- **systemd Integration:** Installs and registers systemd unit files to enable automated server boots on host restarts, executing securely under current user sessions.
- **Automated Backup Scheduler:** Integrated cron-scheduler for daily/weekly automated server backups, featuring absolute path validations and headless arguments execution.
- **Discord Webhook Alerts:** Asynchronous, non-blocking notification dispatcher sending detailed embed logs (Server Name, JRE Version, Public/Local IPs, Connection Ports, and GitHub references) to Discord webhooks upon starting, stopping, or backing up servers.
- **Live Properties Editor:** Read, modify, and save configurations inside `server.properties` dynamically from an interactive CLI menu.
- **Background Daemon Execution:** Runs servers detached in independent background GNU `screen` sessions to prevent termination when SSH sessions end.
- **Crash & Stop Guard:** Auto-restart loop with dynamic `.stop_restart` locking checks, allowing servers to restart on crashes but stop cleanly on manual closures.
- **Optimized JVM Flags:** Automatically configures JVM runtime allocations and offers to set Aikar's optimized Garbage Collection flags.

---

## Requirements

The installer runs natively on Debian and Ubuntu distributions. It automatically checks for and installs:
- `curl` (network transfers)
- `jq` (JSON configuration parsing)
- `screen` (background session detachment)
- `tar` & `gzip` (backups creation and extraction)
- Appropriate Java JDK version (automatically chosen and installed if missing)

*A compatibility warning is provided on non-Debian or macOS environments.*

---

## Installation

To download the script and make it executable, execute the following commands on your system:

```bash
# Clone the repository
git clone https://github.com/devRaikou/mcserver-installer.git
cd mcserver-installer

# Make the script executable
chmod +x mcserver-installer

# Run the installer
./mcserver-installer
```

---

## Command Line Arguments

For headless automation, such as crontabs or external automation dashboards, the script supports running operations without interactive prompts:

```bash
# Force backup creation for a specific server headlessly
./mcserver-installer --backup <server_name>
```

---

## Usage

When launched, the script presents an interactive dashboard:

```text
  __  __  _____  _____                                 
 |  \/  |/ ____|/ ____|                                
 | \  / | |    | (___   ___ _ ____   _____ _ __        
 | |\/| | |     \___ \ / _ \ '__\ \ / / _ \ '__|       
 | |  | | |____ ____) |  __/ |   \ V /  __/ |          
 |_|  |_|\_____|_____/ \___|_|    \_/ \___|_|          
  _           _        _   _                           
 (_)         | |      | | | |                          
  _ _ __  ___| |_ __ _| | | | ___ _ __                 
 | | '_ \/ __| __/ _` | | | |/ _ \ '__|                
 | | | | \__ \ || (_| | | | |  __/ |                   
 |_|_| |_|___/\__\__,_|_| |_|\___|_|                   

  Developer: devRaikou | Project: mcserver-installer | Version: 1.26
  ================================================================

  MAIN DIRECTORY MENU
  ================================================================

    1. Install Minecraft Server
    2. Manage Existing Server
    3. Update Server Jar
    4. Backup Server
    5. Restore Backup
    6. Remove Server / Registration
    7. Settings & System checks
    8. About
    9. Exit
  ================================================================
  Select option (1-9):
```

### Server Management Menu

Once you select **Manage Existing Server**, you can access a dedicated operations console:

- **Start Server:** Runs the server in a GNU `screen` session named `mc-[name]-[hash]`.
- **Stop Server:** Gracefully communicates the `stop` command to the screen console and terminates the restart loops.
- **Connect to Console:** Attaches interactive terminal to standard input/output. (Press `Ctrl+A` then `D` to detach safely).
- **Edit server.properties:** Change Port, MOTD, Max Players, GameMode, online mode, etc. in real-time.
- **Change RAM Allocation:** Modifies memory boundaries in the server's `start.sh` configuration.
- **Real-time Resource Monitor:** Live system tracking of resources.
- **Enable/Disable Boot Auto-start:** Toggles systemd auto-reboot configs.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
