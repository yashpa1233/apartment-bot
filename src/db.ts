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
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    const seenPosts = parsed.seenPosts || [];
    if (!seenPosts.includes(postId)) {
      seenPosts.push(postId);
      parsed.seenPosts = seenPosts;
      await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.error('Error saving seen post:', error);
  }
}

export async function getLastScannedLinks(): Promise<string[]> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.lastScannedLinks || [];
  } catch (error) {
    return [];
  }
}

export async function saveLastScannedLinks(links: string[]): Promise<void> {
  try {
    let parsed: any = {};
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      parsed = JSON.parse(data);
    } catch (e) {
      parsed = { seenPosts: [] };
    }
    parsed.lastScannedLinks = links;
    await fs.writeFile(DB_PATH, JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error('Error saving last scanned links:', error);
  }
}

export async function getConfig(): Promise<AppConfig> {
  const data = await fs.readFile(CONFIG_PATH, 'utf-8');
  return JSON.parse(data) as AppConfig;
}
