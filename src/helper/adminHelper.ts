import net from 'net';
import pty from 'node-pty';
import { AdminMessageSchema, AdminMessage } from '../shared/adminTypes';

const args = process.argv.slice(2);
const pipeArg = args.find((a) => a.startsWith('--pipe='));
const tokenArg = args.find((a) => a.startsWith('--token='));

const pipeName = pipeArg ? pipeArg.split('=')[1] : null;
const expectedToken = tokenArg ? tokenArg.split('=')[1] : null;

if (!pipeName || !expectedToken) {
  console.error('[AdminHelper] Missing required --pipe or --token argument');
  process.exit(1);
}

const activePtys = new Map<string, pty.IPty>();
let lastActiveTime = Date.now();
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Idle check loop
setInterval(() => {
  if (activePtys.size === 0 && Date.now() - lastActiveTime > IDLE_TIMEOUT_MS) {
    console.log('[AdminHelper] Idle timeout reached (30 min). Shutting down admin helper.');
    process.exit(0);
  }
}, 60000);

const server = net.createServer((socket) => {
  let authenticated = false;
  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const rawJson = JSON.parse(line);
        const parseResult = AdminMessageSchema.safeParse(rawJson);

        if (!parseResult.success) {
          socket.write(JSON.stringify({ type: 'error', message: 'Unknown or invalid message format' }) + '\n');
          continue;
        }

        const msg: AdminMessage = parseResult.data;

        if (!authenticated) {
          if (msg.type === 'auth' && msg.token === expectedToken) {
            authenticated = true;
            socket.write(JSON.stringify({ type: 'auth:ok' }) + '\n');
          } else {
            socket.write(JSON.stringify({ type: 'error', message: 'Unauthorized' }) + '\n');
            socket.destroy();
          }
          continue;
        }

        handleMessage(msg, socket);
      } catch (err: any) {
        socket.write(JSON.stringify({ type: 'error', message: err.message || 'JSON parse error' }) + '\n');
      }
    }
  });

  socket.on('error', (err) => {
    console.error('[AdminHelper Socket Error]', err);
  });
});

function handleMessage(msg: AdminMessage, socket: net.Socket): void {
  switch (msg.type) {
    case 'ping':
      socket.write(JSON.stringify({ type: 'pong', time: Date.now() }) + '\n');
      break;

    case 'create': {
      const { id, cols, rows, cwd, shellPath, shellArgs } = msg.payload;
      if (activePtys.has(id)) {
        socket.write(JSON.stringify({ type: 'error', id, message: 'PTY ID already exists' }) + '\n');
        return;
      }

      const targetShell = shellPath || 'powershell.exe';
      const targetArgs = shellArgs || ['-NoProfile'];
      const targetCwd = cwd || process.env.USERPROFILE || 'C:\\';

      try {
        const ptyProc = pty.spawn(targetShell, targetArgs, {
          name: 'xterm-color',
          cols,
          rows,
          cwd: targetCwd,
          env: process.env as Record<string, string>,
        });

        activePtys.set(id, ptyProc);
        lastActiveTime = Date.now();

        ptyProc.onData((data) => {
          if (!socket.destroyed) {
            socket.write(JSON.stringify({ type: 'pty:data', id, data }) + '\n');
          }
        });

        ptyProc.onExit(({ exitCode }) => {
          activePtys.delete(id);
          lastActiveTime = Date.now();
          if (!socket.destroyed) {
            socket.write(JSON.stringify({ type: 'pty:exit', id, exitCode }) + '\n');
          }
        });

        socket.write(JSON.stringify({ type: 'pty:created', id, pid: ptyProc.pid }) + '\n');
      } catch (err: any) {
        socket.write(JSON.stringify({ type: 'error', id, message: err.message || 'Failed to spawn PTY' }) + '\n');
      }
      break;
    }

    case 'write': {
      const { id, data } = msg.payload;
      const ptyProc = activePtys.get(id);
      if (ptyProc) {
        ptyProc.write(data);
      }
      break;
    }

    case 'resize': {
      const { id, cols, rows } = msg.payload;
      const ptyProc = activePtys.get(id);
      if (ptyProc) {
        try {
          ptyProc.resize(cols, rows);
        } catch (_) {}
      }
      break;
    }

    case 'kill': {
      const { id } = msg.payload;
      const ptyProc = activePtys.get(id);
      if (ptyProc) {
        try {
          ptyProc.kill();
        } catch (_) {}
        activePtys.delete(id);
        lastActiveTime = Date.now();
      }
      break;
    }

    case 'list': {
      const ptyList = Array.from(activePtys.keys());
      socket.write(JSON.stringify({ type: 'pty:list', ids: ptyList }) + '\n');
      break;
    }

    case 'shutdown': {
      socket.write(JSON.stringify({ type: 'shutdown:ok' }) + '\n');
      for (const ptyProc of activePtys.values()) {
        try { ptyProc.kill(); } catch (_) {}
      }
      activePtys.clear();
      process.exit(0);
    }
  }
}

server.listen(pipeName, () => {
  console.log(`[AdminHelper] Listening on named pipe: ${pipeName}`);
});
