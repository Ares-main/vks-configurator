import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Select, Spinner, PasswordInput } from "@inkjs/ui";
import { connect, switchContext, detectMode } from "../lib/connection.ts";
import type { ConnectionState } from "../lib/state.ts";
import { colors, icons, ScreenTitle, Panel, Field, Hint } from "../components/theme.tsx";

interface Props {
  connection: ConnectionState;
  onUpdate: (conn: Partial<ConnectionState>) => void;
  onBack: () => void;
}

type Phase =
  | "endpoint"
  | "username"
  | "password"
  | "options"
  | "connecting"
  | "success"
  | "context-select"
  | "error";

/** Progress indicator showing which step of the wizard we're on */
function WizardSteps({ current }: { current: number }) {
  const steps = ["Endpoint", "Username", "Password", "Options"];
  return (
    <Box gap={1} marginBottom={1}>
      {steps.map((s, i) => (
        <Box key={s} gap={0}>
          <Text color={i <= current ? colors.primary : colors.dim}>
            {i < current ? icons.check : i === current ? icons.arrow : icons.circle}
          </Text>
          <Text color={i <= current ? colors.text : colors.muted}> {s}</Text>
          {i < steps.length - 1 && <Text color={colors.dim}> {"─"} </Text>}
        </Box>
      ))}
    </Box>
  );
}

export function ConnectScreen({ connection, onUpdate, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("endpoint");
  const [endpoint, setEndpoint] = useState(connection.endpoint || "");
  const [username, setUsername] = useState(connection.username || "administrator@vsphere.local");
  const [password, setPassword] = useState("");
  const [insecureTls, setInsecureTls] = useState(true);
  const [mode, setMode] = useState<"vcf" | "legacy">(connection.mode);
  const [contexts, setContexts] = useState<string[]>([]);
  const [error, setError] = useState("");

  useInput((_input, key) => {
    if (key.escape) {
      if (phase === "endpoint") onBack();
      else if (phase === "username") setPhase("endpoint");
      else if (phase === "password") setPhase("username");
      else if (phase === "options") setPhase("password");
      else if (phase === "error" || phase === "success") onBack();
    }
  });

  const handleEndpoint = (value: string) => {
    setEndpoint(value);
    setPhase("username");
  };

  const handleUsername = (value: string) => {
    setUsername(value);
    setPhase("password");
  };

  const handlePassword = (value: string) => {
    setPassword(value);
    setPhase("options");
  };

  const handleOptionSelect = async (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }

    if (value === "toggle-tls") {
      setInsecureTls(!insecureTls);
      return;
    }

    if (value === "toggle-mode") {
      setMode(mode === "vcf" ? "legacy" : "vcf");
      return;
    }

    if (value === "connect") {
      setPhase("connecting");

      // Auto-detect mode if needed
      let useMode = mode;
      const detected = await detectMode();
      if (detected) useMode = detected;

      const result = await connect({
        endpoint,
        username,
        password,
        mode: useMode,
        insecureSkipTls: insecureTls,
      });

      if (result.ok) {
        setContexts(result.contexts);
        onUpdate({
          connected: true,
          endpoint,
          username,
          mode: useMode,
          availableContexts: result.contexts,
        });
        if (result.contexts.length > 1) {
          setPhase("context-select");
        } else {
          if (result.contexts.length === 1) {
            await switchContext(result.contexts[0]!);
            onUpdate({ currentContext: result.contexts[0]! });
          }
          setPhase("success");
        }
      } else {
        setError(result.error ?? "Connection failed");
        setPhase("error");
      }
    }
  };

  const handleContextSelect = async (value: string) => {
    if (value === "back") {
      setPhase("success");
      return;
    }
    await switchContext(value);
    onUpdate({ currentContext: value });
    setPhase("success");
  };

  if (phase === "endpoint") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.plug}>Connect to Supervisor / VKS</ScreenTitle>
        <WizardSteps current={0} />
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>Endpoint:</Text>
            <TextInput
              defaultValue={endpoint}
              placeholder="10.0.0.1 or supervisor.example.com"
              onSubmit={handleEndpoint}
            />
          </Box>
        </Panel>
        <Hint>Enter IP or FQDN {icons.chevron} Press Esc to go back</Hint>
      </Box>
    );
  }

  if (phase === "username") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.plug}>Connect to Supervisor / VKS</ScreenTitle>
        <WizardSteps current={1} />
        <Field label="Endpoint:" value={endpoint} valueColor={colors.info} />
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>Username:</Text>
            <TextInput
              defaultValue={username}
              placeholder="administrator@vsphere.local"
              onSubmit={handleUsername}
            />
          </Box>
        </Panel>
        <Hint>Press Esc to go back</Hint>
      </Box>
    );
  }

  if (phase === "password") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.plug}>Connect to Supervisor / VKS</ScreenTitle>
        <WizardSteps current={2} />
        <Field label="Endpoint:" value={endpoint} valueColor={colors.info} />
        <Field label="User:" value={username} valueColor={colors.text} />
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>{icons.key} Password:</Text>
            <PasswordInput
              placeholder="Enter password"
              onSubmit={handlePassword}
            />
          </Box>
        </Panel>
        <Hint>Press Esc to go back</Hint>
      </Box>
    );
  }

  if (phase === "options") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.plug}>Connect to Supervisor / VKS</ScreenTitle>
        <WizardSteps current={3} />
        <Panel title="Connection Summary">
          <Field label="Endpoint:" value={endpoint} valueColor={colors.info} />
          <Field label="User:" value={username} valueColor={colors.text} />
          <Field
            label={`${insecureTls ? icons.unlock : icons.lock} TLS:`}
            value={insecureTls ? "Skip verify (insecure)" : "Verify enabled"}
            valueColor={insecureTls ? colors.warning : colors.success}
          />
          <Field
            label="Mode:"
            value={mode === "vcf" ? "VCF CLI (vSphere 9+)" : "kubectl-vsphere (legacy)"}
            valueColor={colors.info}
          />
        </Panel>
        <Select
          options={[
            { label: `${icons.rocket}  Connect`, value: "connect" },
            {
              label: `${insecureTls ? icons.lock : icons.unlock}  Toggle TLS verify`,
              value: "toggle-tls",
            },
            {
              label: `${icons.refresh}  Toggle mode (${mode})`,
              value: "toggle-mode",
            },
            { label: `${icons.back}  Back to menu`, value: "back" },
          ]}
          onChange={handleOptionSelect}
        />
      </Box>
    );
  }

  if (phase === "connecting") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.plug}>Connecting</ScreenTitle>
        <Spinner label={`  Authenticating as ${username} to ${endpoint}...`} />
      </Box>
    );
  }

  if (phase === "context-select") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.check}>Connected!</ScreenTitle>
        <Panel borderColor={colors.success} title="Select a context">
          <Select
            options={[
              ...contexts.map((c) => ({ label: `${icons.chevron} ${c}`, value: c })),
              { label: `${icons.back}  Done`, value: "back" },
            ]}
            onChange={handleContextSelect}
          />
        </Panel>
      </Box>
    );
  }

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.cross}>Connection Failed</ScreenTitle>
        <Panel borderColor={colors.error}>
          <Text color={colors.error}>{error}</Text>
        </Panel>
        <Select
          options={[
            { label: `${icons.refresh}  Try again`, value: "retry" },
            { label: `${icons.back}  Back to menu`, value: "back" },
          ]}
          onChange={(v) => {
            if (v === "retry") setPhase("endpoint");
            else onBack();
          }}
        />
      </Box>
    );
  }

  // success
  return (
    <Box flexDirection="column">
      <ScreenTitle icon={icons.check}>Connected to {endpoint}</ScreenTitle>
      <Panel borderColor={colors.success} title="Session">
        {connection.currentContext && (
          <Field label="Context:" value={connection.currentContext} valueColor={colors.info} />
        )}
        {contexts.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={colors.muted}>Available contexts:</Text>
            {contexts.map((c) => (
              <Text key={c} color={colors.text}>  {icons.chevron} {c}</Text>
            ))}
          </Box>
        )}
      </Panel>
      <Select
        options={[
          ...(contexts.length > 1
            ? [{ label: `${icons.refresh}  Switch context`, value: "switch" }]
            : []),
          { label: `${icons.back}  Back to menu`, value: "back" },
        ]}
        onChange={(v) => {
          if (v === "switch") setPhase("context-select");
          else onBack();
        }}
      />
    </Box>
  );
}
