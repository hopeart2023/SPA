
export type Language = 'Oromo' | 'Amharic' | 'English';

export type UserRole = 'Citizen' | 'Officer' | 'Admin';

export interface Incident {
  id: string;
  date: string;
  location: { lat: number; lng: number; address?: string };
  status: 'Pending' | 'Validated' | 'Critical' | 'Resolved';
  description: string;
  summary?: string;
  evidenceType?: 'image' | 'video' | 'none';
  evidenceUrl?: string;
  citizenName?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterFayda?: string;
  officerLocation?: { lat: number; lng: number; timestamp?: number };
}

export interface Alert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PatrolAssignment {
  officer: string;
  vehicle: string;
  shift: string;
  zone: string;
  eta: string;
}

export interface TranslationMap {
  [key: string]: {
    Oromo: string;
    Amharic: string;
    English: string;
  };
}
