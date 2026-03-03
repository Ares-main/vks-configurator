/**
 * Certificate retrieval and trust store configuration.
 * Cross-platform: Linux and macOS.
 */

import { exec } from "./shell.ts";
import { detectPlatform, systemCertDir, updateCertCmd } from "./platform.ts";

/**
 * Fetch the TLS certificate chain from a host:port using openssl.
 * Returns the PEM-encoded certificate(s), or null on failure.
 */
export async function fetchCertificate(
  host: string,
  port: number = 443,
): Promise<{ cert: string | null; error?: string }> {
  const result = await exec(
    [
      "openssl",
      "s_client",
      "-showcerts",
      "-connect",
      `${host}:${port}`,
      "-servername",
      host,
    ],
    { stdin: "" }, // close stdin immediately
  );

  // openssl s_client exits non-zero sometimes even on success
  const output = result.stdout + "\n" + result.stderr;
  const certs: string[] = [];
  const regex = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    certs.push(match[0]);
  }

  if (certs.length === 0) {
    return { cert: null, error: `No certificates found from ${host}:${port}` };
  }

  return { cert: certs.join("\n") };
}

/**
 * Install a CA cert into Docker's trust store for a specific registry.
 * Creates /etc/docker/certs.d/<registry>/ca.crt
 */
export async function installDockerCert(
  registryAddr: string,
  certPem: string,
): Promise<{ ok: boolean; error?: string }> {
  const certDir = `/etc/docker/certs.d/${registryAddr}`;

  const mkdir = await exec(["sudo", "mkdir", "-p", certDir]);
  if (!mkdir.ok) return { ok: false, error: `mkdir failed: ${mkdir.stderr}` };

  // Write cert via tee
  const write = await exec(
    ["sudo", "tee", `${certDir}/ca.crt`],
    { stdin: certPem },
  );
  if (!write.ok) return { ok: false, error: `Write cert failed: ${write.stderr}` };

  return { ok: true };
}

/**
 * Install a CA cert into the system trust store.
 * Cross-platform: Arch, Debian/Ubuntu, macOS.
 */
export async function installSystemCert(
  name: string,
  certPem: string,
): Promise<{ ok: boolean; error?: string }> {
  const platform = detectPlatform();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (platform === "macos") {
    // Write cert to tmp, then add to macOS Keychain
    const tmpCert = `/tmp/${safeName}.crt`;
    const write = await exec(["tee", tmpCert], { stdin: certPem });
    if (!write.ok) return { ok: false, error: `Write cert failed: ${write.stderr}` };

    const add = await exec([
      "sudo", "security", "add-trusted-cert",
      "-d", "-r", "trustRoot",
      "-k", "/Library/Keychains/System.keychain",
      tmpCert,
    ]);
    await exec(["rm", "-f", tmpCert]);
    if (!add.ok) return { ok: false, error: `Keychain add failed: ${add.stderr}` };
    return { ok: true };
  }

  // Linux path
  const certDir = systemCertDir();
  const certPath = `${certDir}/${safeName}.crt`;

  const mkdir = await exec(["sudo", "mkdir", "-p", certDir]);
  if (!mkdir.ok) return { ok: false, error: `mkdir failed: ${mkdir.stderr}` };

  const write = await exec(["sudo", "tee", certPath], { stdin: certPem });
  if (!write.ok) return { ok: false, error: `Write cert failed: ${write.stderr}` };

  const cmd = updateCertCmd();
  const update = await exec(cmd);
  if (!update.ok)
    return { ok: false, error: `${cmd.join(" ")} failed: ${update.stderr}` };

  return { ok: true };
}

/**
 * Verify a certificate can be parsed.
 */
export async function verifyCertificate(
  certPem: string,
): Promise<{ valid: boolean; subject?: string; issuer?: string; error?: string }> {
  const result = await exec(
    ["openssl", "x509", "-noout", "-subject", "-issuer"],
    { stdin: certPem },
  );

  if (!result.ok) return { valid: false, error: result.stderr };

  const lines = result.stdout.split("\n");
  const subject = lines.find((l) => l.startsWith("subject="))?.replace("subject=", "").trim();
  const issuer = lines.find((l) => l.startsWith("issuer="))?.replace("issuer=", "").trim();

  return { valid: true, subject, issuer };
}
