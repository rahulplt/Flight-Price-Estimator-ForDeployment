// app/api/subscribe/route.ts

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Debug environment variables
    console.log('Debug - Environment Variables:', {
      hasKlaviyoKey: !!process.env.KLAVIYO_API_KEY,
      keyFirstChars: process.env.KLAVIYO_API_KEY?.slice(0, 5),
      hasListId: !!process.env.KLAVIYO_LIST_ID,
      listId: process.env.KLAVIYO_LIST_ID
    });

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
    console.log('Attempting to create/update Klaviyo profile for email:', email);
    
    const profileResponse = await fetch('https://a.klaviyo.com/api/profiles', {
      method: 'POST',
      headers: {
        accept: 'application/vnd.api+json',
        revision: '2025-04-15',
        'content-type': 'application/vnd.api+json',
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`
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
    console.log('Klaviyo API Response Status:', profileResponse.status);
    console.log('Klaviyo API Response Body:', profileData);

    // Get profile ID either from success response or from conflict error
    let profileId;
    if (profileResponse.status === 201) {
      // New profile created
      profileId = profileData.data.id;
    } else if (profileResponse.status === 409) {
      // Profile already exists, get ID from error response
      profileId = profileData.errors[0].meta.duplicate_profile_id;
    } else if (!profileResponse.ok) {
      // Handle other errors
      console.error('Klaviyo API Error Details:', {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        body: profileData
      });
      throw new Error(`Klaviyo Profile API error: ${JSON.stringify(profileData)}`);
    }

    console.log('Using profile ID:', profileId);

    // Then subscribe the profile to the list
    const subscribeResponse = await fetch(`https://a.klaviyo.com/api/lists/${process.env.KLAVIYO_LIST_ID}/relationships/profiles`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.api+json',
        revision: '2025-04-15',
        'content-type': 'application/vnd.api+json',
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`
      },
      body: JSON.stringify({
        data: [{
          type: 'profile',
          id: profileId
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
