import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CERT_DIR = "cert";

if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

fs.writeFileSync(path.join(CERT_DIR, "private-key.pem"), privateKey);
fs.writeFileSync(path.join(CERT_DIR, "public-key.pub"), publicKey);

console.log(`Keys have been generated in the ${CERT_DIR}/ folder.`);
