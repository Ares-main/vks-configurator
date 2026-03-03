/**
 * Harbor registry configuration: cert fetching, Docker trust, login,
 * and k8s image pull secret generation.
 */

import { exec, execStdout } from "./shell.ts";
import { fetchCertificate, installDockerCert, installSystemCert, verifyCertificate } from "./certs.ts";

export interface HarborSetupResult {
  ok: boolean;
  step: string;
  error?: string;
}

/**
 * Full Harbor setup pipeline:
 * 1. Fetch CA cert
 * 2. Verify cert
 * 3. Install to Docker trust store
 * 4. Optionally install to system trust store
 * 5. Restart Docker
 */
export async function setupHarborCerts(
  harborAddr: string,
  opts?: { systemCert?: boolean },
): Promise<{ ok: boolean; steps: HarborSetupResult[]; cert?: string }> {
  const steps: HarborSetupResult[] = [];

  // 1. Fetch certificate
  const { cert, error: fetchErr } = await fetchCertificate(harborAddr);
  if (!cert) {
    steps.push({ ok: false, step: "Fetch certificate", error: fetchErr });
    return { ok: false, steps };
  }
  steps.push({ ok: true, step: "Fetch certificate" });

  // 2. Verify certificate
  const verify = await verifyCertificate(cert);
  if (!verify.valid) {
    steps.push({ ok: false, step: "Verify certificate", error: verify.error });
    return { ok: false, steps };
  }
  steps.push({
    ok: true,
    step: `Verify certificate (${verify.subject ?? "unknown"})`,
  });

  // 3. Install to Docker trust store
  const dockerResult = await installDockerCert(harborAddr, cert);
  if (!dockerResult.ok) {
    steps.push({ ok: false, step: "Install Docker cert", error: dockerResult.error });
    return { ok: false, steps };
  }
  steps.push({ ok: true, step: "Install Docker cert" });

  // 4. Optionally install to system trust store
  if (opts?.systemCert) {
    const sysResult = await installSystemCert(`harbor-${harborAddr}`, cert);
    if (!sysResult.ok) {
      steps.push({ ok: false, step: "Install system cert", error: sysResult.error });
      return { ok: false, steps };
    }
    steps.push({ ok: true, step: "Install system cert" });
  }

  // 5. Restart Docker daemon
  const restart = await exec(["sudo", "systemctl", "restart", "docker"]);
  if (!restart.ok) {
    steps.push({ ok: false, step: "Restart Docker", error: restart.stderr });
    return { ok: false, steps };
  }
  steps.push({ ok: true, step: "Restart Docker" });

  return { ok: true, steps, cert };
}

/**
 * Login to Harbor via Docker CLI.
 */
export async function dockerLogin(
  harborAddr: string,
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await exec(
    ["docker", "login", harborAddr, "-u", username, "--password-stdin"],
    { stdin: password },
  );

  if (result.ok || result.stdout.includes("Login Succeeded")) {
    return { ok: true };
  }

  return { ok: false, error: result.stderr || result.stdout };
}

/**
 * List projects on a Harbor registry via its API.
 */
export async function listHarborProjects(
  harborAddr: string,
  username?: string,
  password?: string,
): Promise<{ ok: boolean; projects: string[]; error?: string }> {
  const cmd = ["curl", "-sk", `https://${harborAddr}/api/v2.0/projects`];

  if (username && password) {
    cmd.push("-u", `${username}:${password}`);
  }

  const result = await exec(cmd);
  if (!result.ok) return { ok: false, projects: [], error: result.stderr };

  try {
    const data = JSON.parse(result.stdout);
    if (Array.isArray(data)) {
      const projects = data.map(
        (p: { name?: string }) => p.name ?? "unknown",
      );
      return { ok: true, projects };
    }
    return { ok: false, projects: [], error: "Unexpected API response" };
  } catch {
    return { ok: false, projects: [], error: "Failed to parse API response" };
  }
}

/**
 * Create a Kubernetes docker-registry secret for Harbor.
 */
export async function createImagePullSecret(
  secretName: string,
  namespace: string,
  harborAddr: string,
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await exec([
    "kubectl",
    "create",
    "secret",
    "docker-registry",
    secretName,
    `--docker-server=${harborAddr}`,
    `--docker-username=${username}`,
    `--docker-password=${password}`,
    "-n",
    namespace,
  ]);

  if (result.ok) return { ok: true };

  // Already exists is fine
  if (result.stderr.includes("already exists")) return { ok: true };

  return { ok: false, error: result.stderr };
}
