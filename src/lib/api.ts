import { auth } from './firebase';

/**
 * Makes an authenticated API request using Firebase authentication
 * @param url The API endpoint URL
 * @param options Fetch options
 * @returns The fetch response
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Get the current user
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get the ID token
    const token = await user.getIdToken();
    
    // Add the token to the Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    return response;
  } catch (error) {
    console.error('Error making authenticated request:', error);
    throw error;
  }
}

/**
 * Makes a GET request with authentication
 * @param url The API endpoint URL
 * @returns The parsed JSON response
 */
export async function getWithAuth<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Makes a POST request with authentication
 * @param url The API endpoint URL
 * @param data The data to send
 * @returns The parsed JSON response
 */
export async function postWithAuth<T, D = Record<string, unknown>>(url: string, data: D): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Makes a PUT request with authentication
 * @param url The API endpoint URL
 * @param data The data to send
 * @returns The parsed JSON response
 */
export async function putWithAuth<T, D = Record<string, unknown>>(url: string, data: D): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Makes a DELETE request with authentication
 * @param url The API endpoint URL
 * @returns The parsed JSON response
 */
export async function deleteWithAuth<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Makes a DELETE request with authentication and a request body
 * @param url The API endpoint URL
 * @param data The data to send
 * @returns The parsed JSON response
 */
export async function deleteWithAuthAndBody<T, D = Record<string, unknown>>(url: string, data: D): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
} 