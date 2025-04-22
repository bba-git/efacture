import { supabase } from '@/lib/supabase';

interface AuthenticationResponse {
  token: string;
  displayName: string;
  language: string;
}

interface FileUploadResponse {
  uploadId: string;
}

export interface FileWithFingerprint {
  fileName: string;
  fileSize: number;
  fileType: 'invoice' | 'credit-note' | 'debit-note' | 'other';
  source: string;
  sourceId?: string;
  fingerPrint?: string;
  fingerPrintAlgorithm?: 'NONE' | 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512';
}

export class CecurityService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_CECURITY_API_URL;
  private static readonly API_KEY = process.env.NEXT_PUBLIC_CECURITY_API_KEY;
  private static readonly SUBSCRIPTION_ID = process.env.NEXT_PUBLIC_CECURITY_SUBSCRIPTION_ID;

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
          subscription_id: this.SUBSCRIPTION_ID,
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

  private static async getToken(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('token')
        .eq('subscription_id', this.SUBSCRIPTION_ID)
        .single();

      if (error) {
        console.error('Error getting token:', error);
        throw new Error(`Failed to get token: ${error.message}`);
      }

      if (!data) {
        throw new Error('No token found for subscription');
      }

      return data.token;
    } catch (error) {
      console.error('Error in getToken:', error);
      throw error;
    }
  }

  private static validateFile(file: FileWithFingerprint): void {
    if (!file.fileName || file.fileName.length < 5) {
      throw new Error('fileName is required and must be at least 5 characters');
    }

    if (typeof file.fileSize !== 'number' || file.fileSize < 0) {
      throw new Error('fileSize is required and must be a positive number');
    }

    if (file.sourceId && file.sourceId.length !== 36) {
      throw new Error('sourceId must be exactly 36 characters if provided');
    }
  }

  static async uploadFiles(files: FileWithFingerprint[]): Promise<FileUploadResponse> {
    try {
      const token = await this.getToken();
      const url = `${this.API_URL}/public/v3/einvoice-outbound/uploads/new?subscriptionId=${this.SUBSCRIPTION_ID}`;

      const requestBody = {
        files: files.map(file => ({
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: 'invoice',
          source: 'not-specified',
          sourceId: null
        })),
        channel: 'portal',
        mailAddress: 'test@yopmail.com'
      };

      if (!this.API_KEY) {
        throw new Error('API key is not defined');
      }

      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-ApiKey': this.API_KEY
      };

      console.log('\n=== Creating Upload Session ===');
      console.log('URL:', url);
      console.log('Headers:', headers);
      console.log('Body:', requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload session creation failed:', errorText);
        throw new Error(`Upload session creation failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload session created:', result);
      console.log('=====================================\n');

      return result;
    } catch (error) {
      console.error('Error creating upload session:', error);
      throw error;
    }
  }

  static async uploadFileContent(uploadId: string, files: File[]): Promise<void> {
    try {
      if (!this.API_KEY) {
        throw new Error('API key is not defined');
      }

      const token = await this.getToken();
      const url = `${this.API_URL}/public/v3/einvoice-outbound/uploads/${uploadId}/upload`;

      // Create FormData object
      const formData = new FormData();
      files.forEach(file => {
        formData.append('formFiles', file);
      });

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };

      console.log('\n=== Upload File Content Request ===');
      console.log('URL:', url);
      console.log('Headers:', {
        'Authorization': `Bearer ${token.substring(0, 20)}...`
      });
      console.log('Upload ID:', uploadId);
      console.log('Files:', files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type
      })));
      
      // Log FormData contents
      console.log('FormData Contents:');
      const formDataEntries = [];
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          formDataEntries.push({
            key,
            value: `File(${value.name}, ${value.size} bytes, ${value.type})`
          });
        } else {
          formDataEntries.push({ key, value });
        }
      }
      console.log('Request Body:', JSON.stringify(formDataEntries, null, 2));
      console.log('=====================================\n');

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('File content upload failed:', errorText);
        throw new Error(`File content upload failed: ${errorText}`);
      }

      // If the response is successful (200), we don't need to parse it as JSON
      // The server might return an empty response or a non-JSON response
      console.log('File content uploaded successfully');
      console.log('=====================================\n');
    } catch (error) {
      console.error('Error uploading file content:', error);
      throw error;
    }
  }

  static async completeUpload(uploadId: string): Promise<string> {
    try {
      if (!this.API_KEY) {
        throw new Error('API key is not defined');
      }

      const token = await this.getToken();
      const url = `${this.API_URL}/public/v3/einvoice-outbound/uploads/${uploadId}/complete`;

      const headers = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      console.log('\n=== Completing Upload ===');
      console.log('URL:', url);
      console.log('Headers:', {
        'Authorization': `Bearer ${token.substring(0, 20)}...`
      });
      console.log('Upload ID:', uploadId);
      console.log('=====================================\n');

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log('Response Status:', response.status);
      console.log('Response Status Text:', response.statusText);
      console.log('Response Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload completion failed:', errorText);
        throw new Error(`Upload completion failed: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Upload completion response:', responseData);
      console.log('=====================================\n');

      return responseData.jobId;
    } catch (error) {
      console.error('Error completing upload:', error);
      throw error;
    }
  }
} 