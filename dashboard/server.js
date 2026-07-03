const express = require('express');
const net = require('net');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const REGISTRY_FILE = path.join(os.homedir(), '.mcserver-installer', 'registry.txt');

// Track currently installing servers
const activeInstalls = [];

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true); // Ignore other errors, assume free
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

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
      let port = '25565';
      const propPath = path.join(serverPath, 'server.properties');
      if (fs.existsSync(propPath)) {
        const props = fs.readFileSync(propPath, 'utf8');
        const portMatch = props.match(/^server-port=(\d+)/m);
        if (portMatch) port = portMatch[1];
      }
      return { name, path: serverPath, type, version, sessionName: getSessionName(serverPath), port };
    });
}

const configDir = process.env.CONFIG_DIR || path.join(os.homedir(), '.mcserver-installer');
const usersPath = path.join(configDir, '.users.json');

function getUsers() {
  if (fs.existsSync(usersPath)) {
    try {
      return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Authentication Middleware
function requireAuth(req, res, next) {
  if (req.path === '/login' || req.path === '/api/login') {
    return next();
  }

  let token = '';
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.replace('Bearer ', '').trim();
  } else if (req.query.token) {
    token = req.query.token.toString().trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const users = getUsers();
  const user = users.find(u => u.pin === token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

app.use('/api', requireAuth);

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

// --- USER MANAGEMENT API ---
app.get('/api/users', requireAdmin, (req, res) => {
  res.json(getUsers().map(u => ({ username: u.username, role: u.role })));
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) return res.status(400).json({ error: 'Missing username or role' });
  
  const users = getUsers();
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' });
  
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  users.push({ username, pin, role });
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  res.json({ success: true, pin });
});

app.delete('/api/users/:username', requireAdmin, (req, res) => {
  const username = req.params.username;
  if (username === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  
  let users = getUsers();
  users = users.filter(u => u.username !== username);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// --- API ROUTES ---
// 1. Get all servers
app.get('/api/servers', async (req, res) => {
  try {
    const servers = getRegisteredServers();
    const result = await Promise.all(servers.map(async (srv) => {
      const running = await isServerRunning(srv.sessionName);
      return {
        name: srv.name,
        path: srv.path,
        type: srv.type,
        version: srv.version,
        running,
        port: srv.port
      };
    }));
    // Append actively installing servers to the result
    res.json([...result, ...activeInstalls]);
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
  res.setHeader('X-Accel-Buffering', 'no');
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
        if (res.flush) res.flush();
      }
    });
  });

  req.on('close', () => {
    tail.kill();
  });
});

// 7. Send Command to Console
app.post('/api/servers/:name/command', async (req, res) => {
  let { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command missing' });
  
  command = command.trim();
  if (command.startsWith('/')) {
    command = command.substring(1);
  }

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
app.put('/api/servers/:name/properties', requireAdmin, (req, res) => {
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
app.get('/api/servers/:name/backups', requireAdmin, (req, res) => {
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
app.get('/api/servers/:name/backups/:file', requireAdmin, (req, res) => {
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === req.params.name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const backupPath = path.join(srv.path, 'backups', req.params.file);
  if (!fs.existsSync(backupPath)) return res.status(404).json({ error: 'Backup not found' });

  res.download(backupPath);
});

// 12. Create backup
app.post('/api/servers/:name/backup', requireAdmin, (req, res) => {
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

app.post('/api/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN code is required' });
  }
  
  const users = getUsers();
  const user = users.find(u => u.pin === pin.toString().trim());
  
  if (user) {
    return res.json({ success: true, token: user.pin, role: user.role, username: user.username });
  }
  return res.status(401).json({ error: 'Invalid PIN code' });
});

app.get('/api/software-versions', (req, res) => {
  const { type } = req.query;
  if (!type) return res.status(400).json({ error: 'Type is required' });
  
  const mainScript = path.resolve(__dirname, '..', 'mcserver-installer');
  exec(`"${mainScript}" --get-versions "${type}"`, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[software-versions] Error fetching ${type}: ${error.message}`);
      if (stderr) console.error(`[software-versions] stderr: ${stderr}`);
      return res.status(500).json({ error: `Failed to fetch versions: ${stderr || error.message}` });
    }
    const versions = stdout
      .split('\n')
      .map(v => v.trim())
      .filter(v => v.length > 0);
    res.json(versions);
  });
});

// --- FILE MANAGER ENDPOINTS ---
app.get('/api/servers/:name/files', (req, res) => {
  const { name } = req.params;
  const relPath = req.query.path || '/';
  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  // Security: prevent path traversal outside server directory
  const targetPath = path.normalize(path.join(srv.path, relPath));
  if (!targetPath.startsWith(path.normalize(srv.path))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(targetPath)) return res.status(404).json({ error: 'Path not found' });

  try {
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) return res.status(400).json({ error: 'Not a directory' });

    const items = fs.readdirSync(targetPath).map(file => {
      const fullPath = path.join(targetPath, file);
      const s = fs.statSync(fullPath);
      return {
        name: file,
        isDir: s.isDirectory(),
        size: s.size,
        mtime: s.mtime
      };
    });
    // Sort dirs first, then alphabetically
    items.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
    res.json({ path: relPath, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/servers/:name/files/read', (req, res) => {
  const { name } = req.params;
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const targetPath = path.normalize(path.join(srv.path, relPath));
  if (!targetPath.startsWith(path.normalize(srv.path))) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(targetPath)) return res.status(404).json({ error: 'File not found' });

  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/servers/:name/files/write', requireAdmin, (req, res) => {
  const { name } = req.params;
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const targetPath = path.normalize(path.join(srv.path, relPath));
  if (!targetPath.startsWith(path.normalize(srv.path))) return res.status(403).json({ error: 'Access denied' });

  try {
    fs.writeFileSync(targetPath, content, 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const multer = require('multer');
const upload = multer({ dest: '/tmp/mcserver-uploads/' });

app.post('/api/servers/:name/files/upload', requireAdmin, upload.single('file'), (req, res) => {
  const { name } = req.params;
  const relPath = req.body.path;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Server not found' });
  }

  const targetDir = path.normalize(path.join(srv.path, relPath));
  if (!targetDir.startsWith(path.normalize(srv.path))) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const destPath = path.join(targetDir, req.file.originalname);
  try {
    fs.renameSync(req.file.path, destPath);
    res.json({ success: true });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// --- PLAYER MANAGEMENT ENDPOINTS ---
app.get('/api/servers/:name/players/:list', (req, res) => {
  const { name, list } = req.params;
  // list can be: active, ops, whitelist, banned-players
  const validLists = ['active', 'ops', 'whitelist', 'banned-players'];
  if (!validLists.includes(list)) return res.status(400).json({ error: 'Invalid list type' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  if (list === 'active') {
    const util = require('minecraft-server-util');
    const port = parseInt(srv.port || '25565');
    util.status('127.0.0.1', port, { timeout: 2000 }).then(result => {
      if (result.players && result.players.sample) {
        res.json(result.players.sample.map(p => ({ name: p.name })));
      } else {
        res.json([]);
      }
    }).catch(err => {
      res.json([]);
    });
    return;
  }

  const filePath = path.join(srv.path, `${list}.json`);
  if (!fs.existsSync(filePath)) {
    return res.json([]);
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PLUGIN STORE ENDPOINTS ---
app.get('/api/plugins/search', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query required' });
  const url = `https://api.spiget.org/v2/search/resources/${encodeURIComponent(query)}?size=10&sort=-downloads&fields=id,name,tag,downloads,rating,icon,file`;
  https.get(url, { headers: { 'User-Agent': 'mcserver-installer' } }, (spigetRes) => {
    let data = '';
    spigetRes.on('data', chunk => data += chunk);
    spigetRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        res.json(json);
      } catch (err) {
        res.status(500).json({ error: 'Failed to parse Spiget API' });
      }
    });
  }).on('error', (err) => res.status(500).json({ error: err.message }));
});

app.post('/api/servers/:name/plugins/install', (req, res) => {
  const { name } = req.params;
  const { pluginId, pluginName } = req.body;
  if (!pluginId || !pluginName) return res.status(400).json({ error: 'Plugin info required' });

  const servers = getRegisteredServers();
  const srv = servers.find(s => s.name === name);
  if (!srv) return res.status(404).json({ error: 'Server not found' });

  const pluginsDir = path.join(srv.path, 'plugins');
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

  // Clean filename
  const safeName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.jar';
  const destPath = path.join(pluginsDir, safeName);
  
  const url = `https://api.spiget.org/v2/resources/${pluginId}/download`;
  const file = fs.createWriteStream(destPath);
  
  const request = https.get(url, { headers: { 'User-Agent': 'mcserver-installer' } }, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      // Follow redirect
      https.get(response.headers.location, { headers: { 'User-Agent': 'mcserver-installer' } }, (redirectRes) => {
        redirectRes.pipe(file);
        file.on('finish', () => { file.close(); res.json({ success: true, name: safeName }); });
      }).on('error', (err) => { fs.unlinkSync(destPath); res.status(500).json({ error: err.message }); });
    } else {
      response.pipe(file);
      file.on('finish', () => { file.close(); res.json({ success: true, name: safeName }); });
    }
  }).on('error', (err) => {
    fs.unlinkSync(destPath);
    res.status(500).json({ error: err.message });
  });
});

app.post('/api/servers/install', async (req, res) => {
  const { name, software, version, port, ram } = req.body;
  if (!name || !software || !version || !port || !ram) {
    return res.status(400).json({ error: 'Missing arguments' });
  }

  // 1. Check if name is already in use by a registered server or active install
  const servers = getRegisteredServers();
  if (servers.find(s => s.name === name) || activeInstalls.find(s => s.name === name)) {
    return res.status(400).json({ error: 'Server name is already in use' });
  }

  // 2. Check if port is in use by a registered server
  const portUsedByRegistered = servers.some(srv => {
    const propPath = path.join(srv.path, 'server.properties');
    if (fs.existsSync(propPath)) {
      const props = fs.readFileSync(propPath, 'utf8');
      const portMatch = props.match(/^server-port=(\d+)/m);
      if (portMatch && portMatch[1] === port.toString()) return true;
    }
    return false;
  });
  
  if (portUsedByRegistered || activeInstalls.find(s => s.port === port.toString())) {
    return res.status(400).json({ error: 'Port is already assigned to another server' });
  }

  // 3. Check if port is currently in use by the OS
  const portFree = await isPortFree(parseInt(port));
  if (!portFree) {
    return res.status(400).json({ error: 'Port is currently in use by another process' });
  }

  // Add to active installs
  const installObj = {
    name,
    type: software,
    version,
    port: port.toString(),
    path: path.join(os.homedir(), 'minecraft', name),
    isInstalling: true,
    running: false
  };
  activeInstalls.push(installObj);

  const mainScript = path.resolve(__dirname, '..', 'mcserver-installer');
  const installProcess = spawn(mainScript, ['--install', name, software, version, port, ram]);
  
  installProcess.stdout.on('data', (data) => {
    console.log(`[Install ${name}]: ${data}`);
  });
  installProcess.stderr.on('data', (data) => {
    console.error(`[Install ${name} Error]: ${data}`);
  });
  installProcess.on('close', (code) => {
    console.log(`[Install ${name}] Process exited with code ${code}`);
    // Remove from active installs once done (success or failure)
    const index = activeInstalls.findIndex(s => s.name === name);
    if (index !== -1) activeInstalls.splice(index, 1);
  });
  
  res.json({ success: true, message: 'Installation started' });
});

app.post('/api/dashboard/bind-domain', (req, res) => {
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  const mainScript = path.resolve(__dirname, '..', 'mcserver-installer');
  exec(`"${mainScript}" --bind-domain "${domain}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Domain binding failed: ${stderr || error.message}`);
      return res.status(500).json({ error: stderr || 'Domain binding failed' });
    }
    res.json({ success: true, message: stdout.trim() });
  });
});

app.get('/api/dashboard/domain', (req, res) => {
  const settingsFile = path.join(os.homedir(), '.mcserver-installer', 'settings.conf');
  let domain = '';
  if (fs.existsSync(settingsFile)) {
    const lines = fs.readFileSync(settingsFile, 'utf8').split('\n');
    const domainLine = lines.find(l => l.startsWith('DASHBOARD_DOMAIN='));
    if (domainLine) {
      domain = domainLine.split('=')[1].replace(/"/g, '').trim();
    }
  }
  res.json({ domain });
});

function findFreePort(startPort, maxPort = 3100) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (startPort < maxPort) {
          resolve(findFreePort(startPort + 1, maxPort));
        } else {
          reject(new Error('No free ports available'));
        }
      } else {
        reject(err);
      }
    });

    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

findFreePort(PORT).then((freePort) => {
  app.listen(freePort, () => {
    console.log(`mcserver-installer Dashboard server listening on port ${freePort}`);
    const configDir = path.join(os.homedir(), '.mcserver-installer');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(path.join(configDir, '.dashboard_port'), freePort.toString(), 'utf8');
  });
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
