import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner, Select } from "@inkjs/ui";
import { checkAllTools, installWithPacman, downloadVspherePlugin } from "../lib/tools.ts";
import type { ToolStatus } from "../lib/tools.ts";
import { colors, icons, ScreenTitle, Panel, Hint } from "../components/theme.tsx";

interface Props {
  onBack: () => void;
}

type Phase = "checking" | "results" | "installing" | "download-prompt";

function ToolRow({ tool }: { tool: ToolStatus }) {
  const color = tool.found ? colors.success : tool.required ? colors.error : colors.warning;
  const icon = tool.found ? icons.check : icons.cross;
  const tag = tool.required ? "req" : "opt";
  return (
    <Box gap={1}>
      <Text color={color}>{icon}</Text>
      <Box width={28}>
        <Text color={tool.found ? colors.text : color}>{tool.name}</Text>
      </Box>
      <Text color={colors.dim}>[{tag}]</Text>
      {tool.found ? (
        <Text color={colors.muted}>{tool.version.slice(0, 40)}</Text>
      ) : (
        <Text color={colors.muted} dimColor>{tool.installHint}</Text>
      )}
    </Box>
  );
}

export function ToolCheck({ onBack }: Props) {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [phase, setPhase] = useState<Phase>("checking");
  const [installMsg, setInstallMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAllTools().then((results) => {
      setTools(results);
      setPhase("results");
    });
  }, []);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      onBack();
    }
  });

  const missing = tools.filter((t) => !t.found);
  const pacmanInstallable = missing.filter(
    (t) =>
      t.binary === "kubectl" ||
      t.binary === "docker" ||
      t.binary === "helm" ||
      t.binary === "openssl",
  );
  const vsphereTools = missing.filter(
    (t) => t.binary === "vcf" || t.binary === "kubectl-vsphere",
  );

  const handleInstallAction = async (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }
    if (value === "pacman" && pacmanInstallable.length > 0) {
      setPhase("installing");
      for (const tool of pacmanInstallable) {
        const pkg = tool.binary === "kubectl-vsphere" ? "" : tool.binary;
        if (!pkg) continue;
        setInstallMsg(`Installing ${tool.name}...`);
        const ok = await installWithPacman(pkg);
        if (!ok) {
          setError(`Failed to install ${tool.name}`);
          setPhase("results");
          return;
        }
      }
      const results = await checkAllTools();
      setTools(results);
      setPhase("results");
      setInstallMsg("");
    }
    if (value === "download-vsphere") {
      setPhase("download-prompt");
    }
  };

  const handleDownload = async (value: string) => {
    if (value === "back") {
      setPhase("results");
      return;
    }
    setPhase("installing");
    setInstallMsg("Downloading vSphere plugin...");
    const result = await downloadVspherePlugin(value);
    if (!result.ok) {
      setError(result.error ?? "Download failed");
      setPhase("results");
      return;
    }
    const results = await checkAllTools();
    setTools(results);
    setPhase("results");
    setInstallMsg("");
  };

  if (phase === "checking") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.wrench}>Tool Check</ScreenTitle>
        <Spinner label="  Scanning for required tools..." />
      </Box>
    );
  }

  if (phase === "installing") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.pkg}>Installing</ScreenTitle>
        <Spinner label={`  ${installMsg}`} />
      </Box>
    );
  }

  if (phase === "download-prompt") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.pkg}>Download vSphere Plugin</ScreenTitle>
        <Panel borderColor={colors.warning}>
          <Text color={colors.warning}>{icons.info}  Downloads from https://&lt;addr&gt;/wcp/plugin/linux-amd64/vsphere-plugin.zip</Text>
          <Text color={colors.muted}>   Use the Connect screen to provide the Supervisor address first.</Text>
        </Panel>
        <Select
          options={[{ label: `${icons.back}  Back`, value: "back" }]}
          onChange={handleDownload}
        />
      </Box>
    );
  }

  const found = tools.filter((t) => t.found).length;
  const actionOptions: { label: string; value: string }[] = [];
  if (pacmanInstallable.length > 0) {
    actionOptions.push({
      label: `${icons.pkg}  Install via pacman (${pacmanInstallable.map((t) => t.binary).join(", ")})`,
      value: "pacman",
    });
  }
  if (vsphereTools.length > 0) {
    actionOptions.push({
      label: `${icons.plug}  Download VCF CLI from Supervisor`,
      value: "download-vsphere",
    });
  }
  actionOptions.push({ label: `${icons.back}  Back to menu`, value: "back" });

  return (
    <Box flexDirection="column">
      <ScreenTitle icon={icons.wrench}>Tool Check</ScreenTitle>

      <Panel title={`${found}/${tools.length} tools found`}>
        {tools.map((tool) => (
          <ToolRow key={tool.binary} tool={tool} />
        ))}
      </Panel>

      {error && (
        <Panel borderColor={colors.error}>
          <Text color={colors.error}>{icons.cross} {error}</Text>
        </Panel>
      )}

      {missing.length === 0 ? (
        <Box flexDirection="column">
          <Text color={colors.success}>{icons.check} All required tools are available</Text>
          <Box marginTop={1}>
            <Select
              options={[{ label: `${icons.back}  Back to menu`, value: "back" }]}
              onChange={() => onBack()}
            />
          </Box>
        </Box>
      ) : (
        <Select options={actionOptions} onChange={handleInstallAction} />
      )}

      <Hint>Press Esc or q to go back</Hint>
    </Box>
  );
}
