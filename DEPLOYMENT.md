# SolEcho Production Deployment Guide

## Environment Variables Setup

This guide explains how to set up environment variables for production deployment of SolEcho.

### Frontend (.env file in frontend directory)

Create a `.env` file in the frontend directory with the following variables:

```
# API URL - Backend server URL
NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Frontend URL - Used for CORS and redirects
NEXT_PUBLIC_FRONTEND_URL=https://your-frontend-domain.com

# Moralis API Key for blockchain data
NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key

# CoinMarketCap API Key
NEXT_PUBLIC_COIN_MARKET_API_KEY=your_coinmarketcap_api_key

# OpenAI API Key for AI features
OPENAI_API_KEY=your_openai_api_key
```

### Backend (.env file in backend directory)

Create a `.env` file in the backend directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend URL for CORS and redirects
FRONTEND_URL=https://your-frontend-domain.com

# Base URL for the backend server (used for generating URLs)
BASE_URL=https://your-backend-domain.com

# MongoDB Connection
MONGO_URI=mongodb+srv://your_mongodb_connection_string

# JWT Authentication
JWT_SECRET=your_jwt_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_BUCKET_NAME=solecho

# API Keys
COIN_MARKET_API_KEY=your_coinmarketcap_api_key
BIRDEYE_API_KEY=your_birdeye_api_key
HELIUS_API_KEY=your_helius_api_key
SOLSCAN_API_KEY=your_solscan_api_key
```

## Security Considerations

1. **Never commit .env files to version control**
2. **Use different JWT secrets for different environments**
3. **Rotate API keys periodically**
4. **Use environment-specific API keys**

## Deployment Steps

1. Set up environment variables as described above
2. Build the frontend: `cd frontend && npm run build`
3. Start the backend: `cd backend && npm start`

## Verifying Environment Variables

To verify that environment variables are correctly set up:

1. Frontend: Check the Network tab in browser dev tools to ensure API requests are going to the correct URL
2. Backend: Add a temporary log statement in server.js to print environment variables on startup (remove before final deployment)

## Troubleshooting

- If you see 'http://localhost' in any URLs in production, you have missed replacing a hardcoded URL with an environment variable
- If API calls fail with authentication errors, check that your API keys are correctly set in the environment variables