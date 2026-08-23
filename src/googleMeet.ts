import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, getCachedGoogleAccessToken, setCachedGoogleAccessToken } from './firebase';

export interface MeetSpaceResponse {
  name: string;
  meetingUri: string;
  meetingCode: string;
  config?: {
    accessType?: string;
    entryPointAccess?: string;
  };
}

/**
 * Ensures a valid OAuth access token is available in memory for Google Meet API calls.
 * If not cached, opens a Google authorization popup.
 */
export async function getOrRequestMeetAccessToken(): Promise<string> {
  const cached = getCachedGoogleAccessToken();
  if (cached) {
    return cached;
  }

  try {
    googleProvider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedGoogleAccessToken(credential.accessToken);
      return credential.accessToken;
    }
    throw new Error('Google authorization succeeded but no access token was returned.');
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Google authorization popup was blocked by your browser. Please allow popups or open the app in a new window.');
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google authorization was cancelled.');
    }
    throw new Error(error?.message || 'Failed to authenticate with Google for Meet access.');
  }
}

/**
 * Creates a new Google Meet space via Google Meet REST API v2
 * POST https://meet.googleapis.com/v2/spaces
 */
export async function createGoogleMeetSpace(): Promise<MeetSpaceResponse> {
  const token = await getOrRequestMeetAccessToken();

  try {
    const response = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          accessType: 'OPEN',
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg = errBody?.error?.message || `Google Meet API error (${response.status}: ${response.statusText})`;
      
      // If unauthorized, clear cached token so user can re-authenticate
      if (response.status === 401 || response.status === 403) {
        setCachedGoogleAccessToken(null);
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    return {
      name: data.name || '',
      meetingUri: data.meetingUri || (data.meetingCode ? `https://meet.google.com/${data.meetingCode}` : ''),
      meetingCode: data.meetingCode || (data.meetingUri ? data.meetingUri.replace('https://meet.google.com/', '') : ''),
      config: data.config,
    };
  } catch (error: any) {
    console.error('Failed to create Google Meet space:', error);
    throw error;
  }
}

/**
 * Retrieves details for an existing Google Meet space
 * GET https://meet.googleapis.com/v2/{name=spaces/*}
 */
export async function getGoogleMeetSpace(spaceName: string): Promise<MeetSpaceResponse> {
  const token = await getOrRequestMeetAccessToken();
  const cleanName = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

  const response = await fetch(`https://meet.googleapis.com/v2/${cleanName}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Failed to fetch Google Meet space (${response.status})`);
  }

  const data = await response.json();
  return {
    name: data.name,
    meetingUri: data.meetingUri,
    meetingCode: data.meetingCode,
    config: data.config,
  };
}
