import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addHijriDays, todayHijriDate } from '@/utils/date-utils';
import { transformWorshipData } from '../worship-data.service';

const TODAY = '1446-10-15';

vi.mock('@/utils/date-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/date-utils')>();
  return { ...actual, todayHijriDate: vi.fn(() => TODAY) };
});

describe('transformWorshipData', () => {
  beforeEach(() => {
    vi.mocked(todayHijriDate).mockReturnValue(TODAY);
  });

  it('always returns exactly 7 data points', () => {
    expect(transformWorshipData(null, null, 'en-GB')).toHaveLength(7);
  });

  it('last point is today, first point is 6 days ago', () => {
    const result = transformWorshipData(null, null, 'en-GB');
    expect(result[6].date).toBe(TODAY);
    expect(result[0].date).toBe(addHijriDays(TODAY, -6));
  });

  it('each point has a non-empty day label', () => {
    transformWorshipData(null, null, 'en-GB').forEach((p) =>
      expect(p.day.length).toBeGreaterThan(0),
    );
  });

  it('salah-only: counts obligatory and qadaa per day', () => {
    const logs = [
      { date: TODAY, type: 'obligatory' },
      { date: TODAY, type: 'obligatory' },
      { date: TODAY, type: 'qadaa' },
    ];
    const today = transformWorshipData(logs, null, 'en-GB')[6];
    expect(today.obligatory).toBe(2);
    expect(today.qadaa).toBe(1);
  });

  it('salah-only: empty array leaves obligatory/qadaa keys unset', () => {
    const result = transformWorshipData([], null, 'en-GB');
    expect(result[0].obligatory).toBeUndefined();
    expect(result[0].qadaa).toBeUndefined();
  });

  it('sawm-only: uses unprefixed keys', () => {
    const logs = [
      { date: TODAY, type: 'ramadan' },
      { date: TODAY, type: 'qadaa' },
    ];
    const today = transformWorshipData(null, logs, 'en-GB')[6];
    expect(today.obligatory).toBe(1);
    expect(today.qadaa).toBe(1);
    expect(today.fastObligatory).toBeUndefined();
    expect(today.fastQadaa).toBeUndefined();
  });

  it('sawm-only: counts both ramadan and obligatory types as obligatory', () => {
    const logs = [
      { date: TODAY, type: 'ramadan' },
      { date: TODAY, type: 'obligatory' },
    ];
    expect(transformWorshipData(null, logs, 'en-GB')[6].obligatory).toBe(2);
  });

  it('combined: sawm uses prefixed keys, salah uses unprefixed', () => {
    const salah = [{ date: TODAY, type: 'obligatory' }];
    const sawm = [
      { date: TODAY, type: 'ramadan' },
      { date: TODAY, type: 'qadaa' },
    ];
    const today = transformWorshipData(salah, sawm, 'en-GB')[6];
    expect(today.obligatory).toBe(1);
    expect(today.qadaa).toBe(0);
    expect(today.fastObligatory).toBe(1);
    expect(today.fastQadaa).toBe(1);
  });

  it('combined: salah=[] still triggers prefixed sawm keys', () => {
    const sawm = [{ date: TODAY, type: 'ramadan' }];
    const today = transformWorshipData([], sawm, 'en-GB')[6];
    expect(today.fastObligatory).toBe(1);
    expect(today.obligatory).toBeUndefined();
  });

  it('logs from other days do not bleed into today', () => {
    const yesterday = addHijriDays(TODAY, -1);
    const logs = [{ date: yesterday, type: 'obligatory' }];
    const result = transformWorshipData(logs, null, 'en-GB');
    expect(result[6].obligatory).toBe(0);
    expect(result[5].obligatory).toBe(1);
  });

  it('null salah and null sawm produce points with only date and day keys', () => {
    transformWorshipData(null, null, 'en-GB').forEach((p) => {
      expect(Object.keys(p)).toEqual(['date', 'day']);
    });
  });
});
