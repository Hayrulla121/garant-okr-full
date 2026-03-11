/**
 * Utility function to get the full URL for profile photos and other images.
 *
 * The backend returns relative URLs like "/uploads/profile-photos/..."
 * but the frontend runs on a different port (5173 for dev), so we need
 * to prepend the backend server base URL.
 */
export function getImageUrl(relativeUrl: string | undefined | null): string | undefined {
  if (!relativeUrl) return undefined;

  // If it's already an absolute URL, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }

  // Get the API base URL and derive the server base URL
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
  const serverBase = apiBase.replace(/\/api$/, '');

  return `${serverBase}${relativeUrl}`;
}
