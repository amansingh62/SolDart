import axios from 'axios';

export interface TrendingCoin {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  price: number;
  percent_change_24h: number;
  market_cap: number;
  volume_24h: number;
  rank: number;
  image?: string; // URL to the coin's image/logo
  isGraduated?: boolean; // Flag to indicate if this is a graduated token
  graduationTime?: number; // Hours since graduation
}

export interface FearGreedData {
  value: number;
  value_classification: string;
  timestamp: string;
  time_until_update: string;
}

// Function to fetch trending Solana cryptocurrencies from CoinMarketCap API
export const fetchTrendingCoins = async (): Promise<TrendingCoin[]> => {
  try {
    // CoinMarketCap API requires a proxy server to handle CORS and hide API key
    // This request will be made to our backend API which will forward it to CoinMarketCap
    // The backend is already configured to filter for Solana coins only
    const response = await axios.get('/api/trending-coins');
    return response.data;
  } catch (error) {
    console.error('Error fetching trending Solana coins:', error);
    return [];
  }
};

// Function to fetch graduated tokens from CoinMarketCap dexscan
export const fetchGraduatedTokens = async (): Promise<TrendingCoin[]> => {
  try {
    // This request will be made to our backend API endpoint that fetches graduated tokens
    // The backend is now configured to fetch from CoinMarketCap's dexscan API
    const response = await axios.get('/api/graduated-tokens', {
      // Add a timestamp to prevent caching
      params: { _t: new Date().getTime() }
    });
    
    // Check if the response contains an error
    if (response.data && response.data.error) {
      console.error('API returned an error:', response.data.error);
      throw new Error(response.data.error);
    }
    
    // Transform the data to ensure all tokens are marked as graduated
    const graduatedTokens = response.data.map((token: any) => ({
      ...token,
      isGraduated: true,
      // Add graduation time if not already present
      graduationTime: token.graduationTime || Math.floor(Math.random() * 24) + 1 // Random hours between 1-24 for demo
    }));
    
    // Store in localStorage as a backup
    localStorage.setItem('graduatedTokensData', JSON.stringify(graduatedTokens));
    
    return graduatedTokens;
  } catch (error) {
    console.error('Error fetching graduated tokens:', error);
    
    // Try to get data from localStorage first
    const cachedData = localStorage.getItem('graduatedTokensData');
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (e) {
        console.error('Error parsing cached data:', e);
      }
    }
    
    // Fallback data if API fails and no cached data is available
    const fallbackData: TrendingCoin[] = [
      {
        id: 1,
        name: "Donald Duck",
        symbol: "DNDK",
        slug: "donald-duck",
        price: 0.00005042,
        percent_change_24h: 0,
        market_cap: 3190,
        volume_24h: 50420,
        rank: 1,
        isGraduated: true,
        graduationTime: 1
      },
      {
        id: 2,
        name: "LabelData",
        symbol: "LABEL",
        slug: "labeldata",
        price: 0.000485,
        percent_change_24h: 0,
        market_cap: 1120000,
        volume_24h: 982700,
        rank: 2,
        isGraduated: true,
        graduationTime: 10
      },
      {
        id: 3,
        name: "Bird on Binance",
        symbol: "B-BIRD",
        slug: "bird-on-binance",
        price: 0.00004,
        percent_change_24h: 0.01,
        market_cap: 4600,
        volume_24h: 62700,
        rank: 3,
        isGraduated: true,
        graduationTime: 12
      },
      {
        id: 4,
        name: "TOKEN 2049",
        symbol: "2049",
        slug: "token-2049",
        price: 0.0001,
        percent_change_24h: 0,
        market_cap: 181630,
        volume_24h: 340070,
        rank: 4,
        isGraduated: true,
        graduationTime: 14
      },
      {
        id: 5,
        name: "Salamanca",
        symbol: "DON",
        slug: "salamanca",
        price: 0.00019,
        percent_change_24h: 1.89,
        market_cap: 1190000,
        volume_24h: 2270000,
        rank: 5,
        isGraduated: true,
        graduationTime: 15
      }
    ];
    
    return fallbackData;
  }
};

// Function to fetch Fear & Greed Index from CoinMarketCap API
export const fetchFearGreedIndex = async (): Promise<FearGreedData> => {
  try {
    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_COIN_MARKET_API_KEY,
        },
      }
    );

    // Calculate Fear & Greed Index based on market metrics
    const data = response.data.data;
    const marketMetrics = data.market_cap_percentage;
    const btcDominance = marketMetrics.btc || 0;
    const ethDominance = marketMetrics.eth || 0;
    const altDominance = 100 - (btcDominance + ethDominance);

    // Calculate value based on market metrics
    // Higher BTC dominance and lower alt dominance typically indicates fear
    // Higher alt dominance and lower BTC dominance typically indicates greed
    const value = Math.round(
      50 + // Base neutral value
      (altDominance - 30) * 0.5 + // Alt dominance impact
      (btcDominance - 40) * -0.3 // BTC dominance impact
    );

    // Clamp value between 0 and 100
    const clampedValue = Math.max(0, Math.min(100, value));

    // Determine classification
    let value_classification = 'Neutral';
    if (clampedValue >= 75) value_classification = 'Extreme Greed';
    else if (clampedValue >= 55) value_classification = 'Greed';
    else if (clampedValue >= 45) value_classification = 'Neutral';
    else if (clampedValue >= 25) value_classification = 'Fear';
    else value_classification = 'Extreme Fear';

    return {
      value: clampedValue,
      value_classification,
      timestamp: new Date().toISOString(),
      time_until_update: '05:00:00' // Next update in 5 minutes
    };
  } catch (error) {
    console.error('Error fetching Fear & Greed Index:', error);
    // Return fallback data in case of error
    return {
      value: 45,
      value_classification: 'Neutral',
      timestamp: new Date().toISOString(),
      time_until_update: '05:00:00'
    };
  }
};