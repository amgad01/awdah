import React, { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { isBulughBeforeDateOfBirth } from '@/lib/practicing-periods';
import { BULUGH_DEFAULT_HIJRI_YEARS } from '@/lib/constants';
import { todayHijriDate } from '@/utils/date-utils';
import {
  getAgeBasedBulughDate,
  getCurrentHijriAge,
  getDefaultBulughDate,
  isBulughEarly,
  isBulughLate,
} from '@/lib/profile-date-utils';
import { BookOpen, Save } from 'lucide-react';
import { SettingsSection, SectionNotice, DebtImpactPreview } from '../components';
import {
  createProfileFormState,
  buildDebtPreview,
  formatHijriDisplay,
  getErrorMessage,
  computeHijriAge,
} from '../helpers';
import { useToast } from '@/hooks/use-toast';
import type { ProfileFormState, FeedbackState, PeriodLike, DebtPreview } from '../types';
import styles from '../settings-page.module.css';

interface ProfileSectionProps {
  periods: PeriodLike[];
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ periods }) => {
  const { t, language, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const profileKey = profile
    ? `${profile.username ?? ''}-${profile.dateOfBirth ?? ''}-${profile.bulughDate}-${profile.revertDate ?? ''}-${profile.gender}`
    : '';

  const [dobError, setDobError] = useState('');
  const [bulughError, setBulughError] = useState('');
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    createProfileFormState(
      profileKey,
      profile,
      getDefaultBulughDate(profile?.dateOfBirth || undefined, { allowFuture: true }),
    ),
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [revertDateError, setRevertDateError] = useState('');

  const activeProfileForm =
    profileForm.sourceKey === profileKey
      ? profileForm
      : createProfileFormState(
          profileKey,
          profile,
          getDefaultBulughDate(profile?.dateOfBirth || undefined, { allowFuture: true }),
        );

  const updateProfileForm = useCallback(
    (updates: Partial<Omit<ProfileFormState, 'sourceKey'>>) => {
      setProfileForm((current) => ({
        ...(current.sourceKey === profileKey
          ? current
          : createProfileFormState(
              profileKey,
              profile,
              getDefaultBulughDate(profile?.dateOfBirth || undefined, { allowFuture: true }),
            )),
        ...updates,
        sourceKey: profileKey,
      }));
    },
    [profileKey, profile],
  );

  const fmtHijri = (hijriStr: string, invert = false) =>
    formatHijriDisplay(hijriStr, language, t, fmtNumber, invert);

  const persistedBulughDate = profile?.bulughDate;
  const persistedRevertDate = profile?.revertDate;
  const persistedPeriods = useMemo(() => periods, [periods]);

  const computedBulughAge = useMemo(
    () => computeHijriAge(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.dateOfBirth, activeProfileForm.bulughDate],
  );

  const bulughLateWarning = useMemo(
    () => isBulughLate(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.dateOfBirth, activeProfileForm.bulughDate],
  );

  const bulughEarlyWarning = useMemo(
    () => isBulughEarly(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.dateOfBirth, activeProfileForm.bulughDate],
  );

  const defaultBulughDate = useMemo(
    () => getDefaultBulughDate(activeProfileForm.dateOfBirth, { allowFuture: true }),
    [activeProfileForm.dateOfBirth],
  );
  const currentHijriAge = useMemo(
    () => getCurrentHijriAge(activeProfileForm.dateOfBirth),
    [activeProfileForm.dateOfBirth],
  );
  const showNoTakliefWarning = currentHijriAge !== null && currentHijriAge < 12;

  const ageAtRevert = useMemo(
    () =>
      activeProfileForm.isRevert
        ? computeHijriAge(activeProfileForm.dateOfBirth, activeProfileForm.revertDate)
        : null,
    [activeProfileForm.isRevert, activeProfileForm.dateOfBirth, activeProfileForm.revertDate],
  );

  const revertHidesBulugh =
    activeProfileForm.isRevert && ageAtRevert !== null && ageAtRevert >= BULUGH_DEFAULT_HIJRI_YEARS;

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

  const profileDebtPreview = useMemo(() => {
    const bulughChanged = persistedBulughDate !== activeProfileForm.bulughDate;
    const revertChanged = (persistedRevertDate ?? '') !== (activeProfileForm.revertDate ?? '');
    if (!bulughChanged && !revertChanged) return null;
    return buildDebtPreview(
      persistedBulughDate,
      activeProfileForm.bulughDate,
      persistedPeriods,
      persistedPeriods,
      persistedRevertDate,
      activeProfileForm.revertDate || undefined,
    );
  }, [
    persistedBulughDate,
    persistedRevertDate,
    activeProfileForm.bulughDate,
    activeProfileForm.revertDate,
    persistedPeriods,
  ]);

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

  const handleSaveProfile = () => {
    if (!validateProfileForm()) return;
    // If debt-affecting fields are changing, show inline confirmation first
    if (profileDebtPreview) {
      setShowSaveConfirm(true);
    } else {
      void executeProfileSave();
    }
  };

  const executeProfileSave = async () => {
    setShowSaveConfirm(false);
    setProfileSaved(false);
    try {
      await updateProfile.mutateAsync({
        username: activeProfileForm.username.trim() || undefined,
        bulughDate: activeProfileForm.bulughDate,
        gender: activeProfileForm.gender,
        dateOfBirth: activeProfileForm.dateOfBirth || undefined,
        revertDate: activeProfileForm.revertDate || undefined,
      });

      const successMsg = profileDebtPreview
        ? `${t('settings.profile_saved')}. ${describeDebtPreview(profileDebtPreview)}`
        : t('settings.profile_saved');
      toast.success(successMsg);
    } catch (error) {
      toast.error(t(getErrorMessage(error, 'common.error')));
    }
  };

  const handleBulughAgeChange = (ageStr: string) => {
    setBulughError('');
    const computedBulughDate = getAgeBasedBulughDate(activeProfileForm.dateOfBirth, ageStr, {
      allowFuture: true,
    });
    if (!computedBulughDate) {
      updateProfileForm({ bulughAgeInput: ageStr, bulughDate: '' });
      return;
    }
    updateProfileForm({ bulughAgeInput: ageStr, bulughDate: computedBulughDate });
  };

  const handleRevertToggle = (enabled: boolean) => {
    setRevertDateError('');
    if (!enabled) {
      updateProfileForm({ isRevert: false, revertDate: '' });
    } else {
      const updates: Partial<ProfileFormState> = { isRevert: true };
      if (defaultBulughDate && !activeProfileForm.bulughDate) {
        updates.bulughDate = defaultBulughDate;
      }
      updateProfileForm(updates);
    }
  };

  const handleRevertDateChange = (value: string) => {
    setRevertDateError('');
    const age = activeProfileForm.dateOfBirth
      ? computeHijriAge(activeProfileForm.dateOfBirth, value)
      : null;

    if (age !== null && age >= BULUGH_DEFAULT_HIJRI_YEARS && defaultBulughDate) {
      updateProfileForm({ revertDate: value, bulughDate: defaultBulughDate });
    } else if (!activeProfileForm.bulughDate) {
      updateProfileForm({ revertDate: value, bulughDate: value });
    } else {
      updateProfileForm({ revertDate: value });
    }
  };

  return (
    <SettingsSection icon={<BookOpen size={18} />} title={t('settings.profile_section')}>
      <p className={styles.privacyText}>{t('settings.profile_edit_hint')}</p>
      {profileFeedback ? <SectionNotice feedback={profileFeedback} /> : null}

      <div className={styles.profileFields}>
        {/* Date of Birth */}
        <div className="formGroup">
          <label className="formLabel">{t('settings.dob')}</label>
          <div className={styles.fieldCurrent}>
            <span className={styles.fieldCurrentVal}>
              {fmtHijri(activeProfileForm.dateOfBirth)}
            </span>
          </div>
          <HijriDatePicker
            value={activeProfileForm.dateOfBirth}
            onChange={(value) => {
              setDobError('');
              const newDefault = getDefaultBulughDate(value, { allowFuture: true });
              const updates: Partial<ProfileFormState> = { dateOfBirth: value };

              if (activeProfileForm.bulughInputMode === 'auto' && newDefault) {
                updates.bulughDate = newDefault;
              }
              updateProfileForm(updates);
            }}
            onError={setDobError}
            label={t('settings.dob')}
            maxDate={todayHijriDate()}
          />
          {dobError && <p className={styles.fieldError}>{dobError}</p>}
        </div>

        {/* Revert Toggle */}
        <div className="formGroup">
          <label className="formLabel">{t('settings.is_revert_label')}</label>
          <div className={styles.genderBtns}>
            <button
              type="button"
              className={`${styles.genderBtn} ${activeProfileForm.isRevert ? styles.genderActive : ''}`}
              onClick={() => handleRevertToggle(true)}
            >
              {t('settings.revert_toggle_on')}
            </button>
            <button
              type="button"
              className={`${styles.genderBtn} ${!activeProfileForm.isRevert ? styles.genderActive : ''}`}
              onClick={() => handleRevertToggle(false)}
            >
              {t('settings.revert_toggle_off')}
            </button>
          </div>
        </div>

        {/* Revert Date */}
        {activeProfileForm.isRevert && (
          <div className="formGroup">
            <label className="formLabel">{t('settings.revert_date')}</label>
            <div className={styles.fieldCurrent}>
              <span className={styles.fieldCurrentVal}>
                {fmtHijri(activeProfileForm.revertDate)}
              </span>
            </div>
            <HijriDatePicker
              value={activeProfileForm.revertDate}
              onChange={handleRevertDateChange}
              onError={setRevertDateError}
              label={t('settings.revert_date')}
              minDate={activeProfileForm.dateOfBirth || undefined}
              maxDate={todayHijriDate()}
            />
            {revertDateError && <p className={styles.fieldError}>{revertDateError}</p>}
            {ageAtRevert !== null && (
              <p className={styles.fieldCurrent}>
                {t('settings.revert_age_at_revert', { n: fmtNumber(ageAtRevert) })}
              </p>
            )}
            {revertHidesBulugh && (
              <p className={styles.fieldCurrent}>{t('settings.revert_bulugh_auto')}</p>
            )}
            {activeProfileForm.isRevert &&
              ageAtRevert !== null &&
              ageAtRevert < BULUGH_DEFAULT_HIJRI_YEARS && (
                <p className={styles.fieldWarning} role="alert">
                  {t('settings.revert_bulugh_required')}
                </p>
              )}
            <p className={styles.fieldCurrent}>{t('onboarding.revert_bulugh_note')}</p>
          </div>
        )}

        {/* Bulugh Date — hidden when revert age >= 15 */}
        {!revertHidesBulugh && (
          <div className="formGroup">
            <label className="formLabel">
              <TermTooltip termId="bulugh">{t('settings.bulugh_date')}</TermTooltip>
            </label>

            <div className={styles.genderBtns}>
              <button
                type="button"
                className={`${styles.genderBtn} ${activeProfileForm.bulughInputMode === 'auto' ? styles.genderActive : ''}`}
                onClick={() => {
                  setDobError('');
                  const updates: Partial<ProfileFormState> = {
                    bulughInputMode: 'auto',
                    bulughAgeInput: '',
                  };
                  if (defaultBulughDate) {
                    updates.bulughDate = defaultBulughDate;
                  }
                  updateProfileForm(updates);
                }}
              >
                {t('settings.bulugh_mode_auto')}
              </button>
              <button
                type="button"
                className={`${styles.genderBtn} ${activeProfileForm.bulughInputMode === 'date' ? styles.genderActive : ''}`}
                onClick={() => {
                  updateProfileForm({ bulughInputMode: 'date' });
                }}
              >
                {t('onboarding.bulugh_mode_date')}
              </button>
              <button
                type="button"
                className={`${styles.genderBtn} ${activeProfileForm.bulughInputMode === 'age' ? styles.genderActive : ''}`}
                onClick={() => {
                  updateProfileForm({ bulughInputMode: 'age' });
                }}
              >
                {t('onboarding.bulugh_mode_age')}
              </button>
            </div>

            {showNoTakliefWarning && (
              <p className={styles.fieldWarning} role="status">
                {t('onboarding.bulugh_no_taklief')}
              </p>
            )}

            {activeProfileForm.bulughInputMode === 'auto' ? (
              <div className={styles.ageInputGroup}>
                {!activeProfileForm.dateOfBirth ? (
                  <p className={styles.fieldError}>{t('onboarding.bulugh_no_dob_hint')}</p>
                ) : defaultBulughDate ? (
                  <>
                    <p className={styles.fieldCurrent}>{t('settings.bulugh_auto_hint')}</p>
                    <div className={styles.fieldCurrent}>
                      <span className={styles.fieldCurrentVal}>{fmtHijri(defaultBulughDate)}</span>
                    </div>
                    <p className={styles.fieldCurrent}>
                      {t('settings.bulugh_auto_caption', {
                        n: fmtNumber(BULUGH_DEFAULT_HIJRI_YEARS),
                      })}
                    </p>
                  </>
                ) : (
                  <p className={styles.fieldWarning} role="alert">
                    {t('settings.bulugh_auto_unavailable')}
                  </p>
                )}
              </div>
            ) : activeProfileForm.bulughInputMode === 'date' ? (
              <>
                <div className={styles.fieldCurrent}>
                  <span className={styles.fieldCurrentVal}>
                    {fmtHijri(activeProfileForm.bulughDate)}
                  </span>
                </div>
                <HijriDatePicker
                  value={activeProfileForm.bulughDate}
                  onChange={(value) => {
                    setBulughError('');
                    updateProfileForm({ bulughDate: value });
                  }}
                  onError={setBulughError}
                  label={t('settings.bulugh_date')}
                  minDate={activeProfileForm.dateOfBirth || undefined}
                  maxDate={todayHijriDate()}
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
                {bulughEarlyWarning && (
                  <p className={styles.fieldWarning} role="alert">
                    {t('settings.bulugh_early_warning')}
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
                        value={activeProfileForm.bulughAgeInput}
                        onChange={(e) => handleBulughAgeChange(e.target.value)}
                        className={styles.ageInput}
                        placeholder="15"
                        aria-label={t('onboarding.bulugh_age_label')}
                      />
                      <span className={styles.ageInputSuffix}>
                        {t('onboarding.bulugh_age_suffix')}
                      </span>
                    </div>
                    {activeProfileForm.bulughAgeInput && activeProfileForm.bulughDate && (
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
        )}

        {/* Gender */}
        <div className="formGroup">
          <label className="formLabel">{t('settings.gender')}</label>
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

      {showSaveConfirm ? (
        <div className={styles.inlineConfirm} role="alert">
          <p className={styles.inlineConfirmMsg}>{t('settings.confirm_profile_change_body')}</p>
          {profileDebtPreview && (
            <p className={styles.inlineConfirmPreview}>{describeDebtPreview(profileDebtPreview)}</p>
          )}
          <div className={styles.inlineConfirmActions}>
            <button
              type="button"
              className={styles.cancelAddBtn}
              onClick={() => setShowSaveConfirm(false)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={styles.saveProfileBtn}
              onClick={() => void executeProfileSave()}
              disabled={updateProfile.isPending}
            >
              <Save size={14} />
              {updateProfile.isPending ? t('settings.saving_profile') : t('common.confirm')}
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </SettingsSection>
  );
};
