import { User } from '../types';

const API_BASE_URL = 'http://localhost:8080';

export const api = {
  register: async (email: string, password: string): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },

  verify: async (email: string, otp: string): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },

  login: async (email: string, password: string): Promise<{ token: string }> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  resendOtp: async (email: string): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/auth/resend-otp?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },

  getCommunities: async (token: string): Promise<any[]> => {
    const res = await fetch(`${API_BASE_URL}/api/communities`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  searchUsers: async (email: string, token: string): Promise<User[]> => {
    const res = await fetch(`${API_BASE_URL}/api/users/search?email=${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());

    const data: Array<{ id?: number; email?: string }> = await res.json();

    const users: User[] = data
    .filter(u => u.email)  // skip users without email
    .map(u => ({
      id: u.id?.toString() || u.email!,
      email: u.email!,
    }));


    return users;
  },

  getDMContacts: async (token: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE_URL}/api/messages/dm/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // array of strings (emails)
  },
  
  getProfile: async (token: string): Promise<any> => {
    const res = await fetch(`http://localhost:8080/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  
  
};
