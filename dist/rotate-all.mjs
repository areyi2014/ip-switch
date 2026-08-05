/**
 * Batch rotate IPs for all saved profiles and update Cloudflare DNS.
 * Usage: node dist/rotate-all.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getAdapter } from './router.js';
import { updateDns } from './adapters/cloudflare.js';

const CONFIG_FILE = join(homedir(), '.cloud-ip-rotator', 'config.json');

const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
const profiles = Object.values(config.profiles);

console.log(`Found ${profiles.length} profile(s) to rotate.\n`);

for (const profile of profiles) {
  console.log(`========== ${profile.name} (${profile.provider}) ==========`);
  console.log(`  Region: ${profile.region}`);
  console.log(`  Instance: ${profile.instanceId}`);
  console.log(`  Subdomain: ${profile.subdomain}`);

  try {
    // Step 1: Rotate IP
    const adapter = getAdapter(profile.provider);
    console.log('  Rotating IP... (stop → wait → start → wait → fetch new IP)');
    const result = await adapter.rotateIp(profile.instanceId, profile.region, profile.credentials);
    console.log(`  IP rotated: ${result.oldIp ?? 'N/A'} -> ${result.newIp ?? 'N/A'}`);

    // Step 2: Update Cloudflare DNS if configured
    if (profile.cloudflare && profile.subdomain && result.newIp) {
      console.log(`  Updating DNS: ${profile.subdomain} -> ${result.newIp} (proxied: ${profile.proxied})`);
      const dnsResult = await updateDns(profile.cloudflare, profile.subdomain, result.newIp, profile.proxied);
      console.log(`  DNS updated: ${dnsResult.oldIp ?? 'N/A'} -> ${dnsResult.newIp}`);
    } else if (!profile.cloudflare) {
      console.log('  Skipping DNS update: no Cloudflare config in profile');
    } else if (!result.newIp) {
      console.log('  Skipping DNS update: new IP is empty');
    }

    console.log(`  ✅ ${profile.name} done\n`);
  } catch (err) {
    console.error(`  ❌ ${profile.name} failed: ${err.message}\n`);
  }
}

console.log('All done.');
