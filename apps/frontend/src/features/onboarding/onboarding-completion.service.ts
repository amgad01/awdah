import { salahRepository } from '@/domains/salah/salah-repository';
import { sawmRepository } from '@/domains/sawm/sawm-repository';
import { userRepository } from '@/domains/user/user-repository';
import type { PracticingPeriodResponse } from '@/lib/api';
import type { OnboardingData } from './onboarding-data';

export interface CompleteOnboardingResult {
  salahDebt: number | null;
  sawmDebt: number | null;
}

export interface CompleteOnboardingDependencies {
  updateProfile: typeof userRepository.updateProfile;
  addPeriod: typeof salahRepository.addPracticingPeriod;
  updatePeriod: typeof salahRepository.updatePracticingPeriod;
  deletePeriod: typeof salahRepository.deletePracticingPeriod;
  getSalahDebt: typeof salahRepository.getDebt;
  getSawmDebt: typeof sawmRepository.getDebt;
}

export const defaultCompleteOnboardingDependencies: CompleteOnboardingDependencies = {
  updateProfile: userRepository.updateProfile,
  addPeriod: salahRepository.addPracticingPeriod,
  updatePeriod: salahRepository.updatePracticingPeriod,
  deletePeriod: salahRepository.deletePracticingPeriod,
  getSalahDebt: salahRepository.getDebt,
  getSawmDebt: sawmRepository.getDebt,
};

function hasPeriodChanged(
  existing: PracticingPeriodResponse,
  next: OnboardingData['periods'][number],
): boolean {
  return (
    existing.startDate !== next.startHijri ||
    (existing.endDate ?? '') !== (next.endHijri ?? '') ||
    existing.type !== next.type
  );
}

export async function completeOnboarding(
  data: OnboardingData,
  persistedPeriods: PracticingPeriodResponse[],
  dependencies: CompleteOnboardingDependencies = defaultCompleteOnboardingDependencies,
): Promise<CompleteOnboardingResult> {
  await dependencies.updateProfile({
    username: data.username.trim() || undefined,
    bulughDate: data.bulughDateHijri,
    gender: data.gender as 'male' | 'female',
    dateOfBirth: data.dateOfBirthHijri || undefined,
    revertDate: data.revertDateHijri || undefined,
  });

  const persistedById = new Map(persistedPeriods.map((period) => [period.periodId, period]));
  const nextById = new Map(data.periods.map((period) => [period.id, period]));
  const deleteOperations: Promise<unknown>[] = [];
  const upsertOperations: Promise<unknown>[] = [];

  for (const period of persistedPeriods) {
    if (!nextById.has(period.periodId)) {
      deleteOperations.push(dependencies.deletePeriod(period.periodId));
    }
  }

  for (const period of data.periods) {
    const existing = persistedById.get(period.id);

    if (!existing) {
      upsertOperations.push(
        dependencies.addPeriod({
          startDate: period.startHijri,
          endDate: period.endHijri,
          type: period.type,
        }),
      );
      continue;
    }

    if (hasPeriodChanged(existing, period)) {
      upsertOperations.push(
        dependencies.updatePeriod({
          periodId: existing.periodId,
          startDate: period.startHijri,
          endDate: period.endHijri,
          type: period.type,
        }),
      );
    }
  }

  await Promise.all(deleteOperations);
  await Promise.all(upsertOperations);

  const [salahResult, sawmResult] = await Promise.all([
    dependencies.getSalahDebt(),
    dependencies.getSawmDebt(),
  ]);

  return {
    salahDebt: salahResult?.remainingPrayers ?? null,
    sawmDebt: sawmResult?.remainingDays ?? null,
  };
}
