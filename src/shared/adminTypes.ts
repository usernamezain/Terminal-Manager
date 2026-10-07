import { z } from 'zod';

export const AdminPtyCreateSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
  cwd: z.string().optional(),
  shellPath: z.string().optional(),
  shellArgs: z.array(z.string()).optional(),
});

export const AdminPtyWriteSchema = z.object({
  id: z.string().min(1),
  data: z.string(),
});

export const AdminPtyResizeSchema = z.object({
  id: z.string().min(1),
  cols: z.number().int().min(1).max(1000),
  rows: z.number().int().min(1).max(1000),
});

export const AdminPtyKillSchema = z.object({
  id: z.string().min(1),
});

export const AdminAuthSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(8),
});

export const AdminMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth'), token: z.string() }),
  z.object({ type: z.literal('create'), payload: AdminPtyCreateSchema }),
  z.object({ type: z.literal('write'), payload: AdminPtyWriteSchema }),
  z.object({ type: z.literal('resize'), payload: AdminPtyResizeSchema }),
  z.object({ type: z.literal('kill'), payload: AdminPtyKillSchema }),
  z.object({ type: z.literal('list') }),
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('shutdown') }),
]);

export type AdminMessage = z.infer<typeof AdminMessageSchema>;

export interface AdminHelperStatus {
  state: 'disconnected' | 'starting' | 'connected';
  pid?: number;
  pipeName?: string;
  error?: string;
}
