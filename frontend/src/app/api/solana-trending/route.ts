import { NextResponse } from 'next/server';
import axios from 'axios';

// Define the structure of a Solana trending coin response
interface SolanaTrendingCoin {
  mintAddress: string;
  name: string;
  symbol: string;
  marketcap: number;
  fungible: boolean;
  decimals: number;
  uri?: string;
}

// Define the structure that matches the example format
interface TokenSupplyUpdateResponse {
  Solana: {
    TokenSupplyUpdates: Array<{
      TokenSupplyUpdate: {
        Currency: {
          Decimals: number;
          Fungible: boolean;
          MintAddress: string;
          Name: string;
          Symbol: string;
          Uri?: string;
        };
        Marketcap: string;
      };
    }>;
  };
}

// GraphQL query to fetch trending Solana coins with 'pump' in their MintAddress
const TRENDING_COINS_QUERY = `
query MyQuery {
  Solana {
    TokenSupplyUpdates(
      where: {TokenSupplyUpdate_Currency_MintAddress: {_regex: "pump$"}}
      orderBy: { descendingByField: "TokenSupplyUpdate_Marketcap"}
      limitBy: {by: TokenSupplyUpdate_Currency_MintAddress, count: 1}
      limit: {count: 20}
    ) {
      TokenSupplyUpdate {
        Marketcap: PostBalanceInUSD
        Currency {
          Name
          Symbol
          MintAddress
          Fungible
          Decimals
          Uri
        }
      }
    }
  }
}
`;

const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImIyODBiMTkyLWUzYzAtNDI0My05NDdjLWMzZGZkMDlhYWFiMSIsIm9yZ0lkIjoiNDQzMzUwIiwidXNlcklkIjoiNDU2MTUzIiwidHlwZUlkIjoiNzgyYjI3NjUtMmVjZS00OGY2LTg0YTYtYjU0MTFkYTMxYjE3IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NDUzODI0NDUsImV4cCI6NDkwMTE0MjQ0NX0.I8rIqjHKKPoDesjLWEf-l5Tsj2LghAR14ggIJ8_pcLY';

export async function GET() {
  try {
    console.log('Fetching graduated tokens from Moralis API...');

    // Fetch graduated tokens from Moralis API
    const response = await axios.get('https://solana-gateway.moralis.io/token/v1/graduated-tokens', {
      params: {
        exchange: 'pumpfun',
        limit: 100
      },
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      }
    });

    console.log('Moralis API response:', JSON.stringify(response.data, null, 2));

    // Check if we have results
    if (!response.data || !response.data.result || !Array.isArray(response.data.result)) {
      console.error('Invalid response format from Moralis API');
      return NextResponse.json(
        { error: 'Invalid response format from Moralis API' },
        { status: 500 }
      );
    }

    // Transform the data to match our interface
    const transformedData = response.data.result.map((token: any) => ({
      mintAddress: token.mint,
      name: token.name,
      symbol: token.symbol,
      marketcap: token.marketCap || 0,
      fungible: true,
      decimals: token.decimals || 9,
      price: token.price || 0,
      volume24h: token.volume24h || 0,
      priceChange24h: token.priceChange24h || 0
    }));

    // Sort by market cap in descending order
    const sortedData = transformedData.sort((a: any, b: any) => b.marketcap - a.marketcap);

    console.log(`Transformed ${transformedData.length} tokens`);

    // If no tokens were found, provide fallback data
    if (sortedData.length === 0) {
      console.log('No tokens found, using fallback data');
      const fallbackData = [
        {
          mintAddress: 'So11111111111111111111111111111111111111112',
          name: 'Wrapped SOL',
          symbol: 'SOL',
          marketcap: 50000000000,
          fungible: true,
          decimals: 9,
          price: 150.25,
          volume24h: 1000000000,
          priceChange24h: 2.5
        },
        {
          mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          name: 'USD Coin',
          symbol: 'USDC',
          marketcap: 30000000000,
          fungible: true,
          decimals: 6,
          price: 1.0,
          volume24h: 5000000000,
          priceChange24h: 0.0
        },
        {
          mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          name: 'Bonk',
          symbol: 'BONK',
          marketcap: 1500000000,
          fungible: true,
          decimals: 5,
          price: 0.00000123,
          volume24h: 50000000,
          priceChange24h: 5.2
        }
      ];
      return NextResponse.json(fallbackData);
    }

    return NextResponse.json(sortedData);
  } catch (error: any) {
    console.error('Error fetching graduated tokens:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to fetch graduated tokens' },
      { status: 500 }
    );
  }
}