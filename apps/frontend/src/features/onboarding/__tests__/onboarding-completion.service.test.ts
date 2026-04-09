import { describe, expect, it, vi } from 'vitest';
import { completeOnboarding } from '../onboarding-completion.service';
import type { OnboardingData } from '../onboarding-data';
import type { PracticingPeriodResponse } from '@/lib/api';

function createData(): OnboardingData {
  return {
    consentData: true,
    consentPolicy: true,
    dateOfBirthHijri: '1420-01-01',
    gender: 'male',
    bulughDateHijri: '1435-01-01',
    revertDateHijri: undefined,
    dailyIntention: 1,
    username: 'test-user',
    periods: [],
  };
}

describe('completeOnboarding', () => {
  it('syncs periods and returns refreshed debt results', async () => {
    const persistedPeriods: PracticingPeriodResponse[] = [
      { periodId: 'keep', startDate: '1440-01-01', endDate: '1440-02-01', type: 'both' },
      { periodId: 'remove', startDate: '1441-01-01', endDate: '1441-02-01', type: 'salah' },
    ];

    const data: OnboardingData = {
      ...createData(),
      periods: [
        { id: 'keep', startHijri: '1440-01-01', endHijri: '1440-03-01', type: 'both' },
        { id: 'new', startHijri: '1442-01-01', endHijri: undefined, type: 'sawm' },
      ],
    };

    const dependencies = {
      updateProfile: vi.fn().mockResolvedValue(undefined),
      addPeriod: vi.fn().mockResolvedValue(undefined),
      updatePeriod: vi.fn().mockResolvedValue(undefined),
      deletePeriod: vi.fn().mockResolvedValue(undefined),
      getSalahDebt: vi.fn().mockResolvedValue({ remainingPrayers: 50 }),
      getSawmDebt: vi.fn().mockResolvedValue({ remainingDays: 7 }),
    };

    const result = await completeOnboarding(data, persistedPeriods, dependencies);

    expect(dependencies.updateProfile).toHaveBeenCalledOnce();
    expect(dependencies.deletePeriod).toHaveBeenCalledWith('remove');
    expect(dependencies.addPeriod).toHaveBeenCalledWith({
      startDate: '1442-01-01',
      endDate: undefined,
      type: 'sawm',
    });
    expect(dependencies.updatePeriod).toHaveBeenCalledWith({
      periodId: 'keep',
      startDate: '1440-01-01',
      endDate: '1440-03-01',
      type: 'both',
    });
    expect(result).toEqual({ salahDebt: 50, sawmDebt: 7 });
  });
});
