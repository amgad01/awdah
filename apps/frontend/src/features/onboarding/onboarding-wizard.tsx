import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { BrandLockup } from '@/components/brand-lockup/brand-lockup';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle/theme-toggle';
import { estimateSalahDebt } from '@/lib/practicing-periods';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useProfile, usePracticingPeriods } from '@/hooks/use-profile';
import { getOnboardingDraftKey } from '@/lib/onboarding-state';
import {
  createEmptyOnboardingData,
  createOnboardingDataFromProfile,
  getOnboardingDraftSecret,
  loadOnboardingDraft,
  saveOnboardingDraft,
  TOTAL_ONBOARDING_STEPS,
  type OnboardingData,
} from './onboarding-data';
import { useCompleteOnboarding } from './use-complete-onboarding';
import { PrivacyStep } from './steps/privacy-step';
import { ProfileStep } from './steps/profile-step';
import { BulughStep } from './steps/bulugh-step';
import { PeriodsStep } from './steps/periods-step';
import { IntentionStep } from './steps/intention-step';
import { ResultStep } from './steps/result-step';
import styles from './onboarding.module.css';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: storedPeriods, isLoading: isPeriodsLoading } = usePracticingPeriods();
  const completeOnboardingMutation = useCompleteOnboarding();
  const persistedPeriods = useMemo(() => storedPeriods ?? [], [storedPeriods]);
  const draftKey = useMemo(() => getOnboardingDraftKey(user?.userId), [user?.userId]);
  const draftSecret = useMemo(() => getOnboardingDraftSecret(user?.userId), [user?.userId]);
  const persistedData = useMemo(
    () => createOnboardingDataFromProfile(profile, persistedPeriods),
    [profile, persistedPeriods],
  );
  const persistedDataKey = useMemo(
    () =>
      JSON.stringify({
        profile: profile ?? null,
        periods: persistedPeriods,
      }),
    [profile, persistedPeriods],
  );

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(createEmptyOnboardingData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasCompletedWizardRef = useRef(false);
  const [debtResult, setDebtResult] = useState<{
    salahDebt: number | null;
    sawmDebt: number | null;
  }>({ salahDebt: null, sawmDebt: null });

  useEffect(() => {
    if (hasCompletedWizardRef.current) {
      setIsHydrated(true);
      return;
    }

    if (isProfileLoading || isPeriodsLoading) {
      setIsHydrated(false);
      return;
    }

    const init = async () => {
      const draft = await loadOnboardingDraft(draftKey, draftSecret);
      setStep(draft && draft.step < TOTAL_ONBOARDING_STEPS ? draft.step : 1);
      setData(draft ? draft.data : persistedData);
      setSaveError(false);
      setIsSaving(false);
      setDebtResult({ salahDebt: null, sawmDebt: null });
      setIsHydrated(true);
    };

    init();
  }, [draftKey, draftSecret, persistedData, persistedDataKey, isProfileLoading, isPeriodsLoading]);

  const merge = useCallback(
    (updates: Partial<OnboardingData>) => setData((current) => ({ ...current, ...updates })),
    [],
  );

  useEffect(() => {
    if (!isHydrated || step >= TOTAL_ONBOARDING_STEPS) return;

    void saveOnboardingDraft(draftKey, draftSecret, step, data);
  }, [isHydrated, step, data, draftKey, draftSecret]);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.consentData && data.consentPolicy;
      case 2:
        return !!data.gender;
      case 3:
        return Boolean(data.bulughDateHijri) || Boolean(data.revertDateHijri);
      case 4:
        return true;
      case 5:
        return data.dailyIntention >= 1;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (step < TOTAL_ONBOARDING_STEPS - 1) {
      setStep((current) => current + 1);
      return;
    }

    setIsSaving(true);
    setSaveError(false);
    setStep(TOTAL_ONBOARDING_STEPS);

    try {
      const result = await completeOnboardingMutation.mutateAsync({
        data,
        persistedPeriods,
      });

      hasCompletedWizardRef.current = true;
      setDebtResult(result);

      try {
        localStorage.removeItem(draftKey);
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
    if (step > 1) setStep((current) => current - 1);
  };

  const stepLabels = [
    t('onboarding.step_privacy'),
    t('onboarding.step_profile'),
    t('onboarding.step_bulugh'),
    t('onboarding.step_periods'),
    t('onboarding.step_intention'),
    t('onboarding.step_result'),
  ];

  const estimatedSalahDebt = useMemo(() => {
    if (!data.bulughDateHijri) {
      return 0;
    }

    return estimateSalahDebt(data.bulughDateHijri, data.periods, undefined, data.revertDateHijri);
  }, [data.bulughDateHijri, data.periods, data.revertDateHijri]);

  if (!isHydrated) {
    return (
      <div className={styles.wizard}>
        <div className={styles.loadingState}>
          <Loader2 className="animate-spin" size={22} />
          <span>{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wizard}>
      <header className={styles.wizardHeader}>
        <div className={styles.brandLink}>
          <BrandLockup tone="light" />
        </div>
        <div
          className={styles.stepDots}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemax={TOTAL_ONBOARDING_STEPS}
        >
          {Array.from({ length: TOTAL_ONBOARDING_STEPS }, (_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index + 1 === step ? styles.active : ''} ${index + 1 < step ? styles.done : ''}`}
              aria-label={`${stepLabels[index]} ${index + 1 < step ? t('onboarding.step_done') : index + 1 === step ? t('onboarding.step_current') : ''}`}
            />
          ))}
        </div>
        <span className={styles.stepCounter}>
          {t('onboarding.step_indicator', { current: step, total: TOTAL_ONBOARDING_STEPS })}
        </span>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerActionLink}
            onClick={onSkip}
            data-testid="onboarding-skip"
          >
            {t('onboarding.skip_cta')}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className={styles.progressBar}>
        <div className={`${styles.progressFill} ${styles[`progressStep${step}`]}`} />
      </div>

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
            username={data.username}
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
        {step === TOTAL_ONBOARDING_STEPS && (
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

      {step < TOTAL_ONBOARDING_STEPS && (
        <footer className={styles.footer}>
          <div className={styles.footerLead}>
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
              className={styles.skipBtn}
              onClick={onSkip}
              aria-label={t('onboarding.skip_cta')}
              data-testid="onboarding-skip"
            >
              {t('onboarding.skip_cta')}
            </button>
          </div>

          <button
            type="button"
            className={styles.nextBtn}
            onClick={handleNext}
            disabled={!canProceed()}
            aria-label={
              step === TOTAL_ONBOARDING_STEPS - 1 ? t('onboarding.finish') : t('onboarding.next')
            }
          >
            {step === TOTAL_ONBOARDING_STEPS - 1 ? t('onboarding.finish') : t('onboarding.next')}
            {step < TOTAL_ONBOARDING_STEPS - 1 && <ChevronRight size={16} />}
          </button>
        </footer>
      )}
    </div>
  );
};
