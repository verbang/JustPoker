import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

type DatabaseRow = Record<string, unknown>;

interface QueryOptions {
  select?: string;
  match?: Record<string, unknown>;
  order?: string;
}

class DatabaseService {
  private client: SupabaseClient | null = null;

  async initialize(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || this.isPlaceholderConfig(supabaseUrl, supabaseKey)) {
      logger.warn('Supabase credentials not configured, using in-memory storage');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    logger.info('Database connected to Supabase');
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  private isPlaceholderConfig(supabaseUrl: string, supabaseKey: string): boolean {
    return supabaseUrl.startsWith('your-') || supabaseKey.startsWith('your-');
  }

  async query(table: string, query?: QueryOptions): Promise<DatabaseRow[]> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return [];
    }

    const { data, error } = await this.client
      .from(table)
      .select(query?.select || '*')
      .match(query?.match || {})
      .order(query?.order || 'created_at', { ascending: false });

    if (error) {
      logger.error(`Query error on ${table}`, error);
      return [];
    }

    return (data || []) as unknown as DatabaseRow[];
  }

  async insert(table: string, data: DatabaseRow): Promise<DatabaseRow | null> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return null;
    }

    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error(`Insert error on ${table}`, error);
      return null;
    }

    return result;
  }

  async update(table: string, id: string, data: DatabaseRow): Promise<DatabaseRow | null> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return null;
    }

    const { data: result, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(`Update error on ${table}`, error);
      return null;
    }

    return result;
  }

  async delete(table: string, id: string): Promise<boolean> {
    if (!this.client) {
      logger.warn('Database not initialized');
      return false;
    }

    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error(`Delete error on ${table}`, error);
      return false;
    }

    return true;
  }
}

export const database = new DatabaseService();
