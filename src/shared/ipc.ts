import { z } from 'zod';

export const PtyCreateSchema = z.object({
  profileId: z.string().optional(),
  cwd: z.string().optional(),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
  admin: z.boolean().optional(),
  shellPath: z.string().optional(),
  shellArgs: z.array(z.string()).optional(),
});

export const PtyWriteSchema = z.object({
  id: z.string().min(1),
  data: z.string(),
});

export const PtyResizeSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
});

export const PtyKillSchema = z.object({
  id: z.string().min(1),
});

export const PtyAckSchema = z.object({
  id: z.string().min(1),
  length: z.number().int().min(0),
});

export const SettingsSetSchema = z.object({
  theme: z.enum(['midnight', 'graphite']).optional(),
  accent: z.string().optional(),
  windowMaterial: z.enum(['mica', 'acrylic', 'solid']).optional(),
  uiDensity: z.enum(['compact', 'normal', 'comfortable']).optional(),
  animationLevel: z.enum(['full', 'reduced', 'off']).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(8).max(36).optional(),
  lineHeight: z.number().min(0.8).max(3.0).optional(),
  cursorStyle: z.enum(['block', 'underline', 'bar']).optional(),
  cursorBlink: z.boolean().optional(),
  scrollback: z.number().min(100).max(100000).optional(),
  defaultShell: z.string().optional(),
});

export const IPC_CHANNELS = {
  PTY_CREATE: 'pty:create',
  PTY_WRITE: 'pty:write',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_ACK: 'pty:ack',
  PTY_DATA: 'pty:data',
  PTY_EXIT: 'pty:exit',
  PTY_FALLBACK: 'pty:fallback',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SHELLS_DETECT: 'shells:detect',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_UNMAXIMIZE: 'window:unmaximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
} as const;
