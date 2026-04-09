import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { BookOpen, Save } from 'lucide-react';
import { SettingsSection, SectionNotice, DebtImpactPreview } from '../components';
import type { PeriodLike } from '../types';
import { ProfileFormFields } from './profile-form-fields';
import { ProfileSaveConfirm } from './profile-save-confirm';
import { ProfileSummaryCard } from './profile-summary-card';
import { useProfileSection } from './use-profile-section';
import styles from '../settings-page.module.css';

interface ProfileSectionProps {
  periods: PeriodLike[];
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ periods }) => {
  const { t } = useLanguage();
  const {
    profile,
    updateProfilePending,
    isEditing,
    setIsEditing,
    showSaveConfirm,
    setShowSaveConfirm,
    profileFeedback,
    activeProfileForm,
    dobError,
    setDobError,
    bulughError,
    setBulughError,
    revertDateError,
    setRevertDateError,
    computedBulughAge,
    bulughLateWarning,
    bulughEarlyWarning,
    defaultBulughDate,
    showNoTakliefWarning,
    ageAtRevert,
    revertHidesBulugh,
    profileHasChanges,
    profileDebtPreview,
    describeDebtPreview,
    handleSaveProfile,
    executeProfileSave,
    handleDateOfBirthChange,
    handleBulughModeChange,
    handleBulughDateChange,
    handleBulughAgeChange,
    handleRevertToggle,
    handleRevertDateChange,
    handleGenderChange,
  } = useProfileSection({ periods });

  return (
    <SettingsSection icon={<BookOpen size={18} />} title={t('settings.profile_section')}>
      {!isEditing ? (
        <ProfileSummaryCard
          gender={profile?.gender}
          dateOfBirth={profile?.dateOfBirth}
          bulughDate={profile?.bulughDate}
          revertDate={profile?.revertDate}
          onEdit={() => setIsEditing(true)}
        />
      ) : (
        <>
          <p className={styles.privacyText}>{t('settings.profile_edit_hint')}</p>
          {profileFeedback ? <SectionNotice feedback={profileFeedback} /> : null}

          <ProfileFormFields
            form={activeProfileForm}
            dobError={dobError}
            bulughError={bulughError}
            revertDateError={revertDateError}
            computedBulughAge={computedBulughAge}
            bulughLateWarning={bulughLateWarning}
            bulughEarlyWarning={bulughEarlyWarning}
            defaultBulughDate={defaultBulughDate}
            showNoTakliefWarning={showNoTakliefWarning}
            ageAtRevert={ageAtRevert}
            revertHidesBulugh={revertHidesBulugh}
            onDateOfBirthChange={handleDateOfBirthChange}
            onBulughModeChange={handleBulughModeChange}
            onBulughDateChange={handleBulughDateChange}
            onBulughAgeChange={handleBulughAgeChange}
            onRevertToggle={handleRevertToggle}
            onRevertDateChange={handleRevertDateChange}
            onGenderChange={handleGenderChange}
            onDobError={setDobError}
            onBulughError={setBulughError}
            onRevertDateError={setRevertDateError}
          />

          {profileDebtPreview ? <DebtImpactPreview preview={profileDebtPreview} /> : null}

          {showSaveConfirm ? (
            <ProfileSaveConfirm
              preview={profileDebtPreview}
              describeDebtPreview={describeDebtPreview}
              isPending={updateProfilePending}
              onCancel={() => setShowSaveConfirm(false)}
              onConfirm={() => void executeProfileSave()}
            />
          ) : (
            <button
              className={styles.saveProfileBtn}
              onClick={handleSaveProfile}
              disabled={updateProfilePending || !activeProfileForm.bulughDate || !profileHasChanges}
            >
              <Save size={16} />
              {updateProfilePending ? t('settings.saving_profile') : t('settings.save_profile')}
            </button>
          )}
        </>
      )}
    </SettingsSection>
  );
};
