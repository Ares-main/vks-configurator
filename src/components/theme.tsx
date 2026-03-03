import React from "react";
import { Box, Text } from "ink";
import type { ReactNode } from "react";

// ── Color Palette ────────────────────────────────────────
export const colors = {
  primary: "#7aa2f7",    // soft blue
  accent: "#bb9af7",     // lavender
  success: "#9ece6a",    // green
  warning: "#e0af68",    // amber
  error: "#f7768e",      // rose
  info: "#2ac3de",       // teal
  muted: "#565f89",      // dim gray
  surface: "#24283b",    // dark surface
  text: "#c0caf5",       // light text
  dim: "#444b6a",        // dim border
} as const;

// ── Icons (Nerd Font / Unicode) ──────────────────────────
export const icons = {
  check: "✔",
  cross: "✘",
  arrow: "❯",
  dot: "●",
  circle: "○",
  wrench: "🔧",
  plug: "🔌",
  harbor: "🏗",
  cluster: "☸",
  back: "←",
  lock: "🔒",
  unlock: "🔓",
  pkg: "📦",
  key: "🔑",
  shield: "🛡",
  rocket: "🚀",
  refresh: "↻",
  info: "ℹ",
  warn: "⚠",
  chevron: "›",
} as const;

// ── Reusable Components ──────────────────────────────────

/** Screen title with icon and underline accent */
export function ScreenTitle({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        {icon && <Text>{icon}</Text>}
        <Text bold color={colors.primary}>{children}</Text>
      </Box>
      <Text color={colors.dim}>{"─".repeat(48)}</Text>
    </Box>
  );
}

/** Card-style panel with optional border */
export function Panel({
  children,
  borderColor,
  title,
  padding = 1,
}: {
  children: ReactNode;
  borderColor?: string;
  title?: string;
  padding?: number;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor ?? colors.dim}
      paddingX={padding}
      marginBottom={1}
    >
      {title && (
        <Box marginBottom={0}>
          <Text bold color={colors.accent}>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}

/** Inline key: value display */
export function Field({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box gap={1}>
      <Text color={colors.muted}>{label}</Text>
      <Text color={valueColor ?? colors.text}>{value}</Text>
    </Box>
  );
}

/** Status pill: colored dot + label */
export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Box gap={1}>
      <Text color={ok ? colors.success : colors.error}>{ok ? icons.dot : icons.circle}</Text>
      <Text color={ok ? colors.success : colors.muted}>{label}</Text>
    </Box>
  );
}

/** Hint text at the bottom */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <Box marginTop={1}>
      <Text color={colors.muted} dimColor>{children}</Text>
    </Box>
  );
}

/** Step result line for multi-step operations */
export function StepResult({ ok, label, error }: { ok: boolean; label: string; error?: string }) {
  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color={ok ? colors.success : colors.error}>
          {ok ? icons.check : icons.cross}
        </Text>
        <Text color={ok ? colors.text : colors.error}>{label}</Text>
      </Box>
      {error && (
        <Box marginLeft={3}>
          <Text color={colors.muted}>{error}</Text>
        </Box>
      )}
    </Box>
  );
}

/** Section divider with label */
export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <Box marginY={0}>
        <Text color={colors.dim}>── </Text>
        <Text color={colors.muted}>{label}</Text>
        <Text color={colors.dim}> {"─".repeat(Math.max(0, 40 - label.length))}</Text>
      </Box>
    );
  }
  return <Text color={colors.dim}>{"─".repeat(48)}</Text>;
}
