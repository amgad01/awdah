import { useCallback, useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
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
import {
  buildDebtPreview,
  computeHijriAge,
  createProfileFormState,
  getErrorMessage,
} from '../helpers';
import type { DebtPreview, FeedbackState, PeriodLike, ProfileFormState } from '../types';

interface UseProfileSectionOptions {
  periods: PeriodLike[];
}

export const useProfileSection = ({ periods }: UseProfileSectionOptions) => {
  const { t, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const profileKey = profile
    ? `${profile.username ?? ''}-${profile.dateOfBirth ?? ''}-${profile.bulughDate}-${profile.revertDate ?? ''}-${profile.gender}`
    : '';

  const createInitialFormState = useCallback(
    () =>
      createProfileFormState(
        profileKey,
        profile,
        getDefaultBulughDate(profile?.dateOfBirth || undefined, { allowFuture: true }),
      ),
    [profile, profileKey],
  );

  const [dobError, setDobError] = useState('');
  const [bulughError, setBulughError] = useState('');
  const [revertDateError, setRevertDateError] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<FeedbackState | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(createInitialFormState);

  const needsSetup =
    !profile?.bulughDate || !profile?.dateOfBirth || profile.bulughDate > todayHijriDate();
  const [isEditing, setIsEditing] = useState(needsSetup);

  const activeProfileForm =
    profileForm.sourceKey === profileKey ? profileForm : createInitialFormState();

  const updateProfileForm = useCallback(
    (updates: Partial<Omit<ProfileFormState, 'sourceKey'>>) => {
      setProfileForm((current) => ({
        ...(current.sourceKey === profileKey ? current : createInitialFormState()),
        ...updates,
        sourceKey: profileKey,
      }));
    },
    [createInitialFormState, profileKey],
  );

  const persistedBulughDate = profile?.bulughDate;
  const persistedRevertDate = profile?.revertDate;
  const persistedPeriods = useMemo(() => periods, [periods]);

  const computedBulughAge = useMemo(
    () => computeHijriAge(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.bulughDate, activeProfileForm.dateOfBirth],
  );
  const bulughLateWarning = useMemo(
    () => isBulughLate(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.bulughDate, activeProfileForm.dateOfBirth],
  );
  const bulughEarlyWarning = useMemo(
    () => isBulughEarly(activeProfileForm.dateOfBirth, activeProfileForm.bulughDate),
    [activeProfileForm.bulughDate, activeProfileForm.dateOfBirth],
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
    [activeProfileForm.dateOfBirth, activeProfileForm.isRevert, activeProfileForm.revertDate],
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

  const describeDebtPreview = useCallback(
    (preview: DebtPreview) => {
      if (preview.delta < 0) {
        return t('settings.debt_preview_reduced', { n: fmtNumber(Math.abs(preview.delta)) });
      }
      if (preview.delta > 0) {
        return t('settings.debt_preview_increased', { n: fmtNumber(preview.delta) });
      }
      return t('settings.debt_preview_unchanged');
    },
    [fmtNumber, t],
  );

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
    activeProfileForm.bulughDate,
    activeProfileForm.revertDate,
    persistedBulughDate,
    persistedPeriods,
    persistedRevertDate,
  ]);

  const validateProfileForm = useCallback(() => {
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
  }, [activeProfileForm.bulughDate, activeProfileForm.dateOfBirth, t]);

  const executeProfileSave = useCallback(async () => {
    setShowSaveConfirm(false);

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
      setIsEditing(false);
    } catch (error) {
      toast.error(t(getErrorMessage(error, 'common.error')));
    }
  }, [activeProfileForm, describeDebtPreview, profileDebtPreview, t, toast, updateProfile]);

  const handleSaveProfile = useCallback(() => {
    if (!validateProfileForm()) return;
    if (profileDebtPreview) {
      setShowSaveConfirm(true);
      return;
    }
    void executeProfileSave();
  }, [executeProfileSave, profileDebtPreview, validateProfileForm]);

  const handleDateOfBirthChange = useCallback(
    (value: string) => {
      setDobError('');
      const newDefault = getDefaultBulughDate(value, { allowFuture: true });
      const updates: Partial<ProfileFormState> = { dateOfBirth: value };

      if (activeProfileForm.bulughInputMode === 'auto' && newDefault) {
        updates.bulughDate = newDefault;
      }

      updateProfileForm(updates);
    },
    [activeProfileForm.bulughInputMode, updateProfileForm],
  );

  const handleBulughModeChange = useCallback(
    (mode: ProfileFormState['bulughInputMode']) => {
      if (mode === 'auto') {
        setDobError('');
        const updates: Partial<ProfileFormState> = {
          bulughInputMode: 'auto',
          bulughAgeInput: '',
        };
        if (defaultBulughDate) {
          updates.bulughDate = defaultBulughDate;
        }
        updateProfileForm(updates);
        return;
      }

      updateProfileForm({ bulughInputMode: mode });
    },
    [defaultBulughDate, updateProfileForm],
  );

  const handleBulughDateChange = useCallback(
    (value: string) => {
      setBulughError('');
      updateProfileForm({ bulughDate: value });
    },
    [updateProfileForm],
  );

  const handleBulughAgeChange = useCallback(
    (ageStr: string) => {
      setBulughError('');
      const computedBulughDate = getAgeBasedBulughDate(activeProfileForm.dateOfBirth, ageStr, {
        allowFuture: true,
      });
      if (!computedBulughDate) {
        updateProfileForm({ bulughAgeInput: ageStr, bulughDate: '' });
        return;
      }
      updateProfileForm({ bulughAgeInput: ageStr, bulughDate: computedBulughDate });
    },
    [activeProfileForm.dateOfBirth, updateProfileForm],
  );

  const handleRevertToggle = useCallback(
    (enabled: boolean) => {
      setRevertDateError('');
      if (!enabled) {
        updateProfileForm({ isRevert: false, revertDate: '' });
        return;
      }

      const updates: Partial<ProfileFormState> = { isRevert: true };
      if (defaultBulughDate && !activeProfileForm.bulughDate) {
        updates.bulughDate = defaultBulughDate;
      }
      updateProfileForm(updates);
    },
    [activeProfileForm.bulughDate, defaultBulughDate, updateProfileForm],
  );

  const handleRevertDateChange = useCallback(
    (value: string) => {
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
    },
    [
      activeProfileForm.bulughDate,
      activeProfileForm.dateOfBirth,
      defaultBulughDate,
      updateProfileForm,
    ],
  );

  const handleGenderChange = useCallback(
    (gender: ProfileFormState['gender']) => {
      updateProfileForm({ gender });
    },
    [updateProfileForm],
  );

  return {
    profile,
    updateProfilePending: updateProfile.isPending,
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
  };
};
