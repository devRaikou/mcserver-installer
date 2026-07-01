const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const REGISTRY_FILE = path.join(os.homedir(), '.mcserver-installer', 'registry.txt');

// Helper to resolve screen session name
function getSessionName(serverPath) {
  const hash = crypto.createHash('md5').update(serverPath).digest('hex').substring(0, 8);
  const base = path.basename(serverPath).replace(/[^a-zA-Z0-9_-]/g, '');
  return `mc-${base}-${hash}`;
}

// Check if a screen session is running
function isServerRunning(sessionName) {
  return new Promise((resolve) => {
    exec(`screen -list | grep -q "\\.${sessionName}"`, (error) => {
      resolve(!error);
    });
  });
}

// Get all servers from the registry
function getRegisteredServers() {
  if (!fs.existsSync(REGISTRY_FILE)) return [];
  const content = fs.readFileSync(REGISTRY_FILE, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim() && line.includes(':'))
    .map(line => {
      const [name, serverPath, type, version] = line.split(':');
      return { name, path: serverPath, type, version, sessionName: getSessionName(serverPath) };
    });
}

// 1. Get System Status (CPU, RAM, Disk)
app.get('/api/status', (req, res) => {
  const stats = {
    cpu: 0,
    ram: { used: 0, total: 0, percentage: 0 },
    disk: { used: 0, total: 0, percentage: 0 }
  };

  const isMac = os.platform() === 'darwin';

  const ramPromise = new Promise((resolve) => {
    if (isMac) {
      exec("sysctl hw.memsize | awk '{print $2}'", (err, stdout) => {
        const totalBytes = parseInt(stdout) || 0;
        const totalGB = Math.round(totalBytes / (1024 * 1024 * 1024));
        exec("vm_stat | grep 'Pages free' | awk '{print $3}'", (err2, stdout2) => {
          const freePages = parseInt(stdout2) || 0;
          const freeBytes = freePages * 4096;
          const usedBytes = totalBytes - freeBytes;
          const usedGB = Math.round(usedBytes / (1024 * 1024 * 1024));
          stats.ram = {
            used: usedGB,
            total: totalGB,
            percentage: Math.round((usedBytes / totalBytes) * 100) || 0
          };
          resolve();
        });
      });
    } else {
      exec("free -m | awk '/^Mem:/{print $3, $2}'", (err, stdout) => {
        const [used, total] = stdout.trim().split(/\s+/).map(Number);
        if (used && total) {
          stats.ram = {
            used: Math.round(used / 1024),
            total: Math.round(total / 1024),
            percentage: Math.round((used / total) * 100)
          };
        }
        resolve();
      });
    }
  });

  const cpuPromise = new Promise((resolve) => {
    if (isMac) {
      exec("ps -A -o %cpu | awk '{s+=$1} END {print s}'", (err, stdout) => {
        const usage = parseFloat(stdout.trim()) || 0;
        const cores = os.cpus().length || 1;
        stats.cpu = Math.round(usage / cores);
        resolve();
      });
    } else {
      exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'", (err, stdout) => {
        stats.cpu = Math.round(parseFloat(stdout.trim())) || 0;
        resolve();
      });
    }
  });

  const diskPromise = new Promise((resolve) => {
    exec("df -h . | tail -1 | awk '{print $3, $2, $5}'", (err, stdout) => {
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 3) {
        stats.disk = {
          used: parts[0],
          total: parts[1],
          percentage: parseInt(parts[2].replace('%', '')) || 0
        };
      }
      resolve();
    });
  });

  Promise.all([ramPromise, cpuPromise, diskPromise]).then(() => {
    res.json(stats);
  });
});

// 2. Get All Servers
app.get('/api/servers', async (req, res) => {
  try {
    const servers = getRegisteredServers();
    const result = await Promise.all(servers.map(async (srv) => {
      const running = await isServerRunning(srv.sessionName);
      // Fetch server port from server.properties if available
      let port = '25565';
      const propPath = path.join(srv.path, 'server.properties');
      if (fs.existsSync(propPath)) {
        const props = fs.readFileSync(propPath, 'utf8');
        const portMatch = props.match(/^server-port=(\d+)/m);
        if (portMatch) port = portMatch[1];
      }
      return {
        name: srv.name,
        path: srv.path,
        type: srv.type,
        version: srv.version,
        running,
        port
      };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Start Server
app.post('/api/servers/:name/start', async (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const running = await isServerRunning(srv.sessionName);
  if (running) return res.status(400).json({ error: 'Server already running' });

  const startScript = path.join(srv.path, 'start.sh');
  if (!fs.existsSync(startScript)) return res.status(400).json({ error: 'start.sh not found' });

  exec(`screen -dmS "${srv.sessionName}" bash -c "cd '${srv.path}' && ./start.sh"`, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Server starting...' });
  });
});

// 4. Stop Server
app.post('/api/servers/:name/stop', async (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const running = await isServerRunning(srv.sessionName);
  if (!running) return res.status(400).json({ error: 'Server is not running' });

  exec(`screen -S "${srv.sessionName}" -p 0 -X stuff "stop$(printf \\\\r)"`, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: 'Stop command sent' });
  });
});

// 5. Restart Server
app.post('/api/servers/:name/restart', async (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const running = await isServerRunning(srv.sessionName);
  if (running) {
    exec(`screen -S "${srv.sessionName}" -p 0 -X stuff "stop$(printf \\\\r)"`, () => {
      // Wait for shutdown, then restart
      let checkCount = 0;
      const interval = setInterval(async () => {
        const isStillRunning = await isServerRunning(srv.sessionName);
        checkCount++;
        if (!isStillRunning || checkCount > 15) {
          clearInterval(interval);
          exec(`screen -dmS "${srv.sessionName}" bash -c "cd '${srv.path}' && ./start.sh"`, (error) => {
            if (error) return res.status(500).json({ error: error.message });
            res.json({ success: true, message: 'Server restarted successfully' });
          });
        }
      }, 2000);
    });
  } else {
    exec(`screen -dmS "${srv.sessionName}" bash -c "cd '${srv.path}' && ./start.sh"`, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, message: 'Server started successfully' });
    });
  }
});

// 6. Console log stream (SSE)
app.get('/api/servers/:name/console', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) {
    res.write(`data: ${JSON.stringify({ error: 'Server not found' })}\n\n`);
    return res.end();
  }

  const logFile = path.join(srv.path, 'logs', 'latest.log');
  if (!fs.existsSync(logFile)) {
    // If directory doesn't exist, create it to prevent tail failure
    fs.mkdirSync(path.join(srv.path, 'logs'), { recursive: true });
    fs.writeFileSync(logFile, '');
  }

  const tail = spawn('tail', ['-n', '150', '-f', logFile]);

  tail.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim() !== '') {
        res.write(`data: ${JSON.stringify({ line })}\n\n`);
      }
    });
  });

  req.on('close', () => {
    tail.kill();
  });
});

// 7. Send Command to Console
app.post('/api/servers/:name/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command missing' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const running = await isServerRunning(srv.sessionName);
  if (!running) return res.status(400).json({ error: 'Server is not running' });

  // Escape special chars for screen
  const escapedCmd = command.replace(/'/g, "'\\''");
  exec(`screen -S "${srv.sessionName}" -p 0 -X stuff "${escapedCmd}$(printf \\\\r)"`, (error) => {
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
});

// 8. Get properties
app.get('/api/servers/:name/properties', (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const propPath = path.join(srv.path, 'server.properties');
  if (!fs.existsSync(propPath)) return res.status(404).json({ error: 'server.properties not found' });

  const props = fs.readFileSync(propPath, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key, ...valParts] = line.split('=');
      return { key, value: valParts.join('=') };
    });

  res.json(props);
});

// 9. Update properties
app.put('/api/servers/:name/properties', (req, res) => {
  const { properties } = req.body; // Array of {key, value}
  if (!properties || !Array.isArray(properties)) return res.status(400).json({ error: 'Invalid properties array' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const propPath = path.join(srv.path, 'server.properties');
  if (!fs.existsSync(propPath)) return res.status(404).json({ error: 'server.properties not found' });

  let content = '';
  properties.forEach(prop => {
    content += `${prop.key}=${prop.value}\n`;
  });

  fs.writeFileSync(propPath, content, 'utf8');
  res.json({ success: true });
});

// 10. List backups
app.get('/api/servers/:name/backups', (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const backupDir = path.join(srv.path, 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);

  const backups = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.tar.gz'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      return {
        filename: file,
        size: Math.round((stat.size / (1024 * 1024)) * 100) / 100 + ' MB',
        date: stat.mtime
      };
    });

  res.json(backups);
});

// 11. Download backup
app.get('/api/servers/:name/backups/:file', (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const backupPath = path.join(srv.path, 'backups', req.params.file);
  if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup not found' });

  res.download(backupPath);
});

// 12. Create backup
app.post('/api/servers/:name/backup', (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  // Execute backup in background using headless mcserver-installer command
  // Points to the main script which is executable and accessible
  const mainScript = path.resolve(__dirname, '..', 'mcserver-installer');
  exec(`"${mainScript}" --backup "${srv.name}"`, (error) => {
    if (error) console.error(`Backup execution failed: ${error.message}`);
  });

  res.json({ success: true, message: 'Backup job triggered in background' });
});

app.listen(PORT, () => {
  console.log(`mcserver-installer Dashboard server listening on port ${PORT}`);
});
