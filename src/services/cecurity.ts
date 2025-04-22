import { supabase } from '@/lib/supabase';

interface AuthenticationResponse {
  token: string;
  displayName: string;
  language: string;
}

export class CecurityService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_CECURITY_API_URL;
  private static readonly API_KEY = process.env.NEXT_PUBLIC_CECURITY_API_KEY;

  static async authenticate(login: string, password: string): Promise<AuthenticationResponse> {
    // Verify the API key is actually loaded
    if (!this.API_KEY || this.API_KEY === 'your_cecurity_api_key') {
      console.error('Invalid API Key configuration:', {
        API_KEY: this.API_KEY,
        ENV_KEY: process.env.NEXT_PUBLIC_CECURITY_API_KEY
      });
      throw new Error('Invalid API Key configuration');
    }

    if (!this.API_URL) {
      console.error('Missing Cecurity API URL:', {
        API_URL: this.API_URL
      });
      throw new Error('Missing Cecurity API URL');
    }

    const requestBody = { login, password };
    console.log('\n=== Cecurity Authentication Request ===');
    console.log('URL:', `${this.API_URL}/public/v3/accounts/authenticate`);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-ApiKey': this.API_KEY,
    });
    console.log('Body:', requestBody);
    console.log('=====================================\n');

    try {
      const response = await fetch(`${this.API_URL}/public/v3/accounts/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-ApiKey': this.API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('\n=== Cecurity Authentication Response ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error Response:', errorText);
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data: AuthenticationResponse = await response.json();
      console.log('Response Data:', data);
      console.log('=====================================\n');
      
      // Store the token in Supabase
      await this.storeToken(data.token, login);
      
      return data;
    } catch (error) {
      console.error('\n=== Cecurity Authentication Error ===');
      console.error(error);
      console.log('=====================================\n');
      throw error;
    }
  }

  private static async storeToken(token: string, login: string): Promise<void> {
    try {
      // Parse JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = new Date(payload.exp * 1000);

      console.log('\n=== Storing Token in Supabase ===');
      console.log('Token:', token.substring(0, 20) + '...');
      console.log('Expires At:', expiresAt);
      console.log('=====================================\n');

      const { error } = await supabase
        .from('tokens')
        .upsert({
          subscription_id: login,
          token,
          expires_at: expiresAt.toISOString(),
          login,
        });

      if (error) {
        console.error('Failed to store token:', error);
        throw new Error(`Failed to store token: ${error.message}`);
      }
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }
} 