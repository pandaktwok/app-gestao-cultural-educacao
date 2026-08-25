import Dexie, { Table } from 'dexie';

export interface PendingAttendance {
  id?: number;
  schoolId: string;
  date: string;
  type: 'MANUAL' | 'EXTERNAL';
  countPresent: number;
  countAbsent: number;
  records?: { studentId: string; isPresent: boolean }[];
  photoListUrl?: string;
  pdfListUrl?: string;
  synced: boolean;
  timestamp: number;
}

export interface PendingPhoto {
  id?: number;
  schoolId: string;
  date: string;
  originalTimestamp?: string;
  photoUrl: string; // Base64 or local blob URL
  synced: boolean;
  timestamp: number;
}

export interface PendingEvent {
  id?: number;
  schoolId: string;
  name: string;
  date: string;
  photoUrls: string[];
  synced: boolean;
  timestamp: number;
}

export interface OfflineStudent {
  id?: number;
  serverId?: string;
  schoolId: string;
  name: string;
  age: number;
  gender: string;
  status: 'ACTIVE' | 'DROPOUT';
  dropoutDate?: string;
  synced: boolean;
}

class CulturalAppDatabase extends Dexie {
  pendingAttendance!: Table<PendingAttendance>;
  pendingPhotos!: Table<PendingPhoto>;
  pendingEvents!: Table<PendingEvent>;
  offlineStudents!: Table<OfflineStudent>;

  constructor() {
    super('CulturalAppDB');
    this.version(1).stores({
      pendingAttendance: '++id, schoolId, synced, timestamp',
      pendingPhotos: '++id, schoolId, synced, timestamp',
      pendingEvents: '++id, schoolId, synced, timestamp',
      offlineStudents: '++id, schoolId, status, synced',
    });
  }
}

export const db = new CulturalAppDatabase();
