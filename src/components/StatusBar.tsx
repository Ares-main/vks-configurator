import React from "react";
import { Box, Text } from "ink";
import { colors, icons } from "./theme.tsx";
import type { ConnectionState, HarborState } from "../lib/state.ts";

interface Props {
  connection: ConnectionState;
  harbor: HarborState;
}

function Pill({ icon, label, value, ok }: { icon: string; label: string; value: string; ok: boolean }) {
  return (
    <Box gap={1}>
      <Text color={colors.muted}>{icon}</Text>
      <Text color={colors.muted}>{label}</Text>
      <Text color={ok ? colors.success : colors.warning}>{value}</Text>
    </Box>
  );
}

export function StatusBar({ connection, harbor }: Props) {
  return (
    <Box
      flexDirection="row"
      marginTop={1}
      paddingX={1}
      paddingY={0}
      gap={2}
    >
      <Text color={colors.dim}>│</Text>
      <Pill
        icon={icons.plug}
        label=""
        value={connection.connected ? connection.endpoint : "disconnected"}
        ok={connection.connected}
      />
      <Text color={colors.dim}>│</Text>
      <Pill
        icon={icons.cluster}
        label=""
        value={connection.currentContext || "no context"}
        ok={!!connection.currentContext}
      />
      <Text color={colors.dim}>│</Text>
      <Pill
        icon={icons.harbor}
        label=""
        value={harbor.configured ? harbor.address : "no registry"}
        ok={harbor.configured}
      />
      <Text color={colors.dim}>│</Text>
    </Box>
  );
}
