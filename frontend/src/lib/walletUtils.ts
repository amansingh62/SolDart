import axios from 'axios';
import { toast } from 'react-hot-toast';

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
export async function connectWallet(walletType: string, silentMode: boolean = false): Promise<string> {
  try {
    // Check if the wallet is installed
    const provider = getWalletProvider(walletType);
    if (!provider) {
      throw new Error(`${walletType} wallet not found. Please install the extension.`);
    }

    // Check if already connected first
    if (provider.isConnected && provider.publicKey) {
      console.log(`${walletType} wallet is already connected with public key:`, provider.publicKey.toString());
      return provider.publicKey.toString();
    }

    // Request connection to the wallet
    let response;
    switch (walletType) {
      case 'phantom':
        response = await connectPhantomWallet(provider, silentMode);
        break;
      case 'solflare':
        response = await connectSolflareWallet(provider, silentMode);
        break;
      case 'backpack':
        response = await connectBackpackWallet(provider, silentMode);
        break;
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }

    // At this point, the user has confirmed in their wallet extension
    return response.publicKey.toString();
  } catch (error: any) {
    console.error(`Error connecting to ${walletType} wallet:`, error);
    if (!silentMode) {
      toast.error(error.message || `Failed to connect to ${walletType} wallet`);
    }
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

    // Different wallets may have different disconnect methods
    switch (walletType) {
      case 'phantom':
      case 'solflare':
      case 'backpack':
        if (typeof provider.disconnect === 'function') {
          await provider.disconnect();
        }
        break;
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
    
    // Clean up any cookies related to wallet connection
    document.cookie.split(';').forEach((c) => {
      const cookieName = c.trim().split('=')[0];
      if (cookieName.includes('wallet') || cookieName.includes('solana')) {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    
    toast.success(`Disconnected from ${walletType} wallet`);
  } catch (error: any) {
    console.error(`Error disconnecting from ${walletType} wallet:`, error);
    toast.error(error.message || `Failed to disconnect from ${walletType} wallet`);
    throw error;
  }
}

/**
 * Get the wallet provider from the window object
 * @param walletType The type of wallet to get the provider for
 * @returns The wallet provider or null if not found
 */
function getWalletProvider(walletType: string): any {
  if (typeof window === 'undefined') return null;
  
  switch (walletType) {
    case 'phantom':
      return window.phantom?.solana;
    case 'solflare':
      return window.solflare;
    case 'backpack':
      return window.backpack?.solana;
    default:
      return null;
  }
}

/**
 * Connect to Phantom wallet
 * @param provider The Phantom wallet provider
 * @param silentMode If true, will not force signature for already connected wallets
 * @returns The connection response
 */
async function connectPhantomWallet(provider: any, silentMode: boolean = false) {
  try {
    // First check if already connected
    const isConnected = provider.isConnected;
    
    // If already connected and in silent mode, just return the public key
    if (isConnected && silentMode) {
      console.log('Phantom wallet already connected, using existing connection');
      const publicKey = provider.publicKey;
      return { publicKey };
    }
    // If already connected but not in silent mode, force the user to sign a message to verify ownership
    else if (isConnected) {
      // We'll sign a dummy message to force the wallet UI to open
      const message = new TextEncoder().encode(`Welcome to SolDart: ${new Date().toISOString()}`);
      const signedMessage = await provider.signMessage(message, 'utf8');
      
      // Get the connected public key
      const publicKey = provider.publicKey;
      return { publicKey };
    } else {
      // Not connected, so connect first
      console.log('Connecting to Phantom wallet...');
      const resp = await provider.connect({
        onlyIfTrusted: silentMode // Only use trusted connections in silent mode
      });
      
      // Optionally sign a message after connect for extra verification (skip in silent mode)
      if (!silentMode) {
        const message = new TextEncoder().encode(`Welcome to SolDart: ${new Date().toISOString()}`);
        await provider.signMessage(message, 'utf8');
      }
      
      return resp;
    }
  } catch (err) {
    console.error('Phantom connection error:', err);
    throw new Error('Failed to connect to Phantom wallet. Please approve the connection in your wallet extension.');
  }
}

/**
 * Connect to Solflare wallet
 * @param provider The Solflare wallet provider
 * @param silentMode If true, will not force signature for already connected wallets
 * @returns The connection response
 */
async function connectSolflareWallet(provider: any, silentMode: boolean = false) {
  try {
    // Check if already connected
    if (provider.isConnected && silentMode) {
      console.log('Solflare wallet already connected, using existing connection');
      return { publicKey: provider.publicKey };
    }
    
    // Similar approach as Phantom
    console.log('Connecting to Solflare wallet...');
    const resp = await provider.connect({ onlyIfTrusted: silentMode });
    
    // Force a signature to ensure wallet UI opens (skip in silent mode)
    if (!silentMode) {
      const message = new TextEncoder().encode(`Welcome to SolDart: ${new Date().toISOString()}`);
      await provider.signMessage(message);
    }
    
    return resp;
  } catch (err) {
    console.error('Solflare connection error:', err);
    throw new Error('Failed to connect to Solflare wallet. Please approve the connection in your wallet extension.');
  }
}

/**
 * Connect to Backpack wallet
 * @param provider The Backpack wallet provider
 * @param silentMode If true, will not force signature for already connected wallets
 * @returns The connection response
 */
async function connectBackpackWallet(provider: any, silentMode: boolean = false) {
  try {
    // Check if already connected
    if (provider.isConnected && silentMode) {
      console.log('Backpack wallet already connected, using existing connection');
      return { publicKey: provider.publicKey };
    }
    
    // Similar approach as Phantom
    console.log('Connecting to Backpack wallet...');
    const resp = await provider.connect({ onlyIfTrusted: silentMode });
    
    // Force a signature to ensure wallet UI opens (skip in silent mode)
    if (!silentMode) {
      const message = new TextEncoder().encode(`Welcome to SolDart: ${new Date().toISOString()}`);
      await provider.signMessage(message);
    }
    
    return resp;
  } catch (err) {
    console.error('Backpack connection error:', err);
    throw new Error('Failed to connect to Backpack wallet. Please approve the connection in your wallet extension.');
  }
}

/**
 * Associate a wallet with a user account
 * @param walletType The type of wallet
 * @param walletAddress The wallet address
 */
// lib/walletUtils.js
export const connectWalletToAccount = async (walletType: string, walletAddress: string) => {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/wallet/connect-account`,
      { walletType, walletAddress },
      { withCredentials: true }
    );
    
    if (response.data.success) {
      console.log("Wallet connected to account:", response.data);
      return response.data.wallet;
    } else {
      throw new Error(response.data.message || "Failed to connect wallet to account");
    }
  } catch (error) {
    console.error("Error connecting wallet to account:", error);
    throw error;
  }
};

/**
 * Shorten a wallet address for display
 * @param address The full wallet address
 * @returns The shortened address
 */
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

export function shortenWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
}

// Add TypeScript declarations for wallet providers
declare global {
  interface Window {
    phantom?: {
      solana?: any;
    };
    solflare?: any;
    backpack?: {
      solana?: any;
    };
  }
}