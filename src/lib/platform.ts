/**
 * Platform detection for cross-platform support.
 */

import { execSync } from "child_process";

export type Platform = "macos" | "arch" | "debian" | "unknown";

let _cached: Platform | null = null;

export function detectPlatform(): Platform {
  if (_cached) return _cached;

  const os = process.platform;

  if (os === "darwin") {
    _cached = "macos";
    return _cached;
  }

  if (os === "linux") {
    try {
      const release = execSync("cat /etc/os-release 2>/dev/null", {
        encoding: "utf-8",
      });
      if (/arch/i.test(release)) {
        _cached = "arch";
      } else if (/debian|ubuntu/i.test(release)) {
        _cached = "debian";
      } else {
        _cached = "unknown";
      }
    } catch {
      _cached = "unknown";
    }
    return _cached;
  }

  _cached = "unknown";
  return _cached;
}

/**
 * System cert trust store path by platform.
 */
export function systemCertDir(): string {
  const p = detectPlatform();
  switch (p) {
    case "macos":
      // macOS uses the Keychain, but for file-based trust:
      return "/usr/local/share/ca-certificates";
    case "arch":
      return "/etc/ca-certificates/trust-source/anchors";
    case "debian":
      return "/usr/local/share/ca-certificates";
    default:
      return "/usr/local/share/ca-certificates";
  }
}

/**
 * Command to update the system cert store after adding a cert.
 */
export function updateCertCmd(): string[] {
  const p = detectPlatform();
  switch (p) {
    case "macos":
      return ["security", "add-trusted-cert", "-d", "-r", "trustRoot"];
    case "arch":
      return ["sudo", "update-ca-trust"];
    case "debian":
      return ["sudo", "update-ca-certificates"];
    default:
      return ["sudo", "update-ca-certificates"];
  }
}
