export interface User {
  id: string;
  email: string;
  profilePicUrl?: string;
}

export interface Community {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

export interface Message {
  senderEmail: string;
  receiverEmail?: string;      // optional for community messages
  communityId?: number;        // optional for DMs
  content: string;
  timestamp: string;
  senderId?: number;           // optional
  receiverId?: number;         // optional
}


export interface AuthResponse {
  token: string;
}
