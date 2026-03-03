/**
 * Connection helpers for vSphere Supervisor / VKS clusters.
 * Supports both VCF CLI (vSphere 9+) and legacy kubectl-vsphere.
 */

import { exec, execStdout, which } from "./shell.ts";

export interface ConnectOpts {
  endpoint: string;
  username: string;
  password: string;
  mode: "vcf" | "legacy";
  insecureSkipTls?: boolean;
  caCertPath?: string;
}

export interface ConnectResult {
  ok: boolean;
  contexts: string[];
  error?: string;
}

/**
 * Connect to a vSphere Supervisor using VCF CLI.
 */
async function connectVcf(opts: ConnectOpts): Promise<ConnectResult> {
  const cmd = ["vcf", "context", "create", "--endpoint", opts.endpoint, "--username", opts.username];

  if (opts.insecureSkipTls) {
    cmd.push("--insecure-skip-tls-verify");
  } else if (opts.caCertPath) {
    cmd.push("--ca-certificate", opts.caCertPath);
  }

  const env: Record<string, string> = {};
  if (opts.password) {
    env["VCF_CLI_VSPHERE_PASSWORD"] = opts.password;
  }

  const result = await exec(cmd, { env });
  const output = result.stdout + "\n" + result.stderr;

  if (output.includes("Logged in successfully") || result.ok) {
    const contexts = parseContexts(output);
    return { ok: true, contexts };
  }

  return { ok: false, contexts: [], error: result.stderr || result.stdout };
}

/**
 * Connect to a vSphere Supervisor using legacy kubectl vsphere login.
 */
async function connectLegacy(opts: ConnectOpts): Promise<ConnectResult> {
  const cmd = [
    "kubectl",
    "vsphere",
    "login",
    "--server",
    opts.endpoint,
    "-u",
    opts.username,
  ];

  if (opts.insecureSkipTls) {
    cmd.push("--insecure-skip-tls-verify");
  }

  const env: Record<string, string> = {};
  if (opts.password) {
    env["KUBECTL_VSPHERE_PASSWORD"] = opts.password;
  }

  const result = await exec(cmd, { env });
  const output = result.stdout + "\n" + result.stderr;

  if (output.includes("Logged in successfully") || result.ok) {
    const contexts = parseContexts(output);
    return { ok: true, contexts };
  }

  return { ok: false, contexts: [], error: result.stderr || result.stdout };
}

/**
 * Parse context names from login output.
 */
function parseContexts(output: string): string[] {
  const lines = output.split("\n");
  const contexts: string[] = [];
  let capture = false;

  for (const line of lines) {
    if (line.includes("You have access to the following contexts:")) {
      capture = true;
      continue;
    }
    if (capture) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("If ") || trimmed.startsWith("To ")) {
        capture = false;
        continue;
      }
      contexts.push(trimmed);
    }
  }

  return contexts;
}

/**
 * Connect to a Supervisor/VKS cluster.
 */
export async function connect(opts: ConnectOpts): Promise<ConnectResult> {
  if (opts.mode === "vcf") {
    return connectVcf(opts);
  }
  return connectLegacy(opts);
}

/**
 * Switch kubectl context.
 */
export async function switchContext(context: string): Promise<boolean> {
  const result = await exec(["kubectl", "config", "use-context", context]);
  return result.ok;
}

/**
 * Get current kubectl context.
 */
export async function getCurrentContext(): Promise<string> {
  return (await execStdout(["kubectl", "config", "current-context"])) ?? "";
}

/**
 * List all available kubectl contexts.
 */
export async function listContexts(): Promise<string[]> {
  const result = await execStdout([
    "kubectl",
    "config",
    "get-contexts",
    "-o",
    "name",
  ]);
  if (!result) return [];
  return result.split("\n").filter(Boolean);
}

/**
 * Detect which connection mode is available.
 */
export async function detectMode(): Promise<"vcf" | "legacy" | null> {
  if (await which("vcf")) return "vcf";
  if (await which("kubectl-vsphere")) return "legacy";
  return null;
}
