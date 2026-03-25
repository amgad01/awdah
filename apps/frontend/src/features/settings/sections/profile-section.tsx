import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { HijriDate } from '@awdah/shared';
import { isBulughBeforeDateOfBirth } from '@/lib/practicing-periods';
import { BookOpen, Save } from 'lucide-react';
import { SettingsSection, SectionNotice, DebtImpactPreview } from '../components';
import {
  createProfileFormState,
  buildDebtPreview,
  formatHijriDisplay,
  getErrorMessage,
} from '../helpers';
import type { ProfileFormState, FeedbackState, PeriodLike, DebtPreview } from '../types';
import styles from '../settings-page.module.css';

interface ProfileSectionProps {
  periods: PeriodLike[];
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ periods }) => {
  const { t, language, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const profileKey = profile
    ? `${profile.dateOfBirth}-${profile.bulughDate}-${profile.gender}`
    : '';

  const [dobError, setDobError] = useState('');
  const [bulughError, setBulughError] = useState('');
  const [bulughInputMode, setBulughInputMode] = useState<'date' | 'age'>('date');
  const [bulughAgeInput, setBulughAgeInput] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    createProfileFormState(profileKey, profile),
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(null);

  const activeProfileForm =
    profileForm.sourceKey === profileKey
      ? profileForm
      : createProfileFormState(profileKey, profile);

  const updateProfileForm = (updates: Partial<Omit<ProfileFormState, 'sourceKey'>>) => {
    setProfileForm((current) => ({
      ...(current.sourceKey === profileKey ? current : createProfileFormState(profileKey, profile)),
      ...updates,
      sourceKey: profileKey,
    }));
  };

  const fmtHijri = (hijriStr: string, invert = false) =>
    formatHijriDisplay(hijriStr, language, t, fmtNumber, invert);

  const persistedBulughDate = profile?.bulughDate;
  const persistedPeriods = useMemo(() => periods, [periods]);

  const computedBulughAge = useMemo(() => {
    if (!activeProfileForm.dateOfBirth || !activeProfileForm.bulughDate) return null;
    try {
      const dob = HijriDate.fromString(activeProfileForm.dateOfBirth);
      const bulugh = HijriDate.fromString(activeProfileForm.bulughDate);
      let age = bulugh.year - dob.year;
      if (bulugh.month < dob.month || (bulugh.month === dob.month && bulugh.day < dob.day)) {
        age -= 1;
      }
      return age;
    } catch {
      return null;
    }
  }, [activeProfileForm.dateOfBirth, activeProfileForm.bulughDate]);

  const bulughLateWarning = useMemo(() => {
    if (!activeProfileForm.dateOfBirth || !activeProfileForm.bulughDate) return false;
    try {
      const dob = HijriDate.fromString(activeProfileForm.dateOfBirth);
      const threshold = new HijriDate(dob.year + 15, dob.month, dob.day);
      return HijriDate.fromString(activeProfileForm.bulughDate).isAfter(threshold);
    } catch {
      return false;
    }
  }, [activeProfileForm.dateOfBirth, activeProfileForm.bulughDate]);

  const profileHasChanges = useMemo(
    () =>
      activeProfileForm.bulughDate !== (profile?.bulughDate ?? '') ||
      activeProfileForm.dateOfBirth !== (profile?.dateOfBirth ?? '') ||
      activeProfileForm.gender !== (profile?.gender ?? 'male') ||
      activeProfileForm.revertDate !== (profile?.revertDate ?? ''),
    [activeProfileForm, profile],
  );

  const describeDebtPreview = (preview: DebtPreview) => {
    if (preview.delta < 0) {
      return t('settings.debt_preview_reduced', { n: fmtNumber(Math.abs(preview.delta)) });
    }
    if (preview.delta > 0) {
      return t('settings.debt_preview_increased', { n: fmtNumber(preview.delta) });
    }
    return t('settings.debt_preview_unchanged');
  };

  const formatPreviewSummary = (preview: DebtPreview) =>
    t('settings.confirm_profile_change_preview', {
      current: fmtNumber(preview.current),
      next: fmtNumber(preview.next),
    });

  const profileDebtPreview = useMemo(
    () =>
      persistedBulughDate === activeProfileForm.bulughDate
        ? null
        : buildDebtPreview(
            persistedBulughDate,
            activeProfileForm.bulughDate,
            persistedPeriods,
            persistedPeriods,
          ),
    [persistedBulughDate, activeProfileForm.bulughDate, persistedPeriods],
  );

  const validateProfileForm = (): boolean => {
    setDobError('');
    setBulughError('');
    setProfileFeedback(null);
    if (!activeProfileForm.bulughDate) return false;
    if (
      isBulughBeforeDateOfBirth(
        activeProfileForm.dateOfBirth || undefined,
        activeProfileForm.bulughDate,
      )
    ) {
      const message = t('onboarding.bulugh_error_before_dob');
      setBulughError(message);
      setProfileFeedback({ tone: 'error', message });
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;
    const previewSummary = profileDebtPreview
      ? `\n\n${formatPreviewSummary(profileDebtPreview)}\n${describeDebtPreview(profileDebtPreview)}`
      : '';
    const confirmed = window.confirm(
      `${t('settings.confirm_profile_change_title')}\n\n${t('settings.confirm_profile_change_body')}${previewSummary}`,
    );
    if (!confirmed) return;
    setProfileSaved(false);
    try {
      await updateProfile.mutateAsync({
        bulughDate: activeProfileForm.bulughDate,
        gender: activeProfileForm.gender,
        dateOfBirth: activeProfileForm.dateOfBirth || undefined,
        revertDate: activeProfileForm.revertDate || undefined,
      });
      setProfileSaved(true);
      setProfileFeedback({
        tone: 'success',
        message: profileDebtPreview
          ? `${t('settings.profile_saved')}. ${describeDebtPreview(profileDebtPreview)}`
          : t('settings.profile_saved'),
      });
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      setProfileFeedback({ tone: 'error', message: getErrorMessage(error, t('common.error')) });
    }
  };

  const handleBulughAgeChange = (ageStr: string) => {
    setBulughAgeInput(ageStr);
    const age = parseInt(ageStr, 10);
    if (!activeProfileForm.dateOfBirth || !ageStr || isNaN(age) || age < 1 || age > 70) {
      updateProfileForm({ bulughDate: '' });
      return;
    }
    try {
      const dob = HijriDate.fromString(activeProfileForm.dateOfBirth);
      const computed = new HijriDate(dob.year + age, dob.month, dob.day);
      updateProfileForm({ bulughDate: computed.toString() });
    } catch {
      updateProfileForm({ bulughDate: '' });
    }
  };

  return (
    <SettingsSection icon={<BookOpen size={18} />} title={t('settings.profile_section')}>
      <p className={styles.privacyText}>{t('settings.profile_edit_hint')}</p>
      {profileFeedback ? <SectionNotice feedback={profileFeedback} /> : null}

      <div className={styles.profileFields}>
        {/* Date of Birth */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>{t('settings.dob')}</label>
          <div className={styles.fieldCurrent}>
            <span className={styles.fieldCurrentVal}>
              {fmtHijri(activeProfileForm.dateOfBirth)}
            </span>
          </div>
          <HijriDatePicker
            value={activeProfileForm.dateOfBirth}
            onChange={(value) => updateProfileForm({ dateOfBirth: value })}
            onError={setDobError}
            label={t('settings.dob')}
          />
          {dobError && <p className={styles.fieldError}>{dobError}</p>}
        </div>

        {/* Bulugh Date */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <TermTooltip termId="bulugh">{t('settings.bulugh_date')}</TermTooltip>
          </label>

          <div className={styles.genderBtns}>
            <button
              type="button"
              className={`${styles.genderBtn} ${bulughInputMode === 'date' ? styles.genderActive : ''}`}
              onClick={() => setBulughInputMode('date')}
            >
              {t('onboarding.bulugh_mode_date')}
            </button>
            <button
              type="button"
              className={`${styles.genderBtn} ${bulughInputMode === 'age' ? styles.genderActive : ''}`}
              onClick={() => setBulughInputMode('age')}
            >
              {t('onboarding.bulugh_mode_age')}
            </button>
          </div>

          {bulughInputMode === 'date' ? (
            <>
              <div className={styles.fieldCurrent}>
                <span className={styles.fieldCurrentVal}>
                  {fmtHijri(activeProfileForm.bulughDate)}
                </span>
              </div>
              <HijriDatePicker
                value={activeProfileForm.bulughDate}
                onChange={(value) => updateProfileForm({ bulughDate: value })}
                onError={setBulughError}
                label={t('settings.bulugh_date')}
              />
              {computedBulughAge !== null && (
                <p className={styles.fieldCurrent}>
                  {t('settings.bulugh_computed_age', { n: fmtNumber(computedBulughAge) })}
                </p>
              )}
              {bulughLateWarning && (
                <p className={styles.fieldWarning} role="alert">
                  {t('settings.bulugh_late_warning')}
                </p>
              )}
            </>
          ) : (
            <div className={styles.ageInputGroup}>
              {!activeProfileForm.dateOfBirth ? (
                <p className={styles.fieldError}>{t('onboarding.bulugh_no_dob_hint')}</p>
              ) : (
                <>
                  <div className={styles.ageInputRow}>
                    <input
                      type="number"
                      min={1}
                      max={70}
                      value={bulughAgeInput}
                      onChange={(e) => handleBulughAgeChange(e.target.value)}
                      className={styles.ageInput}
                      placeholder="15"
                      aria-label={t('onboarding.bulugh_age_label')}
                    />
                    <span className={styles.ageInputSuffix}>
                      {t('onboarding.bulugh_age_suffix')}
                    </span>
                  </div>
                  {bulughAgeInput && activeProfileForm.bulughDate && (
                    <p className={styles.fieldCurrent}>
                      {t('onboarding.bulugh_age_gives')}{' '}
                      <span className={styles.fieldCurrentVal}>
                        {fmtHijri(activeProfileForm.bulughDate)}
                      </span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {bulughError && <p className={styles.fieldError}>{bulughError}</p>}
        </div>

        {/* Gender */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>{t('settings.gender')}</label>
          <div className={styles.genderBtns}>
            <button
              className={`${styles.genderBtn} ${activeProfileForm.gender === 'male' ? styles.genderActive : ''}`}
              onClick={() => updateProfileForm({ gender: 'male' })}
            >
              {t('onboarding.gender_male')}
            </button>
            <button
              className={`${styles.genderBtn} ${activeProfileForm.gender === 'female' ? styles.genderActive : ''}`}
              onClick={() => updateProfileForm({ gender: 'female' })}
            >
              {t('onboarding.gender_female')}
            </button>
          </div>
        </div>
      </div>

      {profileDebtPreview ? <DebtImpactPreview preview={profileDebtPreview} /> : null}

      <button
        className={styles.saveProfileBtn}
        onClick={handleSaveProfile}
        disabled={updateProfile.isPending || !activeProfileForm.bulughDate || !profileHasChanges}
      >
        <Save size={16} />
        {updateProfile.isPending
          ? t('settings.saving_profile')
          : profileSaved
            ? t('settings.profile_saved')
            : t('settings.save_profile')}
      </button>
    </SettingsSection>
  );
};
