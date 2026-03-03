import React from "react";
import { Box, Text } from "ink";
import { colors } from "./theme.tsx";

export function Header() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="column">
        <Text color={colors.primary}>  {"  "}┬  ┬┬┌─┌─┐  ┌─┐┌─┐┌┬┐┬ ┬┌─┐</Text>
        <Text color={colors.accent}>  {"  "}└┐┌┘├┴┐└─┐  └─┐├┤  │ │ │├─┘</Text>
        <Text color={colors.info}>  {"  "} └┘ ┴ ┴└─┘  └─┘└─┘ ┴ └─┘┴  </Text>
      </Box>
      <Box marginTop={0}>
        <Text color={colors.muted}>  {"  "}vSphere Kubernetes Service Configurator</Text>
        <Text color={colors.dim}> {"  "}v0.1.0</Text>
      </Box>
      <Text color={colors.dim}>  {"─".repeat(48)}</Text>
    </Box>
  );
}
