export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerStatus = 'done' | 'pending';
export type PeriodType = 'both' | 'salah' | 'sawm';
export type HistoryKind = 'prayer' | 'fast' | 'period' | 'covered';

export interface DemoData {
  user: {
    name: string;
    joinedAt: string;
    todayHijri: string;
    dailyIntention: number;
    story: Record<string, string>;
  };
  profile: {
    dateOfBirth: string;
    bulughDate: string;
    gender: 'male' | 'female';
    languages: string[];
  };
  salah: {
    remaining: number;
    completed: number;
    total: number;
    streakDays: number;
    qadaaLoggedToday: number;
    todayPrayers: Array<{
      name: PrayerName;
      status: PrayerStatus;
    }>;
    weeklyCompletion: Array<{
      dayKey: string;
      value: number;
    }>;
  };
  sawm: {
    remaining: number;
    completed: number;
    total: number;
    todayStatus: 'logged' | 'pending';
    currentMode: 'ramadan' | 'qadaa';
    ramadansRecovered: number;
  };
  bestPrayerStreak: {
    name: PrayerName;
    count: number;
  } | null;
  monThuStreak: number;
  practicingPeriods: Array<{
    id: string;
    type: PeriodType;
    startDate: string;
    endDate: string | null;
  }>;
  history: Array<{
    id: string;
    date: string;
    kind: HistoryKind;
    prayerName?: PrayerName;
    logType?: 'daily' | 'qadaa';
    periodKind?: PeriodType;
    periodEventKind?: 'start' | 'end';
  }>;
  settings: {
    exportReady: boolean;
    resetPrayersEnabled: boolean;
    resetFastsEnabled: boolean;
    deleteAccountEnabled: boolean;
    privacyModel: 'cloud_encrypted';
    authCompatibility: 'managed_or_local';
  };
}

export interface DemoPageProps {
  showHeading?: boolean;
}
