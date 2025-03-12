// app/api/flight-prices/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log('🚀 API route is executing');
  // First, let's check if we can access the API key
  console.log('API Key exists:', !!process.env.API_KEY);
  console.log('API Key first 5 chars:', process.env.API_KEY?.substring(0, 5));

  if (!process.env.API_KEY) {
    console.error('API_KEY is missing from environment variables');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Get query params
    const { searchParams } = new URL(request.url);
    const destinationIata = searchParams.get('destination_iata'); 
    const departureMonth = searchParams.get('departure_month');

    // Build external API URL without API key in the query string
    const baseUrl = "https://flight-price-api-778371596602.asia-southeast1.run.app/average_price";
    const queryString = new URLSearchParams({
      destination_iata: destinationIata || '',
      departure_month: departureMonth || '',
      num_travelers: '1',
    }).toString();

    const apiUrl = `${baseUrl}?${queryString}`;
    
    // Log the full URL without API key (temporarily, for debugging)
    console.log('Full API URL:', apiUrl);

    const response = await fetch(apiUrl, {
        headers: {
          'x-api-key': process.env.API_KEY || ''
        }
      });
      

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch data from API',
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}
