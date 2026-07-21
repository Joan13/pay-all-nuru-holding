import { remote_url } from '@/src/constants/Constants';
import { TUserData } from '@/src/Types';

export interface ApiResponse<T = any> {
  success: '0' | '1';
  user?: T;
  error?: string;
  [key: string]: any;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = remote_url;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: '0',
        error: error.message || 'Network request failed',
      };
    }
  }

  async signin(userData: {
    user_email: string;
    names: string;
    gender: number;
    country: string;
    city: string;
    state: string;
    address: string;
    phone_number: string;
    user_password: string;
    profile_picture: string;
    account_type: number;
  }): Promise<ApiResponse<TUserData>> {
    return this.request<TUserData>('/payall/API/signin', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async addUser(user: Partial<TUserData>): Promise<ApiResponse<TUserData>> {
    return this.request<TUserData>('/payall/API/signin', {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async getUsers(): Promise<ApiResponse<TUserData[]>> {
    return this.request<TUserData[]>('/payall/API/get_users', {
      method: 'POST',
    });
  }

  async updateUser(user: Partial<TUserData>): Promise<ApiResponse<TUserData>> {
    return this.request<TUserData>('/payall/API/update_user', {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async deleteUser(user: { _id: string }): Promise<ApiResponse> {
    return this.request('/payall/API/delete_user', {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async addRide(ride: any): Promise<ApiResponse> {
    return this.request('/payall/API/add_ride', {
      method: 'POST',
      body: JSON.stringify({ ride }),
    });
  }

  async getRides(user: { _id: string }): Promise<ApiResponse> {
    return this.request('/payall/API/get_rides', {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  async updateRide(ride: any): Promise<ApiResponse> {
    return this.request('/payall/API/update_ride', {
      method: 'POST',
      body: JSON.stringify({ ride }),
    });
  }

  async deleteRide(ride: { _id: string }): Promise<ApiResponse> {
    return this.request('/payall/API/delete_ride', {
      method: 'POST',
      body: JSON.stringify({ ride }),
    });
  }
}

export default new ApiService();

