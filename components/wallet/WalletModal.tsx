"use client";

import { useEffect, useMemo } from "react";
import { useWalletStore } from "@/lib/store/walletStore";
import { WalletModalErrorBoundary } from "./WalletModalErrorBoundary";
import { X } from "lucide-react";

export interface WalletModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onConnectWallet?: () => void;
  onConnected?: (address: string) => void | Promise<void>;
}

function WalletConnectOptions() {
  const connect = useWalletStore((s) => s.connect);
  const connectError = useWalletStore((s) => s.connectError);
  const clearConnectError = useWalletStore((s) => s.clearConnectError);

  const handleFreighterClick = async () => {
    clearConnectError();
    try {
      await connect("freighter");
    } catch (e) {
      console.error("Freighter connection failed", e);
    }
  };

  const handleWalletConnectClick = async () => {
    clearConnectError();
    try {
      await connect("walletconnect");
    } catch (e) {
      console.error("WalletConnect failed", e);
    }
  };

  return (
    <div className="space-y-2">
      {connectError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive mb-3">
          {connectError.message}
        </div>
      )}
      <button
        type="button"
        onClick={handleFreighterClick}
        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700"
      >
        <span>Freighter Wallet</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
          Stellar
        </span>
      </button>

      <button
        type="button"
        onClick={handleWalletConnectClick}
        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-gray-700"
      >
        <span>WalletConnect</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
          Universal
        </span>
      </button>
    </div>
  );
}

export function WalletModal({ isOpen = true, onClose, onConnectWallet }: WalletModalProps) {
  const walletModalOpen = useWalletStore((s) => s.walletModalOpen);
  const setWalletModalOpen = useWalletStore((s) => s.setWalletModalOpen);

  useEffect(() => {
    if (isOpen !== undefined && isOpen !== walletModalOpen) {
      setWalletModalOpen(isOpen);
    }
  }, [isOpen, walletModalOpen, setWalletModalOpen]);

  const handleClose = () => {
    setWalletModalOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            Connect Wallet
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            Select a secure provider endpoint to synchronize your ledger state.
          </p>

          <WalletModalErrorBoundary onRetry={() => {}}>
            <WalletConnectOptions />
          </WalletModalErrorBoundary>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
