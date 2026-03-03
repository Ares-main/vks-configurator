/**
 * Shell execution helpers wrapping Bun.spawn.
 */

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  ok: boolean;
}

/**
 * Run a command and capture output. Never throws — check `.ok` instead.
 */
export async function exec(
  cmd: string[],
  opts?: { env?: Record<string, string>; stdin?: string; timeout?: number },
): Promise<ExecResult> {
  try {
    const proc = Bun.spawn(cmd, {
      stdout: "pipe",
      stderr: "pipe",
      stdin: opts?.stdin ? "pipe" : undefined,
      env: { ...process.env, ...opts?.env },
    });

    if (opts?.stdin && proc.stdin) {
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(opts.stdin));
      await writer.close();
    }

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      ok: exitCode === 0,
    };
  } catch (err) {
    return {
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      ok: false,
    };
  }
}

/**
 * Check if a binary exists on PATH.
 */
export async function which(binary: string): Promise<string | null> {
  const result = await exec(["which", binary]);
  return result.ok ? result.stdout : null;
}

/**
 * Run a command and return stdout, or null on failure.
 */
export async function execStdout(cmd: string[]): Promise<string | null> {
  const result = await exec(cmd);
  return result.ok ? result.stdout : null;
}
