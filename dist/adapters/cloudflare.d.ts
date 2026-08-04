/**
 * Cloudflare DNS Adapter — Update Cloudflare DNS A records via REST API v4
 *
 * Two operations:
 *   1. getRecordId  — find the DNS A record ID for a given subdomain
 *   2. updateDns     — combined: find record ID + update IP content
 *
 * Uses native fetch (Node 18+). No external dependencies.
 */
import type { CloudflareConfig, DnsUpdateResult } from '../types.js';
/** Error thrown by Cloudflare adapter */
export declare class CloudflareError extends Error {
    statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
/** Find the DNS A record ID for a subdomain. */
export declare function getRecordId(config: CloudflareConfig, subdomain: string): Promise<string>;
/** Update the DNS A record for a subdomain to point to a new IP. */
export declare function updateDns(config: CloudflareConfig, subdomain: string, newIp: string, proxied?: boolean): Promise<DnsUpdateResult>;
