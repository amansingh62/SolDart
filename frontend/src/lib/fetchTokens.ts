// lib/fetchTokens.ts
const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImIyODBiMTkyLWUzYzAtNDI0My05NDdjLWMzZGZkMDlhYWFiMSIsIm9yZ0lkIjoiNDQzMzUwIiwidXNlcklkIjoiNDU2MTUzIiwidHlwZUlkIjoiNzgyYjI3NjUtMmVjZS00OGY2LTg0YTYtYjU0MTFkYTMxYjE3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDUzODI0NDUsImV4cCI6NDkwMTE0MjQ0NX0.I8rIqjHKKPoDesjLWEf-l5Tsj2LghAR14ggIJ8_pcLY'; // IMPORTANT: replace with process.env.NEXT_PUBLIC_MORALIS_API_KEY in production

export interface Token {
  name: string;
  symbol: string;
  address: string;
  logo: string;
  liquidity: number;
  fullyDilutedValuation: number;
}

export const fetchTokensFromMoralis = async (): Promise<Token[]> => {
    try {
      const response = await fetch('https://solana-gateway.moralis.io/token/mainnet/exchange/pumpfun/graduated?limit=5', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': MORALIS_API_KEY,
        },
      });
  
      const data = await response.json();
  
      return (data.result || []).map((token: any) => ({
        name: token.name || '',
        symbol: token.symbol || '',
        address: token.address || '',
        logo: token.logoURI || `https://ui-avatars.com/api/?name=${token.symbol}&background=random`,
        liquidity: token.liquidity || 0,
        fullyDilutedValuation: token.fullyDilutedValuation || 0,
      }));
    } catch (error) {
      console.error('Error fetching tokens from Moralis:', error);
      return [];
    }
  };
  
  