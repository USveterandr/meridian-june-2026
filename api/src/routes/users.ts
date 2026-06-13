import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const users = new Hono<AppEnv>();
users.use('*', requireAuth);

type UserRow = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
};

users.get('/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'));
  const user = await c.env.DB.prepare('SELECT id, first_name, last_name, role, phone FROM users WHERE id = ?').bind(id).first<UserRow>();
  if (!user) return c.json({ error: 'User not found.' }, 404);
  return c.json({
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      phone: user.phone,
    },
  });
});

export default users;
