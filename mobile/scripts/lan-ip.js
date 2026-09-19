/**
 * Prints the address to put in eas.json's `preview` profile.
 *
 * A test APK installed on a handset cannot reach "localhost" — on the phone,
 * localhost is the phone. It needs this computer's address on the office
 * wifi, which is what this finds.
 */
const os = require("os");

const candidates = [];

for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
  for (const addr of addrs ?? []) {
    if (addr.family !== "IPv4" || addr.internal) continue;
    candidates.push({ name, address: addr.address });
  }
}

if (candidates.length === 0) {
  console.log("No network address found — is this machine connected to wifi?");
  process.exit(1);
}

console.log("\nThis computer's address(es) on the local network:\n");
for (const c of candidates) {
  console.log(`  ${c.address.padEnd(16)} (${c.name})`);
}

const best = candidates[0].address;
console.log(`\nPut this in mobile/eas.json, under build.preview.env:\n`);
console.log(`  "EXPO_PUBLIC_API_URL": "http://${best}:4000"\n`);
console.log("The phone and this computer must be on the same wifi, and the");
console.log("backend must be running (npm run dev:backend).\n");
