/**
 * Simple reactive state store for the TUI app.
 */

export type Screen =
  | "menu"
  | "tools"
  | "connect"
  | "harbor"
  | "cluster-info";

export interface ConnectionState {
  connected: boolean;
  endpoint: string;
  username: string;
  mode: "vcf" | "legacy";
  currentContext: string;
  availableContexts: string[];
  namespace: string;
}

export interface HarborState {
  configured: boolean;
  address: string;
  loggedIn: boolean;
}

export interface AppState {
  screen: Screen;
  connection: ConnectionState;
  harbor: HarborState;
}

export function createInitialState(): AppState {
  return {
    screen: "menu",
    connection: {
      connected: false,
      endpoint: "",
      username: "administrator@vsphere.local",
      mode: "vcf",
      currentContext: "",
      availableContexts: [],
      namespace: "",
    },
    harbor: {
      configured: false,
      address: "",
      loggedIn: false,
    },
  };
}
