import axios from 'axios';

export interface SolanaTrendingCoin {
  mintAddress: string;
  name: string;
  symbol: string;
  marketcap: number;
  fungible: boolean;
  decimals: number;
  price: number;
  volume24h: number;
  priceChange24h: number;
}

// Function to fetch trending Solana coins from our API
export const fetchTrendingSolanaCoins = async (): Promise<SolanaTrendingCoin[]> => {
  try {
    // This request will be made to our backend API which handles the Moralis API call
    const response = await axios.get('/api/solana-trending');

    // Check if the response contains an error
    if (response.data && response.data.error) {
      console.error('API returned an error:', response.data.error);
      return [];
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching trending Solana coins:', error);
    return [];
  }
};

// Format price with appropriate precision
export const formatPrice = (price: number): string => {
  if (price < 0.01) return '$' + price.toFixed(6);
  if (price < 1) return '$' + price.toFixed(4);
  if (price < 10) return '$' + price.toFixed(2);
  if (price < 1000) return '$' + price.toFixed(2);
  return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Format market cap in millions/billions
export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1000000000) {
    return '$' + (marketCap / 1000000000).toFixed(2) + 'B';
  } else if (marketCap >= 1000000) {
    return '$' + (marketCap / 1000000).toFixed(2) + 'M';
  } else {
    return '$' + marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
};

// Format volume in millions/billions
export const formatVolume = (volume: number): string => {
  if (volume >= 1000000000) {
    return '$' + (volume / 1000000000).toFixed(2) + 'B';
  } else if (volume >= 1000000) {
    return '$' + (volume / 1000000).toFixed(2) + 'M';
  } else {
    return '$' + volume.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
};

// Format price change percentage
export const formatPriceChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};