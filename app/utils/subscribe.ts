export async function subscribeEmail(email: string) {
  try {
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe');
    }

    return await response.json();
  } catch (error) {
    console.error('Subscription error:', error);
    throw error;
  }
} 