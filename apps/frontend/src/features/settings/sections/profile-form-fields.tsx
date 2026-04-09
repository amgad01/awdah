import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { DualDateLabel } from '@/components/ui/dual-date-label/dual-date-label';
import { BULUGH_DEFAULT_HIJRI_YEARS } from '@/lib/constants';
import { todayHijriDate } from '@/utils/date-utils';
import { ChoiceButtonGroup } from '../components';
import type { ProfileFormState } from '../types';
import styles from '../settings-page.module.css';

interface ProfileFormFieldsProps {
  form: ProfileFormState;
  dobError: string;
  bulughError: string;
  revertDateError: string;
  computedBulughAge: number | null;
  bulughLateWarning: boolean;
  bulughEarlyWarning: boolean;
  defaultBulughDate: string | null | undefined;
  showNoTakliefWarning: boolean;
  ageAtRevert: number | null;
  revertHidesBulugh: boolean;
  onDateOfBirthChange: (value: string) => void;
  onBulughModeChange: (mode: ProfileFormState['bulughInputMode']) => void;
  onBulughDateChange: (value: string) => void;
  onBulughAgeChange: (value: string) => void;
  onRevertToggle: (enabled: boolean) => void;
  onRevertDateChange: (value: string) => void;
  onGenderChange: (gender: ProfileFormState['gender']) => void;
  onDobError: (message: string) => void;
  onBulughError: (message: string) => void;
  onRevertDateError: (message: string) => void;
}

export const ProfileFormFields: React.FC<ProfileFormFieldsProps> = ({
  form,
  dobError,
  bulughError,
  revertDateError,
  computedBulughAge,
  bulughLateWarning,
  bulughEarlyWarning,
  defaultBulughDate,
  showNoTakliefWarning,
  ageAtRevert,
  revertHidesBulugh,
  onDateOfBirthChange,
  onBulughModeChange,
  onBulughDateChange,
  onBulughAgeChange,
  onRevertToggle,
  onRevertDateChange,
  onGenderChange,
  onDobError,
  onBulughError,
  onRevertDateError,
}) => {
  const { t, fmtNumber } = useLanguage();

  return (
    <div className={styles.profileFields}>
      <div className="formGroup">
        <label className="formLabel">{t('settings.dob')}</label>
        <div className={styles.fieldCurrent}>
          <span className={styles.fieldCurrentVal}>
            <DualDateLabel date={form.dateOfBirth} layout="inline" />
          </span>
        </div>
        <HijriDatePicker
          value={form.dateOfBirth}
          onChange={onDateOfBirthChange}
          onError={onDobError}
          label={t('settings.dob')}
          maxDate={todayHijriDate()}
        />
        {dobError && <p className={styles.fieldError}>{dobError}</p>}
      </div>

      <div className="formGroup">
        <label className="formLabel">{t('settings.is_revert_label')}</label>
        <ChoiceButtonGroup
          value={form.isRevert ? 'true' : 'false'}
          options={[
            { value: 'true', label: t('settings.revert_toggle_on') },
            { value: 'false', label: t('settings.revert_toggle_off') },
          ]}
          onChange={(value) => onRevertToggle(value === 'true')}
        />
      </div>

      {form.isRevert && (
        <div className="formGroup">
          <label className="formLabel">{t('settings.revert_date')}</label>
          <div className={styles.fieldCurrent}>
            <span className={styles.fieldCurrentVal}>
              <DualDateLabel date={form.revertDate} layout="inline" />
            </span>
          </div>
          <HijriDatePicker
            value={form.revertDate}
            onChange={onRevertDateChange}
            onError={onRevertDateError}
            label={t('settings.revert_date')}
            minDate={form.dateOfBirth || undefined}
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
          {ageAtRevert !== null && ageAtRevert < BULUGH_DEFAULT_HIJRI_YEARS && (
            <p className={styles.fieldWarning} role="alert">
              {t('settings.revert_bulugh_required')}
            </p>
          )}
          <p className={styles.fieldCurrent}>{t('onboarding.revert_bulugh_note')}</p>
        </div>
      )}

      {!revertHidesBulugh && (
        <div className="formGroup">
          <label className="formLabel">
            <TermTooltip termId="bulugh">{t('settings.bulugh_date')}</TermTooltip>
          </label>

          <ChoiceButtonGroup
            value={form.bulughInputMode}
            options={[
              { value: 'auto', label: t('settings.bulugh_mode_auto') },
              { value: 'date', label: t('onboarding.bulugh_mode_date') },
              { value: 'age', label: t('onboarding.bulugh_mode_age') },
            ]}
            onChange={onBulughModeChange}
          />

          {showNoTakliefWarning && (
            <p className={styles.fieldWarning} role="status">
              {t('onboarding.bulugh_no_taklief')}
            </p>
          )}

          {form.bulughInputMode === 'auto' ? (
            <div className={styles.ageInputGroup}>
              {!form.dateOfBirth ? (
                <p className={styles.fieldError}>{t('onboarding.bulugh_no_dob_hint')}</p>
              ) : defaultBulughDate ? (
                <>
                  <p className={styles.fieldCurrent}>{t('settings.bulugh_auto_hint')}</p>
                  <div className={styles.fieldCurrent}>
                    <span className={styles.fieldCurrentVal}>
                      <DualDateLabel date={defaultBulughDate} layout="inline" />
                    </span>
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
          ) : form.bulughInputMode === 'date' ? (
            <>
              <div className={styles.fieldCurrent}>
                <span className={styles.fieldCurrentVal}>
                  <DualDateLabel date={form.bulughDate} layout="inline" />
                </span>
              </div>
              <HijriDatePicker
                value={form.bulughDate}
                onChange={onBulughDateChange}
                onError={onBulughError}
                label={t('settings.bulugh_date')}
                minDate={form.dateOfBirth || undefined}
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
              {!form.dateOfBirth ? (
                <p className={styles.fieldError}>{t('onboarding.bulugh_no_dob_hint')}</p>
              ) : (
                <>
                  <div className={styles.ageInputRow}>
                    <input
                      type="number"
                      min={1}
                      max={70}
                      value={form.bulughAgeInput}
                      onChange={(event) => onBulughAgeChange(event.target.value)}
                      className={styles.ageInput}
                      placeholder="15"
                      aria-label={t('onboarding.bulugh_age_label')}
                    />
                    <span className={styles.ageInputSuffix}>
                      {t('onboarding.bulugh_age_suffix')}
                    </span>
                  </div>
                  {form.bulughAgeInput && form.bulughDate && (
                    <p className={styles.fieldCurrent}>
                      {t('onboarding.bulugh_age_gives')}{' '}
                      <span className={styles.fieldCurrentVal}>
                        <DualDateLabel date={form.bulughDate} layout="inline" />
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

      <div className="formGroup">
        <label className="formLabel">{t('settings.gender')}</label>
        <ChoiceButtonGroup
          value={form.gender}
          options={[
            { value: 'male', label: t('onboarding.gender_male') },
            { value: 'female', label: t('onboarding.gender_female') },
          ]}
          onChange={onGenderChange}
        />
      </div>
    </div>
  );
};
