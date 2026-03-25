import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_DAILY_INTENTION } from '@/lib/constants';
import { estimateSalahDebt } from '@/lib/practicing-periods';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUpdateProfile } from '@/hooks/use-profile';
import { api } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { PrivacyStep } from './steps/privacy-step';
import { ProfileStep } from './steps/profile-step';
import { BulughStep } from './steps/bulugh-step';
import { PeriodsStep, type LocalPeriod } from './steps/periods-step';
import { IntentionStep } from './steps/intention-step';
import { ResultStep } from './steps/result-step';
import styles from './onboarding.module.css';

const TOTAL_STEPS = 6;

interface OnboardingData {
  consentData: boolean;
  consentPolicy: boolean;
  dateOfBirthHijri: string;
  gender: 'male' | 'female' | '';
  bulughDateHijri: string;
  revertDateHijri?: string;
  periods: LocalPeriod[];
  dailyIntention: number;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

const DRAFT_KEY = 'awdah_onboarding_draft';

function loadDraft(): { step: number; data: OnboardingData } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { step: number; data: OnboardingData };
  } catch {
    return null;
  }
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState(() => {
    const draft = loadDraft();
    // Never restore to the final result step — re-run the save
    return draft && draft.step < 6 ? draft.step : 1;
  });
  const [data, setData] = useState<OnboardingData>(() => {
    const draft = loadDraft();
    return draft
      ? draft.data
      : {
          consentData: false,
          consentPolicy: false,
          dateOfBirthHijri: '',
          gender: '',
          bulughDateHijri: '',
          periods: [],
          dailyIntention: DEFAULT_DAILY_INTENTION,
        };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [debtResult, setDebtResult] = useState<{
    salahDebt: number | null;
    sawmDebt: number | null;
  }>({ salahDebt: null, sawmDebt: null });

  const merge = useCallback(
    (updates: Partial<OnboardingData>) => setData((d) => ({ ...d, ...updates })),
    [],
  );

  // Persist draft after every step/data change so the user can resume
  useEffect(() => {
    if (step >= TOTAL_STEPS) return; // don't persist once on result step
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data }));
    } catch {
      // localStorage may be unavailable (private mode, storage full) — fail silently
    }
  }, [step, data]);

  // Determine if the current step's required data is filled
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.consentData && data.consentPolicy;
      case 2:
        return !!data.gender;
      case 3:
        return !!data.bulughDateHijri || !!data.revertDateHijri;
      case 4:
        return true; // Periods are optional
      case 5:
        return data.dailyIntention >= 1;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Step 5 → 6: save profile and periods, then fetch debt
    setIsSaving(true);
    setSaveError(false);
    setStep(TOTAL_STEPS);

    try {
      // 1. Save profile
      await updateProfile.mutateAsync({
        bulughDate: data.bulughDateHijri,
        gender: data.gender as 'male' | 'female',
        dateOfBirth: data.dateOfBirthHijri || undefined,
        revertDate: data.revertDateHijri || undefined,
      });

      // 2. Save practicing periods sequentially
      for (const p of data.periods) {
        await api.salah.addPeriod({
          startDate: p.startHijri,
          endDate: p.endHijri,
          type: p.type,
        });
      }

      // 3. Invalidate debt queries so they refetch
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.salahDebt });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sawmDebt });

      // 4. Fetch the recalculated debt
      const [salahResult, sawmResult] = await Promise.all([
        api.salah.getDebt(),
        api.sawm.getDebt(),
      ]);

      setDebtResult({
        salahDebt: salahResult?.remainingPrayers ?? null,
        sawmDebt: sawmResult?.remainingDays ?? null,
      });
      // Clear the onboarding draft — wizard completed successfully
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const stepLabels = [
    t('onboarding.step_privacy'),
    t('onboarding.step_profile'),
    t('onboarding.step_bulugh'),
    t('onboarding.step_periods'),
    t('onboarding.step_intention'),
    t('onboarding.step_result'),
  ];

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  const estimatedSalahDebt = useMemo(() => {
    if (!data.bulughDateHijri) {
      return 0;
    }

    return estimateSalahDebt(data.bulughDateHijri, data.periods);
  }, [data.bulughDateHijri, data.periods]);

  return (
    <div className={styles.wizard}>
      {/* Header */}
      <header className={styles.wizardHeader}>
        <span className={styles.appName}>{t('common.app_name')}</span>
        <div
          className={styles.stepDots}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemax={TOTAL_STEPS}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`${styles.dot} ${i + 1 === step ? styles.active : ''} ${i + 1 < step ? styles.done : ''}`}
              aria-label={`${stepLabels[i]} ${i + 1 < step ? t('onboarding.step_done') : i + 1 === step ? t('onboarding.step_current') : ''}`}
            />
          ))}
        </div>
        <span className={styles.stepCounter}>
          {t('onboarding.step_indicator', { current: step, total: TOTAL_STEPS })}
        </span>
      </header>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
      </div>

      {/* Step content */}
      <main className={styles.stepContent}>
        {step === 1 && (
          <PrivacyStep
            consentData={data.consentData}
            consentPolicy={data.consentPolicy}
            onChange={(key, value) => merge({ [key]: value })}
          />
        )}
        {step === 2 && (
          <ProfileStep
            dateOfBirthHijri={data.dateOfBirthHijri}
            gender={data.gender}
            onChange={(updates) => merge(updates)}
          />
        )}
        {step === 3 && (
          <BulughStep
            dateOfBirthHijri={data.dateOfBirthHijri}
            bulughDateHijri={data.bulughDateHijri}
            revertDateHijri={data.revertDateHijri}
            onChange={(updates) => merge(updates)}
          />
        )}
        {step === 4 && (
          <PeriodsStep
            dateOfBirthHijri={data.dateOfBirthHijri}
            periods={data.periods}
            onChange={(periods) => merge({ periods })}
          />
        )}
        {step === 5 && (
          <IntentionStep
            dailyIntention={data.dailyIntention}
            salahDebt={estimatedSalahDebt}
            onChange={(dailyIntention) => merge({ dailyIntention })}
          />
        )}
        {step === TOTAL_STEPS && (
          <ResultStep
            salahDebt={debtResult.salahDebt}
            sawmDebt={debtResult.sawmDebt}
            dailyIntention={data.dailyIntention}
            isLoading={isSaving}
            hasError={saveError}
            onBegin={onComplete}
          />
        )}
      </main>

      {/* Footer nav — hidden on final step (result has its own CTA) */}
      {step < TOTAL_STEPS && (
        <footer className={styles.footer}>
          {step > 1 ? (
            <button
              type="button"
              className={styles.backBtn}
              onClick={handleBack}
              aria-label={t('onboarding.back')}
            >
              <ChevronLeft size={16} />
              {t('onboarding.back')}
            </button>
          ) : (
            <span className={styles.footerSpacer} />
          )}

          <button
            type="button"
            className={styles.nextBtn}
            onClick={handleNext}
            disabled={!canProceed()}
            aria-label={step === TOTAL_STEPS - 1 ? t('onboarding.finish') : t('onboarding.next')}
          >
            {step === TOTAL_STEPS - 1 ? t('onboarding.finish') : t('onboarding.next')}
            {step < TOTAL_STEPS - 1 && <ChevronRight size={16} />}
          </button>
        </footer>
      )}
    </div>
  );
};
