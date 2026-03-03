import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TextInput, Select, Spinner, PasswordInput } from "@inkjs/ui";
import { setupHarborCerts, dockerLogin, listHarborProjects, createImagePullSecret } from "../lib/harbor.ts";
import type { HarborSetupResult } from "../lib/harbor.ts";
import type { HarborState, ConnectionState } from "../lib/state.ts";
import { colors, icons, ScreenTitle, Panel, Field, StepResult, Hint } from "../components/theme.tsx";

interface Props {
  harbor: HarborState;
  connection: ConnectionState;
  onUpdate: (h: Partial<HarborState>) => void;
  onBack: () => void;
}

type Phase =
  | "address"
  | "cert-setup"
  | "cert-done"
  | "login-user"
  | "login-pass"
  | "logging-in"
  | "logged-in"
  | "pull-secret"
  | "done"
  | "error";

export function HarborSetupScreen({ harbor, connection, onUpdate, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>(harbor.configured ? "done" : "address");
  const [address, setAddress] = useState(harbor.address || "");
  const [steps, setSteps] = useState<HarborSetupResult[]>([]);
  const [harborUser, setHarborUser] = useState("admin");
  const [harborPass, setHarborPass] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [installSystemCert, setInstallSystemCert] = useState(false);

  useInput((_input, key) => {
    if (key.escape) {
      if (phase === "address") onBack();
      else if (phase === "done" || phase === "error") onBack();
    }
  });

  const handleAddress = (value: string) => {
    setAddress(value);
    setPhase("cert-setup");
    runCertSetup(value);
  };

  const runCertSetup = async (addr: string) => {
    const result = await setupHarborCerts(addr, { systemCert: installSystemCert });
    setSteps(result.steps);
    if (result.ok) {
      onUpdate({ address: addr, configured: true });
      setPhase("cert-done");
    } else {
      setError(result.steps.find((s) => !s.ok)?.error ?? "Certificate setup failed");
      setPhase("error");
    }
  };

  const handleLoginUser = (value: string) => {
    setHarborUser(value);
    setPhase("login-pass");
  };

  const handleLoginPass = async (value: string) => {
    setHarborPass(value);
    setPhase("logging-in");

    const result = await dockerLogin(address, harborUser, value);
    if (result.ok) {
      onUpdate({ loggedIn: true });

      // Try to list projects
      const projResult = await listHarborProjects(address, harborUser, value);
      if (projResult.ok) {
        setProjects(projResult.projects);
      }
      setPhase("logged-in");
    } else {
      setError(result.error ?? "Login failed");
      setPhase("error");
    }
  };

  const handlePullSecret = async (value: string) => {
    if (value === "skip" || value === "back") {
      setPhase("done");
      return;
    }

    if (value === "create") {
      const ns = connection.namespace || "default";
      const result = await createImagePullSecret(
        "harbor-registry",
        ns,
        address,
        harborUser,
        harborPass,
      );
      if (!result.ok) {
        setError(result.error ?? "Failed to create pull secret");
      }
      setPhase("done");
    }
  };

  if (phase === "address") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.harbor}>Harbor Registry Setup</ScreenTitle>
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>Registry address:</Text>
            <TextInput
              defaultValue={address}
              placeholder="harbor.example.com"
              onSubmit={handleAddress}
            />
          </Box>
        </Panel>
        <Hint>Enter IP or FQDN {icons.chevron} Press Esc to go back</Hint>
      </Box>
    );
  }

  if (phase === "cert-setup") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.shield}>Certificate Setup</ScreenTitle>
        <Spinner label={`  Fetching certificates from ${address}...`} />
        <Box flexDirection="column" marginTop={1}>
          {steps.map((s, i) => (
            <StepResult key={i} ok={s.ok} label={s.step} error={s.error} />
          ))}
        </Box>
      </Box>
    );
  }

  if (phase === "cert-done") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.shield}>Certificates Configured</ScreenTitle>
        <Panel borderColor={colors.success} title={address}>
          {steps.map((s, i) => (
            <StepResult key={i} ok={s.ok} label={s.step} />
          ))}
        </Panel>
        <Select
          options={[
            { label: `${icons.key}  Login to Harbor`, value: "login" },
            { label: `${icons.back}  Back to menu`, value: "back" },
          ]}
          onChange={(v) => {
            if (v === "login") setPhase("login-user");
            else onBack();
          }}
        />
      </Box>
    );
  }

  if (phase === "login-user") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.key}>Harbor Login</ScreenTitle>
        <Field label="Registry:" value={address} valueColor={colors.info} />
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>Username:</Text>
            <TextInput
              defaultValue={harborUser}
              placeholder="admin"
              onSubmit={handleLoginUser}
            />
          </Box>
        </Panel>
      </Box>
    );
  }

  if (phase === "login-pass") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.key}>Harbor Login</ScreenTitle>
        <Field label="Registry:" value={address} valueColor={colors.info} />
        <Field label="User:" value={harborUser} valueColor={colors.text} />
        <Panel>
          <Box gap={1}>
            <Text color={colors.accent}>{icons.lock} Password:</Text>
            <PasswordInput
              placeholder="Enter Harbor password"
              onSubmit={handleLoginPass}
            />
          </Box>
        </Panel>
      </Box>
    );
  }

  if (phase === "logging-in") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.key}>Harbor Login</ScreenTitle>
        <Spinner label={`  Authenticating with ${address}...`} />
      </Box>
    );
  }

  if (phase === "logged-in") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.check}>Harbor Connected</ScreenTitle>
        {projects.length > 0 && (
          <Panel title="Projects">
            {projects.map((p) => (
              <Text key={p} color={colors.text}>  {icons.chevron} {p}</Text>
            ))}
          </Panel>
        )}
        {connection.connected ? (
          <Select
            options={[
              { label: `${icons.shield}  Create image pull secret`, value: "create" },
              { label: `${icons.back}  Skip`, value: "skip" },
            ]}
            onChange={handlePullSecret}
          />
        ) : (
          <Select
            options={[{ label: `${icons.back}  Back to menu`, value: "back" }]}
            onChange={() => onBack()}
          />
        )}
      </Box>
    );
  }

  if (phase === "error") {
    return (
      <Box flexDirection="column">
        <ScreenTitle icon={icons.cross}>Error</ScreenTitle>
        <Panel borderColor={colors.error}>
          <Text color={colors.error}>{error}</Text>
        </Panel>
        <Select
          options={[
            { label: `${icons.refresh}  Try again`, value: "retry" },
            { label: `${icons.back}  Back to menu`, value: "back" },
          ]}
          onChange={(v) => {
            if (v === "retry") setPhase("address");
            else onBack();
          }}
        />
      </Box>
    );
  }

  // done
  return (
    <Box flexDirection="column">
      <ScreenTitle icon={icons.harbor}>Harbor Registry</ScreenTitle>
      <Panel borderColor={colors.success} title="Configuration">
        <Field label="Address:" value={address} valueColor={colors.info} />
        <Field
          label="Docker login:"
          value={harbor.loggedIn ? "authenticated" : "not logged in"}
          valueColor={harbor.loggedIn ? colors.success : colors.warning}
        />
      </Panel>
      <Select
        options={[
          { label: `${icons.refresh}  Reconfigure`, value: "reconfig" },
          { label: `${icons.back}  Back to menu`, value: "back" },
        ]}
        onChange={(v) => {
          if (v === "reconfig") {
            setPhase("address");
            onUpdate({ configured: false, loggedIn: false, address: "" });
          } else {
            onBack();
          }
        }}
      />
    </Box>
  );
}
