import React from "react";
import { Box, Text } from "ink";
import { Select } from "@inkjs/ui";
import { colors, icons, Hint } from "./theme.tsx";
import type { Screen } from "../lib/state.ts";

interface Props {
  onSelect: (screen: Screen) => void;
  connected: boolean;
}

export function MainMenu({ onSelect, connected }: Props) {
  const options = [
    { label: `${icons.wrench}  Check & Install Tools`, value: "tools" as Screen },
    { label: `${icons.plug}  Connect to Supervisor / VKS`, value: "connect" as Screen },
    { label: `${icons.harbor}  Configure Harbor Registry`, value: "harbor" as Screen },
    ...(connected
      ? [{ label: `${icons.cluster}  Cluster Info & Dashboard`, value: "cluster-info" as Screen }]
      : []),
  ];

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={colors.text}>Select an action</Text>
      </Box>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={colors.dim}
        paddingX={1}
      >
        <Select options={options} onChange={onSelect} />
      </Box>
      <Hint>Navigate with ↑↓ · Enter to select · Ctrl+C to exit</Hint>
    </Box>
  );
}
