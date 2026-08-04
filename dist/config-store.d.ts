/**
 * Config Store — Persistent JSON configuration storage
 *
 * Stores cloud provider credentials, subdomain bindings, and Cloudflare API config
 * in a JSON file at ~/.cloud-ip-rotator/config.json
 *
 * File format:
 * {
 *   "cloudflare": { "apiToken": "...", "zoneId": "..." },
 *   "profiles": {
 *     "aws-sg": { "provider": "aws", "region": "...", ... },
 *     ...
 *   }
 * }
 */
import type { AppConfig, CloudflareConfig, ConfigProfile } from './types.js';
/** Load config from disk. Returns empty config if file doesn't exist. */
export declare function loadConfig(): AppConfig;
/** Save config to disk (creates directory if needed). */
export declare function saveConfig(config: AppConfig): void;
/** Save or update a cloud provider profile. */
export declare function saveProfile(profile: ConfigProfile): AppConfig;
/** Delete a profile by name. Returns true if deleted, false if not found. */
export declare function deleteProfile(name: string): boolean;
/** Get a profile by name. Returns undefined if not found. */
export declare function getProfile(name: string): ConfigProfile | undefined;
/** List all saved profiles. */
export declare function listProfiles(): ConfigProfile[];
/** Save Cloudflare API config. */
export declare function saveCloudflareConfig(cf: CloudflareConfig): AppConfig;
/** Get Cloudflare API config. Returns null if not configured. */
export declare function getCloudflareConfig(): CloudflareConfig | null;
/** Get the config file path (for logging/debugging). */
export declare function getConfigPath(): string;
