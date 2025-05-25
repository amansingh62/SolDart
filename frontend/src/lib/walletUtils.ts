import axios from 'axios';
import { toast } from 'react-hot-toast';

// Type definitions for wallet providers
interface PublicKey {
  toString(): string;
}

interface WalletConnectionResponse {
  publicKey: PublicKey;
}

interface PhantomProvider {
  isConnected: boolean;
  publicKey?: PublicKey;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<WalletConnectionResponse>;
  disconnect(): Promise<void>;
}

interface SolflareProvider {
  isConnected: boolean;
  publicKey?: PublicKey;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<WalletConnectionResponse>;
  disconnect?(): Promise<void>;
}

interface BackpackProvider {
  isConnected: boolean;
  publicKey?: PublicKey;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<WalletConnectionResponse>;
  disconnect?(): Promise<void>;
}

type WalletProvider = PhantomProvider | SolflareProvider | BackpackProvider;

/**
 * Check if a wallet extension is installed
 * @param walletType The type of wallet to check (phantom, solflare, backpack)
 * @returns True if the wallet is installed, false otherwise
 */
export function checkWalletInstalled(walletType: string): boolean {
  const provider = getWalletProvider(walletType);
  return !!provider;
}

/**
 * Connect to a wallet provider
 * @param walletType The type of wallet to connect to (phantom, solflare, backpack)
 * @returns The wallet address
 */
export async function connectWallet(walletType: string): Promise<string> {
  try {
    const provider = getWalletProvider(walletType);
    if (!provider) {
      throw new Error(`${walletType} wallet not found. Please install the extension.`);
    }

    // For Phantom wallet, we need to use the correct API
    if (walletType === 'phantom') {
      try {
        // First check if already connected
        if (window.phantom?.solana?.isConnected) {
          // Force disconnect
          await window.phantom.solana.disconnect();
          // Wait a bit to ensure disconnect is complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Force showing the connect popup even if trusted
        const resp = await window.phantom?.solana?.connect({ onlyIfTrusted: false });
        if (!resp?.publicKey) {
          throw new Error('Failed to get public key from wallet');
        }
        return resp.publicKey.toString();
      } catch (error) {
        console.error('Phantom wallet connection error:', error);
        throw error;
      }
    }

    // For other wallets, use the standard connection
    const response = await provider.connect({ onlyIfTrusted: false });
    if (!response.publicKey) {
      throw new Error('Failed to get public key from wallet');
    }
    return response.publicKey.toString();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : `Failed to connect to ${walletType} wallet`;
    console.error(`Error connecting to ${walletType} wallet:`, error);
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Disconnect from a wallet
 * @param walletType The type of wallet to disconnect from
 */
export async function disconnectWallet(walletType: string): Promise<void> {
  try {
    const provider = getWalletProvider(walletType);
    if (!provider) {
      throw new Error(`${walletType} wallet not found.`);
    }

    if (walletType === 'phantom') {
      // For Phantom, we need to use the correct disconnect method
      if (window.phantom?.solana?.isConnected) {
        await window.phantom.solana.disconnect();
        // Clear any stored connection data
        localStorage.removeItem('connectedWalletInfo');
      }
    } else if (typeof provider.disconnect === 'function') {
      await provider.disconnect();
    }

    toast.success(`Disconnected from ${walletType} wallet`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : `Failed to disconnect from ${walletType} wallet`;
    console.error(`Error disconnecting from ${walletType} wallet:`, error);
    toast.error(errorMessage);
    throw error;
  }
}

/**
 * Get the wallet provider from the window object
 * @param walletType The type of wallet to get the provider for
 * @returns The wallet provider or null if not found
 */
function getWalletProvider(walletType: string): WalletProvider | null {
  if (typeof window === 'undefined') return null;

  switch (walletType) {
    case 'phantom':
      return window.phantom?.solana || null;
    case 'solflare':
      return window.solflare || null;
    case 'backpack':
      return window.backpack?.solana || null;
    default:
      return null;
  }
}

/**
 * Associate a wallet with a user account
 * @param walletType The type of wallet
 * @param walletAddress The wallet address
 */
export const connectWalletToAccount = async (walletType: string, walletAddress: string) => {
  try {
    // Get the user's current wallet address from localStorage
    const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
    if (storedWalletInfo) {
      const userData = JSON.parse(storedWalletInfo);
      if (userData.walletAddress && userData.walletAddress !== walletAddress) {
        throw new Error('Please connect with your registered wallet');
      }
    }

    // If wallet address matches or no wallet is registered, proceed with connection
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/wallet/connect-account`,
      { walletType, walletAddress },
      { withCredentials: true }
    );

    if (response.data.success) {
      console.log("Wallet connected to account:", response.data);
      return response.data.walletAddress;
    } else {
      throw new Error(response.data.message || "Failed to connect wallet to account");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet to account";
    console.error("Error connecting wallet to account:", error);
    toast.error(errorMessage);
    throw error;
  }
};

/**
 * Check if a wallet is already connected
 * @param walletType The type of wallet to check
 * @returns The wallet address if connected, null otherwise
 */
export function checkWalletConnection(walletType: string): string | null {
  try {
    const provider = getWalletProvider(walletType);
    if (!provider) {
      console.log(`${walletType} wallet provider not found`);
      return null;
    }

    if (provider.isConnected && provider.publicKey) {
      console.log(`${walletType} wallet is already connected`);
      return provider.publicKey.toString();
    }

    console.log(`${walletType} wallet is not connected`);
    return null;
  } catch (error) {
    console.error(`Error checking ${walletType} wallet connection:`, error);
    return null;
  }
}

/**
 * Shorten a wallet address for display
 * @param address The full wallet address
 * @returns The shortened address
 */
export function shortenWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

/**
 * Verify if the connected wallet is registered for the user
 * @returns {Promise<boolean>} True if the wallet is registered, false otherwise
 */
export const verifyRegisteredWallet = async (): Promise<boolean> => {
  try {
    // Get the connected wallet info
    const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
    if (!storedWalletInfo) {
      return false;
    }

    const walletInfo = JSON.parse(storedWalletInfo);
    const connectedWalletAddress = walletInfo.data?.address;

    // Get the user's registered wallet
    const userResponse = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/user`,
      { withCredentials: true }
    );

    if (!userResponse.data || !userResponse.data.walletAddress) {
      return false;
    }

    // Check if the connected wallet matches the user's registered wallet
    return userResponse.data.walletAddress === connectedWalletAddress;
  } catch (error) {
    console.error('Error verifying registered wallet:', error);
    return false;
  }
};

// Add TypeScript declarations for wallet providers
declare global {
  interface Window {
    phantom?: {
      solana?: PhantomProvider;
    };
    solflare?: SolflareProvider;
    backpack?: {
      solana?: BackpackProvider;
    };
  }
}