import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from '../config';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: WebSocket as any,
    },
  }
);

export const supabaseAdmin = supabase;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Database connection check failed:', error.message);
      return false;
    }
    console.log('Database connected successfully');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
}
