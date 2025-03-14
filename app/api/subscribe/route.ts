// app/api/subscribe/route.ts

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming JSON body to get the email
    const { email } = await request.json();
    console.log("Received email:", email);

    // 2. Check environment variables for Klaviyo config
    if (!process.env.KLAVIYO_API_KEY || !process.env.KLAVIYO_LIST_ID) {
      console.error("Missing Klaviyo credentials");
      return NextResponse.json(
        { error: "Missing Klaviyo configuration" },
        { status: 500 }
      );
    }

    // First create/update the profile
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Revision': '2023-12-15',
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: email,
            properties: {
              source: 'Flight Price Alert Signup'
            }
          }
        }
      })
    });

    const profileData = await profileResponse.json();
    console.log('Profile Response:', profileData);

    if (!profileResponse.ok) {
      throw new Error(`Klaviyo Profile API error: ${JSON.stringify(profileData)}`);
    }

    // Then subscribe the profile to the list
    const subscribeResponse = await fetch(`https://a.klaviyo.com/api/lists/${process.env.KLAVIYO_LIST_ID}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Revision': '2023-12-15',
        'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`
      },
      body: JSON.stringify({
        data: [{
          type: 'profile',
          id: profileData.data.id
        }]
      })
    });

    const subscribeData = await subscribeResponse.json();
    console.log('Subscribe Response:', subscribeData);

    if (!subscribeResponse.ok) {
      throw new Error(`Klaviyo Subscribe API error: ${JSON.stringify(subscribeData)}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "Failed to subscribe: " + (error as Error).message },
      { status: 500 }
    );
  }
}
