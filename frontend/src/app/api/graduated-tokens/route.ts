import { NextResponse } from 'next/server';
import axios from 'axios';

// Define the structure of a graduated token response
interface GraduatedToken {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  rank: number;
  image?: string; // URL to the token's image/logo
  isGraduated: boolean;
}

export async function GET() {
  try {
    // Get API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_COIN_MARKET_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CoinMarketCap API key is not configured' },
        { status: 500 }
      );
    }

    // Make request to CoinMarketCap API to get graduated tokens from dexscan
    // We're using a proxy approach to avoid CORS issues
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/dexer/pairs',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          dexId: 'pump.fun', // Updated to pump.fun for graduated tokens
          aux: 'is_graduated', // Request graduated status
          limit: 20, // Get top 20 tokens
          convert: 'USD', // Convert prices to USD
        },
      }
    );
    
    // Filter for graduated tokens only
    const graduatedTokens = response.data.data.filter((token: any) => token.is_graduated === true);
    
    // Get token IDs for metadata request
    const tokenIds = graduatedTokens.map((token: any) => token.token_id).join(',');
    
    // Fetch metadata for these tokens (including logos)
    const metadataResponse = await axios.get(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          id: tokenIds
        },
      }
    );
    
    const metadataMap: Record<number, any> = metadataResponse.data.data;

    // Transform the data to match our frontend needs
    const formattedTokens = graduatedTokens.map((token: any) => ({
      id: token.token_id,
      name: token.token_name,
      symbol: token.token_symbol,
      slug: token.token_slug,
      price: token.quote.USD.price,
      percent_change_24h: token.quote.USD.percent_change_24h || 0,
      market_cap: token.quote.USD.market_cap || 0,
      volume_24h: token.quote.USD.volume_24h || 0,
      rank: token.rank || 0,
      image: metadataMap[token.token_id]?.logo || null, // Add token logo URL
      isGraduated: true
    }));

    return NextResponse.json(formattedTokens);
  } catch (error: any) {
    console.error('Error fetching graduated tokens:', error.response?.data || error.message);
    
    // Return a fallback response with sample data in case of error
    const fallbackData = [
      {
        id: 1,
        name: 'Sample Graduated Token 1',
        symbol: 'SGT1',
        slug: 'sample-graduated-token-1',
        price: 0.00001234,
        percent_change_24h: 5.67,
        market_cap: 1000000,
        volume_24h: 500000,
        rank: 1,
        isGraduated: true
      },
      {
        id: 2,
        name: 'Sample Graduated Token 2',
        symbol: 'SGT2',
        slug: 'sample-graduated-token-2',
        price: 0.00000567,
        percent_change_24h: 10.23,
        market_cap: 750000,
        volume_24h: 250000,
        rank: 2,
        isGraduated: true
      }
    ];
    
    return NextResponse.json(
      { error: 'Failed to fetch graduated tokens', fallbackData },
      { status: 500 }
    );
  }
}