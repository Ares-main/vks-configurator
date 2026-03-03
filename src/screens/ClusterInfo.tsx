import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Spinner, Select } from "@inkjs/ui";
import { execStdout } from "../lib/shell.ts";
import { colors, icons, ScreenTitle, Panel, Field, Hint } from "../components/theme.tsx";

interface Props {
  onBack: () => void;
}

interface ClusterData {
  namespaces: string;
  kubernetesReleases: string;
  vmClasses: string;
  storageClasses: string;
  clusters: string;
  currentContext: string;
}

type Phase = "loading" | "dashboard" | "deploy-test";

export function ClusterInfoScreen({ onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ClusterData | null>(null);
  const [error, setError] = useState("");
  const [deployResult, setDeployResult] = useState("");

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  useEffect(() => {
    loadClusterData();
  }, []);

  const loadClusterData = async () => {
    setPhase("loading");

    const [namespaces, kubernetesReleases, vmClasses, storageClasses, clusters, currentContext] =
      await Promise.all([
        execStdout(["kubectl", "get", "ns", "--no-headers", "-o", "custom-columns=NAME:.metadata.name"]),
        execStdout(["kubectl", "get", "kr", "--no-headers", "--ignore-not-found", "-o", "custom-columns=NAME:.metadata.name,VERSION:.spec.version,READY:.status.conditions[0].status"]).then(
          (r) => r ?? execStdout(["kubectl", "get", "tkr", "--no-headers", "--ignore-not-found", "-o", "custom-columns=NAME:.metadata.name,VERSION:.spec.version,READY:.status.conditions[0].status"]),
        ),
        execStdout(["kubectl", "get", "vmclass", "--no-headers", "--ignore-not-found", "-o", "custom-columns=NAME:.metadata.name,CPUS:.spec.hardware.cpus,MEMORY:.spec.hardware.memory"]),
        execStdout(["kubectl", "get", "sc", "--no-headers", "-o", "custom-columns=NAME:.metadata.name,PROVISIONER:.provisioner"]),
        execStdout(["kubectl", "get", "clusters", "--all-namespaces", "--no-headers", "--ignore-not-found", "-o", "custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,PHASE:.status.phase"]),
        execStdout(["kubectl", "config", "current-context"]),
      ]);

    setData({
      namespaces: namespaces ?? "Unable to fetch",
      kubernetesReleases: kubernetesReleases ?? "None found (kr/tkr not available)",
      vmClasses: vmClasses ?? "None found",
      storageClasses: storageClasses ?? "Unable to fetch",
      clusters: clusters ?? "None found",
      currentContext: currentContext ?? "unknown",
    });
    setPhase("dashboard");
  };

  const handleAction = async (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }
    if (value === "refresh") {
      await loadClusterData();
      return;
    }
    if (value === "test-pod") {
      setPhase("deploy-test");
      const result = await execStdout([
        "kubectl",
        "run",
        "vks-setup-test",
        "--image=nginx",
        "--restart=Never",
        "--dry-run=client",
        "-o",
        "yaml",
      ]);
      setDeployResult(
        result
          ? "Test pod YAML generated (dry-run). To actually deploy:\n  kubectl run vks-setup-test --image=nginx --restart=Never"
          : "Failed to generate test pod YAML",
      );
      setPhase("dashboard");
    }
  };

  if (phase === "loading") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.cluster}>Cluster Dashboard</ScreenTitle>
        <Spinner label="  Querying cluster resources..." />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.cross}>Cluster Dashboard</ScreenTitle>
        <Panel borderColor={colors.error}>
          <Text color={colors.error}>Failed to load cluster data</Text>
        </Panel>
        <Select
          options={[{ label: `${icons.back}  Back to menu`, value: "back" }]}
          onChange={() => onBack()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <ScreenTitle icon={icons.cluster}>Cluster Dashboard</ScreenTitle>
      <Field label="Context:" value={data.currentContext} valueColor={colors.info} />

      <Box flexDirection="column" marginY={1}>
        <Section title="Namespaces" content={data.namespaces} icon="○" />
        <Section title="Kubernetes Releases" content={data.kubernetesReleases} icon="○" />
        <Section title="VM Classes" content={data.vmClasses} icon="○" />
        <Section title="Storage Classes" content={data.storageClasses} icon="○" />
        <Section title="VKS Clusters" content={data.clusters} icon="○" />
      </Box>

      {deployResult && (
        <Panel borderColor={colors.info}>
          <Text color={colors.info}>{deployResult}</Text>
        </Panel>
      )}

      <Select
        options={[
          { label: `${icons.refresh}  Refresh`, value: "refresh" },
          { label: `${icons.rocket}  Generate test pod (dry-run)`, value: "test-pod" },
          { label: `${icons.back}  Back to menu`, value: "back" },
        ]}
        onChange={handleAction}
      />
      <Hint>Press Esc to go back</Hint>
    </Box>
  );
}

function Section({ title, content, icon }: { title: string; content: string; icon?: string }) {
  const lines = content.split("\n").filter(Boolean);
  const count = lines.length;
  return (
    <Panel title={`${icon ?? icons.chevron} ${title} (${count})`}>
      {count > 0 ? (
        lines.slice(0, 12).map((line, i) => (
          <Text key={i} color={colors.muted}>
            {"  "}{line}
          </Text>
        ))
      ) : (
        <Text color={colors.warning}>  (none)</Text>
      )}
      {count > 12 && (
        <Text color={colors.dim}>  ... and {count - 12} more</Text>
      )}
    </Panel>
  );
}
