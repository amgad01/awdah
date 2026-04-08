import { describe, it, expect } from 'vitest';
import { createPrayerSlotKey } from '../prayer-slot-key';

describe('createPrayerSlotKey', () => {
  it('joins date and prayer name with a stable separator', () => {
    expect(createPrayerSlotKey('1445-09-01', 'FAJR')).toBe('1445-09-01#FAJR');
  });
});
