# mcserver-installer

A modern, robust, and premium Shell (Bash) command-line interface (CLI) application designed to automate the installation, configuration, and lifecycle management of Minecraft servers on Linux systems (optimized for Ubuntu and Debian).

Created with visual excellence and operational safety in mind, it provides a full suite of management tools to run servers professionally.

---

## Developer

Developed by **devRaikou** and released under the MIT License.

---

## Features

- ⚡ **Automated Java OpenJDK Management:** Detects active Java environments, identifies requirements based on Minecraft version (e.g. Java 17, Java 21), and installs them via `apt`.
- 🌀 **Multiple Server Softwares:** Automated installation and updating for:
  - **Releases:** Vanilla, Paper, Folia, Purpur, Fabric, Forge, NeoForge
  - **Proxies:** Velocity, Waterfall, BungeeCord
- ⚙ **Properties Editor:** Read, modify, and save configurations inside `server.properties` dynamically from an interactive CLI menu.
- 💾 **Integrated Backup System:** Fast tarball compression (`tar.gz`) excluding logs and recursive archives. View and restore backups with a single key press.
- ⏳ **Background Daemon Execution:** Runs servers detached in independent background GNU `screen` sessions to prevent termination when SSH sessions end. Easily attach/detach from the game console.
- 🛡 **Crash & Stop Guard:** Auto-restart loop with dynamic `.stop_restart` locking checks, allowing servers to restart on crashes but stop cleanly on manual closures.
- ⚡ **Optimized JVM Flags:** Automatically configures JVM runtime allocations and offers to set Aikar's optimized Garbage Collection flags.
- 🌀 **Modern Terminal User Interface:** Employs vibrant color styling, Unicode status indicators, custom loading spinners, and visual download progress bars.

---

## Requirements

The installer runs natively on Debian and Ubuntu distributions. It automatically checks for and installs:
- `curl` (network transfers)
- `jq` (JSON configuration parsing)
- `screen` (background session detachment)
- `tar` & `gzip` (backups creation and extraction)
- Appropriate Java JDK version (automatically chosen and installed if missing)

*A warning is provided on non-Debian or macOS environments to allow compatibility runs.*

---

## Installation

To download the script and make it executable, execute the following commands on your system:

```bash
# Clone the repository (or copy the script)
git clone https://github.com/devRaikou/mcserver-installer.git
cd mcserver-installer

# Make the script executable
chmod +x mcserver-installer

# Run the installer
./mcserver-installer
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
                                                       
 Developer: devRaikou | Project: mcserver-installer | Version: 1.1
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

---

## Examples

### 1. Creating a Paper 1.21.4 Server
1. Select Option `1` (Install Minecraft Server).
2. Choose `Paper` as server software.
3. Select version `1.21.4` (the API dynamically lists available builds).
4. Specify target path (e.g. `/home/user/my_server`).
5. Choose RAM limits (e.g., Min `2G` / Max `4G`).
6. Set custom port, MOTD, and default survival gamemode.
7. Accept Mojang's EULA and choose Aikar's GC flags.
8. The installer downloads the files, sets up properties, and generates the `start.sh` script.

### 2. Attaching to Console
1. Select Option `2` (Manage Existing Server).
2. Choose your server from the status list.
3. Choose Option `4` (Connect to Console).
4. Enter commands directly. Detach by typing `Ctrl+A` followed by `D`.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
