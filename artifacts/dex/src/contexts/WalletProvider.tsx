import React from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { useTheme } from "./ThemeContext";

const DARK_OVERRIDES = `
  .modal-card,
  .dynamic-widget-modal,
  .dynamic-widget__container,
  .account-control__container,
  .account-control__wallet-container,
  .wallet-book__container,
  .dynamic-footer,
  .network-control__container,
  .transaction-confirm__container,
  .dynamic-user-profile,
  .dynamic-shadow-dom-content {
    background-color: #0d0d0d !important;
    background: #0d0d0d !important;
  }
  .modal {
    background: rgba(0,0,0,0.75) !important;
  }
`;

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  const settings = React.useMemo(() => ({
    environmentId: "b64ba473-3830-4799-9a51-dce3c18b33be",
    walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
    cssOverrides: isDark ? DARK_OVERRIDES : "",
  }), [isDark]);

  return (
    <DynamicContextProvider
      theme={isDark ? "dark" : "light"}
      settings={settings}
    >
      {children}
    </DynamicContextProvider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}
