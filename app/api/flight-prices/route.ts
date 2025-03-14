// app/api/flight-prices/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('🚀 API route is executing');
  // Check for API key
  if (!process.env.API_KEY) {
    console.error('API_KEY is missing from environment variables');
    // If your config is broken, you can keep this 500 or also treat as noData
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Extract query params
    const { searchParams } = new URL(request.url);
    const destinationIata = searchParams.get('destination_iata'); 
    const departureMonth = searchParams.get('departure_month');

    const baseUrl = "https://flight-price-api-778371596602.asia-southeast1.run.app/average_price";
    const queryString = new URLSearchParams({
      destination_iata: destinationIata || '',
      departure_month: departureMonth || '',
      num_travelers: '1',
    }).toString();

    const apiUrl = `${baseUrl}?${queryString}`;
    console.log('Full API URL:', apiUrl);

    // Call external API
    const response = await fetch(apiUrl, {
      headers: { 'x-api-key': process.env.API_KEY || '' }
    });

    // 1) If external API fails or returns 4xx/5xx, treat as "no data"
    if (!response.ok) {
      console.error('External API Error:', response.status, response.statusText);
      return NextResponse.json({ noData: true }, { status: 200 });
    }

    // 2) If response is OK, parse data
    const data = await response.json();

    // 3) If data is empty or missing, also treat as "no data"
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ noData: true }, { status: 200 });
    }

    // 4) Otherwise, return data
    return NextResponse.json(data);

  } catch (error) {
    console.error('Server error:', error);
    // 5) If we hit a runtime error, also treat as noData (200)
    return NextResponse.json({ noData: true }, { status: 200 });
  }
}
