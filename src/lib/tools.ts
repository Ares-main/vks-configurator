/**
 * Detect and install required CLI tools for VKS workflows.
 * Cross-platform: Linux (pacman/apt) and macOS (brew).
 */

import { exec, which, execStdout } from "./shell.ts";
import { detectPlatform, type Platform } from "./platform.ts";

export interface ToolStatus {
  name: string;
  binary: string;
  found: boolean;
  version: string;
  path: string;
  required: boolean;
  installHint: string;
}

function installHint(binary: string, platform: Platform): string {
  const hints: Record<string, Record<Platform, string>> = {
    kubectl: {
      "arch": "sudo pacman -S kubectl",
      "debian": "sudo apt install -y kubectl",
      "macos": "brew install kubectl",
      "unknown": "https://kubernetes.io/docs/tasks/tools/",
    },
    docker: {
      "arch": "sudo pacman -S docker",
      "debian": "sudo apt install -y docker.io",
      "macos": "brew install --cask docker",
      "unknown": "https://docs.docker.com/get-docker/",
    },
    helm: {
      "arch": "sudo pacman -S helm",
      "debian": "sudo snap install helm --classic",
      "macos": "brew install helm",
      "unknown": "https://helm.sh/docs/intro/install/",
    },
    openssl: {
      "arch": "sudo pacman -S openssl",
      "debian": "sudo apt install -y openssl",
      "macos": "brew install openssl",
      "unknown": "Install openssl via your package manager",
    },
  };
  const vsphereHint = "Download from https://<SUPERVISOR_IP>/wcp/plugin/...";
  return hints[binary]?.[platform] ?? vsphereHint;
}

function buildToolDefs(platform: Platform) {
  return [
    {
      name: "kubectl",
      binary: "kubectl",
      required: true,
      versionCmd: ["kubectl", "version", "--client", "--short"],
      installHint: installHint("kubectl", platform),
    },
    {
      name: "VCF CLI",
      binary: "vcf",
      required: false,
      versionCmd: ["vcf", "version"],
      installHint: "Download from https://<SUPERVISOR_IP>/wcp/plugin/.../vsphere-plugin.zip",
    },
    {
      name: "kubectl-vsphere (legacy)",
      binary: "kubectl-vsphere",
      required: false,
      versionCmd: ["kubectl", "vsphere", "version"],
      installHint: "Download from https://<SUPERVISOR_IP>/wcp/plugin/.../vsphere-plugin.zip",
    },
    {
      name: "Docker",
      binary: "docker",
      required: true,
      versionCmd: ["docker", "--version"],
      installHint: installHint("docker", platform),
    },
    {
      name: "Helm",
      binary: "helm",
      required: false,
      versionCmd: ["helm", "version", "--short"],
      installHint: installHint("helm", platform),
    },
    {
      name: "OpenSSL",
      binary: "openssl",
      required: true,
      versionCmd: ["openssl", "version"],
      installHint: installHint("openssl", platform),
    },
  ] as const;
}

export async function checkTool(def: ReturnType<typeof buildToolDefs>[number]): Promise<ToolStatus> {
  const path = await which(def.binary);
  let version = "";

  if (path) {
    const ver = await execStdout(def.versionCmd as unknown as string[]);
    version = ver ?? "unknown";
  }

  return {
    name: def.name,
    binary: def.binary,
    found: !!path,
    version,
    path: path ?? "",
    required: def.required,
    installHint: def.installHint,
  };
}

export async function checkAllTools(): Promise<ToolStatus[]> {
  const platform = detectPlatform();
  const defs = buildToolDefs(platform);
  return Promise.all(defs.map(checkTool));
}

/**
 * Install a tool using the system package manager.
 */
export async function installPackage(pkg: string): Promise<boolean> {
  const platform = detectPlatform();
  let cmd: string[];
  switch (platform) {
    case "macos":
      cmd = ["brew", "install", pkg];
      break;
    case "debian":
      cmd = ["sudo", "apt", "install", "-y", pkg];
      break;
    case "arch":
    default:
      cmd = ["sudo", "pacman", "-S", "--noconfirm", pkg];
      break;
  }
  const result = await exec(cmd);
  return result.ok;
}

/** Kept for backward compat */
export const installWithPacman = installPackage;

/**
 * Download VCF CLI / kubectl-vsphere plugin from a Supervisor endpoint.
 * Auto-detects OS and architecture for the download URL.
 */
export async function downloadVspherePlugin(
  supervisorAddr: string,
): Promise<{ ok: boolean; error?: string }> {
  const platform = detectPlatform();
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const os = platform === "macos" ? "darwin" : "linux";
  const url = `https://${supervisorAddr}/wcp/plugin/${os}-${arch}/vsphere-plugin.zip`;
  const tmpDir = "/tmp/vsphere-plugin";

  const dl = await exec([
    "curl",
    "-LOk",
    "--output-dir",
    tmpDir,
    "--create-dirs",
    url,
  ]);
  if (!dl.ok) return { ok: false, error: `Download failed: ${dl.stderr}` };

  const unzip = await exec([
    "unzip",
    "-o",
    `${tmpDir}/vsphere-plugin.zip`,
    "-d",
    tmpDir,
  ]);
  if (!unzip.ok) return { ok: false, error: `Unzip failed: ${unzip.stderr}` };

  const mv = await exec([
    "sudo",
    "sh",
    "-c",
    `mv -v ${tmpDir}/bin/* /usr/local/bin/ && chmod +x /usr/local/bin/kubectl-vsphere /usr/local/bin/vcf 2>/dev/null; true`,
  ]);
  if (!mv.ok) return { ok: false, error: `Install failed: ${mv.stderr}` };

  await exec(["rm", "-rf", tmpDir]);

  return { ok: true };
}
