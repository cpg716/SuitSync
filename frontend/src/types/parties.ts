// Party and related types for SuitSync

export interface Party {
  id: number;
  name: string;
  eventDate?: string;
  notes?: string;
  syncedToLs?: boolean;
  customer?: { id: number; name: string; phone?: string; email?: string };
  members?: PartyMember[];
}

export interface PartyMember {
  id: number;
  partyId: number;
  customerId: number;
  role?: string;
  measurements?: any;
}

export interface TailorsResponse {
  users?: Array<{
    id: string;
    name: string;
    role: string;
    // Add other fields as needed
  }>;
  lightspeedUsers?: Array<{
    id: string;
    name: string;
    role: string;
    // Add other fields as needed
  }>;
} 