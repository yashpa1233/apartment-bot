import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'db.json');
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export interface AppConfig {
  cities: string[];
  maxPrice: number;
  minRooms: number;
  maxRooms: number;
  keywords: string[];
  excludeKeywords: string[];
}

export async function getSeenPosts(): Promise<string[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.seenPosts || [];
  } catch (error) {
    return [];
  }
}

export async function addSeenPost(postId: string): Promise<void> {
  const seenPosts = await getSeenPosts();
  if (!seenPosts.includes(postId)) {
    seenPosts.push(postId);
    await fs.writeFile(DB_PATH, JSON.stringify({ seenPosts }, null, 2));
  }
}

export async function getConfig(): Promise<AppConfig> {
  const data = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(data) as AppConfig;
}
