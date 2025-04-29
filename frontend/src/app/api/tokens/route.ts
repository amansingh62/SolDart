// app/api/tokens/route.ts
import { NextResponse } from 'next/server';
import { fetchTokensFromMoralis } from '@/lib/fetchTokens';

export async function GET() {
  const tokens = await fetchTokensFromMoralis();
  return NextResponse.json(tokens);
}
