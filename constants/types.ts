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
    receiverEmail?: string;
    communityId?: number;
    content: string;
    timestamp: string;
    senderId?: number;
    receiverId?: number;
  }
  
  export interface ItemDto {
    id?: number;
    title: string;
    description: string;
    price: number;
    quantity?: number;
    category: string;
    imageUrl?: string;
    seller?: string;
    sellerName?: string;
  }
  
  export interface Item {
    id: number;
    title: string;
    description: string;
    price: number;
    image?: string;
    category: string;
    seller?: string;
    sellerName?: string;
    buyer?: string;
    createdAt: string;
    status: boolean;
    views: number;
    quantity: number;
  }
  
  export interface AuthResponse {
    token: string;
  }