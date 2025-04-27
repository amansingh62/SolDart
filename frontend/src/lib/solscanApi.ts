import axios from 'axios';

export interface SolanaToken {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  rank: number;
}

// Function to fetch top Solana tokens directly from Solscan API
export const fetchTopSolanaTokens = async (): Promise<SolanaToken[]> => {
  try {
    // Use the Solscan API endpoint for token data
    const response = await axios.get('https://api.solscan.io/market', {
      params: {
        sortBy: 'marketCap',
        direction: 'desc',
        limit: 5,
        offset: 0
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://solscan.io',
        'Referer': 'https://solscan.io/'
      }
    });

    // Transform the Solscan API response to match our interface
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      return response.data.data.map((token: any, index: number) => ({
        id: index + 1,
        name: token.name || 'Unknown',
        symbol: token.symbol || 'UNKNOWN',
        slug: token.address || '',
        price: parseFloat(token.priceUst) || 0,
        percent_change_24h: parseFloat(token.priceChange24h) || 0,
        market_cap: parseFloat(token.marketCapFD) || 0,
        volume_24h: parseFloat(token.volume24h) || 0,
        rank: index + 1
      }));
    }
    
    // If the API response format is unexpected, try the fallback endpoint
    return await fetchFromFallbackEndpoint();
  } catch (error) {
    console.error('Error fetching top Solana tokens from Solscan API:', error);
    // Try the fallback endpoint if the primary one fails
    return await fetchFromFallbackEndpoint();
  }
};

// Fallback function to fetch from our Next.js API route
async function fetchFromFallbackEndpoint(): Promise<SolanaToken[]> {
  try {
    const response = await axios.get('/api/solana-tokens');
    return response.data;
  } catch (error) {
    console.error('Error fetching from fallback endpoint:', error);
    return [];
  }
}