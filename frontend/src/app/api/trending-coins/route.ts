import { NextResponse } from 'next/server';
import axios from 'axios';

// Define the structure of a trending coin response
interface CoinMarketCapCoin {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      market_cap: number;
      volume_24h: number;
    }
  };
  cmc_rank: number;
}

// Interface for coin metadata response
interface CoinMetadata {
  id: number;
  logo: string;
  urls: {
    website: string[];
    technical_doc: string[];
    twitter: string[];
    reddit: string[];
    message_board: string[];
    chat: string[];
    explorer: string[];
    source_code: string[];
  };
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

    // Make request to CoinMarketCap API to get trending coins
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          limit: 10, // Get top 10 coins
          sort: 'percent_change_24h', // Sort by 24h change to get trending coins
          sort_dir: 'desc', // Sort in descending order
          convert: 'USD', // Convert prices to USD
        },
      }
    );
    
    // Get top trending coins
    const topCoins = response.data.data.slice(0, 5); // Get top 5 trending coins
    
    // Get coin IDs for metadata request
    const coinIds = topCoins.map((coin: CoinMarketCapCoin) => coin.id).join(',');
    
    // Fetch metadata for these coins (including logos)
    const metadataResponse = await axios.get(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
        },
        params: {
          id: coinIds
        },
      }
    );
    
    const metadataMap: Record<number, CoinMetadata> = metadataResponse.data.data;

    // Transform the data to match our frontend needs
    const trendingCoins = topCoins.map((coin: CoinMarketCapCoin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      slug: coin.slug,
      price: coin.quote.USD.price,
      percent_change_24h: coin.quote.USD.percent_change_24h,
      market_cap: coin.quote.USD.market_cap,
      volume_24h: coin.quote.USD.volume_24h,
      rank: coin.cmc_rank,
      image: metadataMap[coin.id]?.logo || null, // Add coin logo URL
    }))

    return NextResponse.json(trendingCoins);
  } catch (error: any) {
    console.error('Error fetching trending coins:', error.response?.data || error.message);
    
    return NextResponse.json(
      { error: 'Failed to fetch trending coins' },
      { status: 500 }
    );
  }
}