export function getApiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  return base.replace(/\/$/, '');
}

export async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    const trimmed = text.trimStart();

    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      throw new Error(
        'API returned HTML instead of JSON. Set NEXT_PUBLIC_API_URL to your backend (e.g. https://your-backend.up.railway.app/api) on the frontend service and redeploy.'
      );
    }

    throw new Error(
      trimmed.slice(0, 160) || `Unexpected response (${response.status}) from API`
    );
  }

  return response.json();
}
