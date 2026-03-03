import React, { useState } from "react";
import { Box } from "ink";
import { Header } from "./components/Header.tsx";
import { MainMenu } from "./components/MainMenu.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { ToolCheck } from "./screens/ToolCheck.tsx";
import { ConnectScreen } from "./screens/Connect.tsx";
import { HarborSetupScreen } from "./screens/HarborSetup.tsx";
import { ClusterInfoScreen } from "./screens/ClusterInfo.tsx";
import { createInitialState } from "./lib/state.ts";
import type { Screen, ConnectionState, HarborState } from "./lib/state.ts";

export function App() {
  const [state, setState] = useState(createInitialState);

  const setScreen = (screen: Screen) => {
    setState((prev) => ({ ...prev, screen }));
  };

  const updateConnection = (partial: Partial<ConnectionState>) => {
    setState((prev) => ({
      ...prev,
      connection: { ...prev.connection, ...partial },
    }));
  };

  const updateHarbor = (partial: Partial<HarborState>) => {
    setState((prev) => ({
      ...prev,
      harbor: { ...prev.harbor, ...partial },
    }));
  };

  const goHome = () => setScreen("menu");

  const renderScreen = () => {
    switch (state.screen) {
      case "tools":
        return <ToolCheck onBack={goHome} />;
      case "connect":
        return (
          <ConnectScreen
            connection={state.connection}
            onUpdate={updateConnection}
            onBack={goHome}
          />
        );
      case "harbor":
        return (
          <HarborSetupScreen
            harbor={state.harbor}
            connection={state.connection}
            onUpdate={updateHarbor}
            onBack={goHome}
          />
        );
      case "cluster-info":
        return <ClusterInfoScreen onBack={goHome} />;
      default:
        return (
          <MainMenu
            onSelect={setScreen}
            connected={state.connection.connected}
          />
        );
    }
  };

  return (
    <Box flexDirection="column">
      <Header />
      {renderScreen()}
      <StatusBar connection={state.connection} harbor={state.harbor} />
    </Box>
  );
}
