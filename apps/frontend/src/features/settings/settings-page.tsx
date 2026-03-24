import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import {
  useDeleteAccount,
  useExportData,
  useProfile,
  useUpdateProfile,
  usePracticingPeriods,
  useAddPracticingPeriod,
  useUpdatePracticingPeriod,
  useDeletePracticingPeriod,
} from '@/hooks/use-profile';
import { useResetPrayerLogs, useResetFastLogs } from '@/hooks/use-worship';
import { Card } from '@/components/ui/card/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher/language-switcher';
import { HijriDatePicker } from '@/components/hijri-date-picker/hijri-date-picker';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { HijriDate } from '@awdah/shared';
import {
  estimateSalahDebt,
  isBulughBeforeDateOfBirth,
  rangesOverlap,
} from '@/lib/practicing-periods';
import {
  User,
  Bell,
  Languages,
  Info,
  LogOut,
  Shield,
  Trash2,
  Download,
  BookOpen,
  Plus,
  X,
  Save,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { HIJRI_MONTH_KEYS } from '@/lib/constants';
import styles from './settings-page.module.css';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

type ProfileFormState = {
  sourceKey: string;
  dateOfBirth: string;
  bulughDate: string;
  revertDate: string;
  gender: 'male' | 'female';
};

type FeedbackState = {
  tone: 'success' | 'error';
  message: string;
};

type PeriodLike = {
  periodId?: string;
  startDate: string;
  endDate?: string;
  type: 'both' | 'salah' | 'sawm';
};

type DebtPreview = {
  current: number;
  next: number;
  delta: number;
};

function createProfileFormState(
  profileKey: string,
  profile?: {
    dateOfBirth?: string;
    bulughDate?: string;
    revertDate?: string;
    gender?: 'male' | 'female';
  } | null,
): ProfileFormState {
  return {
    sourceKey: profileKey,
    dateOfBirth: profile?.dateOfBirth ?? '',
    bulughDate: profile?.bulughDate ?? '',
    revertDate: profile?.revertDate ?? '',
    gender: profile?.gender ?? 'male',
  };
}

function buildDebtPreview(
  currentBulughDate: string | undefined,
  nextBulughDate: string | undefined,
  currentPeriods: PeriodLike[],
  nextPeriods: PeriodLike[],
): DebtPreview | null {
  if (!currentBulughDate || !nextBulughDate) {
    return null;
  }

  try {
    const current = estimateSalahDebt(currentBulughDate, currentPeriods);
    const next = estimateSalahDebt(nextBulughDate, nextPeriods);
    return {
      current,
      next,
      delta: next - current,
    };
  } catch {
    return null;
  }
}

export const SettingsPage: React.FC = () => {
  const { t, language, fmtNumber } = useLanguage();
  const { user, signIn, signOut } = useAuth();
  const deleteAccount = useDeleteAccount();
  const exportData = useExportData();
  const resetPrayerLogs = useResetPrayerLogs();
  const resetFastLogs = useResetFastLogs();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: periods } = usePracticingPeriods();
  const addPeriod = useAddPracticingPeriod();
  const updatePeriod = useUpdatePracticingPeriod();
  const deletePeriod = useDeletePracticingPeriod();

  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile editing state — re-derive when profile loads
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

  // Practicing period form state
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodStartError, setPeriodStartError] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodEndError, setPeriodEndError] = useState('');
  const [periodOngoing, setPeriodOngoing] = useState(false);
  const [periodType, setPeriodType] = useState<'both' | 'salah' | 'sawm'>('both');

  // Period editing state
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editStartError, setEditStartError] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editEndError, setEditEndError] = useState('');
  const [editOngoing, setEditOngoing] = useState(false);
  const [editType, setEditType] = useState<'both' | 'salah' | 'sawm'>('both');
  const [periodFeedback, setPeriodFeedback] = useState<FeedbackState | null>(null);
  const persistedBulughDate = profile?.bulughDate;
  const persistedPeriods = useMemo(() => (periods ?? []) as PeriodLike[], [periods]);

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

  const addPeriodPreview = useMemo(() => {
    const nextEndDate = periodOngoing ? undefined : periodEnd || undefined;
    return buildDebtPreview(persistedBulughDate, persistedBulughDate, persistedPeriods, [
      ...persistedPeriods,
      {
        startDate: periodStart,
        endDate: nextEndDate,
        type: periodType,
      },
    ]);
  }, [persistedBulughDate, persistedPeriods, periodStart, periodEnd, periodOngoing, periodType]);

  const editPeriodPreview = useMemo(() => {
    if (!editingPeriodId) {
      return null;
    }

    const nextEndDate = editOngoing ? undefined : editEnd || undefined;
    return buildDebtPreview(
      persistedBulughDate,
      persistedBulughDate,
      persistedPeriods,
      persistedPeriods.map((period) =>
        period.periodId === editingPeriodId
          ? {
              ...period,
              startDate: editStart,
              endDate: nextEndDate,
              type: editType,
            }
          : period,
      ),
    );
  }, [
    persistedBulughDate,
    persistedPeriods,
    editingPeriodId,
    editStart,
    editEnd,
    editOngoing,
    editType,
  ]);

  const getDeletePeriodPreview = (periodId: string) =>
    buildDebtPreview(
      persistedBulughDate,
      persistedBulughDate,
      persistedPeriods,
      persistedPeriods.filter((period) => period.periodId !== periodId),
    );

  const formatHijriDisplay = (hijriStr: string): string => {
    if (!hijriStr) return '—';
    try {
      const d = HijriDate.fromString(hijriStr);
      if (language === 'ar') {
        const monthName = t(HIJRI_MONTH_KEYS[d.month - 1]);
        return `${fmtNumber(d.day)} ${monthName} ${fmtNumber(d.year)}`;
      }
      return d.format('en');
    } catch {
      return hijriStr;
    }
  };

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t('common.error');

  const validateProfileForm = (): boolean => {
    setDobError('');
    setBulughError('');
    setProfileFeedback(null);

    if (!activeProfileForm.bulughDate) {
      return false;
    }

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

  const validatePeriodForm = ({
    startDate,
    endDate,
    excludePeriodId,
    setStartError,
    setEndError,
  }: {
    startDate: string;
    endDate?: string;
    excludePeriodId?: string;
    setStartError: (message: string) => void;
    setEndError: (message: string) => void;
  }): boolean => {
    setStartError('');
    setEndError('');
    setPeriodFeedback(null);

    if (!startDate) {
      return false;
    }

    if (activeProfileForm.bulughDate) {
      try {
        if (
          HijriDate.fromString(startDate).isBefore(
            HijriDate.fromString(activeProfileForm.bulughDate),
          )
        ) {
          const message = t('onboarding.period_error_before_bulugh');
          setStartError(message);
          setPeriodFeedback({ tone: 'error', message });
          return false;
        }
      } catch {
        // Picker validation covers malformed dates.
      }
    }

    if (endDate) {
      try {
        if (HijriDate.fromString(endDate).isBefore(HijriDate.fromString(startDate))) {
          const message = t('onboarding.period_error_end_before_start');
          setEndError(message);
          setPeriodFeedback({ tone: 'error', message });
          return false;
        }
      } catch {
        // Picker validation covers malformed dates.
      }
    }

    for (const existing of periods ?? []) {
      if (existing.periodId === excludePeriodId) continue;
      if (rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
        const message = t('onboarding.period_error_overlap');
        setStartError(message);
        setPeriodFeedback({ tone: 'error', message });
        return false;
      }
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
      setProfileFeedback({ tone: 'error', message: getErrorMessage(error) });
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

  const handleAddPeriod = async () => {
    if (!periodStart) return;
    const nextEndDate = periodOngoing ? undefined : periodEnd || undefined;
    if (
      !validatePeriodForm({
        startDate: periodStart,
        endDate: nextEndDate,
        setStartError: setPeriodStartError,
        setEndError: setPeriodEndError,
      })
    ) {
      return;
    }

    try {
      const preview = addPeriodPreview;
      await addPeriod.mutateAsync({
        startDate: periodStart,
        endDate: nextEndDate,
        type: periodType,
      });
      setPeriodStart('');
      setPeriodEnd('');
      setPeriodOngoing(false);
      setPeriodType('both');
      setShowAddPeriod(false);
      setPeriodFeedback({
        tone: 'success',
        message: preview
          ? `${t('settings.period_added')}. ${describeDebtPreview(preview)}`
          : t('settings.period_added'),
      });
    } catch (error) {
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error) });
    }
  };

  const handleStartEdit = (p: {
    periodId: string;
    startDate: string;
    endDate?: string;
    type: 'both' | 'salah' | 'sawm';
  }) => {
    setEditingPeriodId(p.periodId);
    setEditStart(p.startDate);
    setEditEnd(p.endDate ?? '');
    setEditOngoing(!p.endDate);
    setEditType(p.type);
    setEditStartError('');
    setEditEndError('');
  };

  const handleCancelEdit = () => {
    setEditingPeriodId(null);
    setEditStart('');
    setEditEnd('');
    setEditOngoing(false);
    setEditType('both');
  };

  const handleSaveEdit = async (periodId: string) => {
    if (!editStart) return;
    const nextEndDate = editOngoing ? undefined : editEnd || undefined;
    if (
      !validatePeriodForm({
        startDate: editStart,
        endDate: nextEndDate,
        excludePeriodId: periodId,
        setStartError: setEditStartError,
        setEndError: setEditEndError,
      })
    ) {
      return;
    }

    try {
      const preview = editPeriodPreview;
      await updatePeriod.mutateAsync({
        periodId,
        startDate: editStart,
        endDate: nextEndDate,
        type: editType,
      });
      handleCancelEdit();
      setPeriodFeedback({
        tone: 'success',
        message: preview
          ? `${t('settings.period_saved')}. ${describeDebtPreview(preview)}`
          : t('settings.period_saved'),
      });
    } catch (error) {
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error) });
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    const preview = getDeletePeriodPreview(periodId);
    const confirmMessage = preview
      ? `${t('settings.period_delete_confirm')}\n\n${formatPreviewSummary(preview)}\n${describeDebtPreview(preview)}`
      : t('settings.period_delete_confirm');
    if (!window.confirm(confirmMessage)) return;
    setPeriodFeedback(null);
    try {
      await deletePeriod.mutateAsync(periodId);
      setPeriodFeedback({
        tone: 'success',
        message: preview
          ? `${t('settings.period_deleted')}. ${describeDebtPreview(preview)}`
          : t('settings.period_deleted'),
      });
    } catch (error) {
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error) });
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const email = user?.email || user?.username || '';
      await signIn(email, deletePassword);
      const result = await deleteAccount.mutateAsync();
      if (result && !result.authDeleted) {
        window.alert(t('settings.delete_partial_cleanup_notice'));
      }
      await signOut();
    } catch (err: unknown) {
      setIsDeleting(false);
      setDeleteError(err instanceof Error ? err.message : t('settings.delete_error'));
    }
  };

  const handleExportData = async () => {
    try {
      await exportData.mutateAsync();
    } catch (error) {
      window.alert(getErrorMessage(error));
    }
  };

  const handleResetPrayerData = async () => {
    if (!window.confirm(t('settings.reset_confirm_prayers'))) {
      return;
    }

    try {
      await resetPrayerLogs.mutateAsync();
    } catch (error) {
      window.alert(getErrorMessage(error));
    }
  };

  const handleResetFastData = async () => {
    if (!window.confirm(t('settings.reset_confirm_fasts'))) {
      return;
    }

    try {
      await resetFastLogs.mutateAsync();
    } catch (error) {
      window.alert(getErrorMessage(error));
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroBadge}>{t('settings.hero_badge')}</span>
        <h1 className={styles.title}>{t('nav.settings')}</h1>
        <p className={styles.subtitle}>{t('settings.subtitle')}</p>
      </section>

      {/* Account Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <User size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.account')}</h2>
        </div>
        <div className={styles.accountInfo}>
          <div className={styles.avatar}>{(user?.username?.[0] ?? 'U').toUpperCase()}</div>
          <div className={styles.accountDetails}>
            <p className={styles.accountName}>{user?.username ?? '—'}</p>
            <p className={styles.accountEmail}>{user?.email ?? user?.userId ?? ''}</p>
          </div>
        </div>
      </Card>

      {/* Profile & Qadaa Data Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <BookOpen size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.profile_section')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.profile_edit_hint')}</p>
        {profileFeedback ? (
          <p
            className={`${styles.sectionNotice} ${
              profileFeedback.tone === 'error'
                ? styles.sectionNoticeError
                : styles.sectionNoticeSuccess
            }`}
            role={profileFeedback.tone === 'error' ? 'alert' : undefined}
          >
            {profileFeedback.message}
          </p>
        ) : null}

        <div className={styles.profileFields}>
          {/* Date of Birth */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t('settings.dob')}</label>
            <div className={styles.fieldCurrent}>
              <span className={styles.fieldCurrentVal}>
                {formatHijriDisplay(activeProfileForm.dateOfBirth)}
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

            {/* Mode toggle — reuse gender button style */}
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
                    {formatHijriDisplay(activeProfileForm.bulughDate)}
                  </span>
                </div>
                <HijriDatePicker
                  value={activeProfileForm.bulughDate}
                  onChange={(value) => updateProfileForm({ bulughDate: value })}
                  onError={setBulughError}
                  label={t('settings.bulugh_date')}
                />
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
                          {formatHijriDisplay(activeProfileForm.bulughDate)}
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

        {profileDebtPreview ? (
          <div className={styles.impactPreview}>
            <div className={styles.impactPreviewHeader}>
              <span className={styles.impactPreviewTitle}>{t('settings.debt_preview_title')}</span>
              <span
                className={`${styles.impactPreviewDelta} ${
                  profileDebtPreview.delta < 0
                    ? styles.impactPreviewPositive
                    : profileDebtPreview.delta > 0
                      ? styles.impactPreviewNegative
                      : styles.impactPreviewNeutral
                }`}
              >
                {profileDebtPreview.delta < 0
                  ? `-${fmtNumber(Math.abs(profileDebtPreview.delta))}`
                  : profileDebtPreview.delta > 0
                    ? `+${fmtNumber(profileDebtPreview.delta)}`
                    : fmtNumber(0)}
              </span>
            </div>
            <div className={styles.impactPreviewStats}>
              <div className={styles.impactPreviewStat}>
                <span>{t('settings.debt_preview_current')}</span>
                <strong>{fmtNumber(profileDebtPreview.current)}</strong>
              </div>
              <div className={styles.impactPreviewStat}>
                <span>{t('settings.debt_preview_next')}</span>
                <strong>{fmtNumber(profileDebtPreview.next)}</strong>
              </div>
            </div>
            <p className={styles.impactPreviewBody}>{describeDebtPreview(profileDebtPreview)}</p>
          </div>
        ) : null}

        <button
          className={styles.saveProfileBtn}
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending || !activeProfileForm.bulughDate}
        >
          <Save size={16} />
          {updateProfile.isPending
            ? t('settings.saving_profile')
            : profileSaved
              ? t('settings.profile_saved')
              : t('settings.save_profile')}
        </button>
      </Card>

      {/* Practicing Periods Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <BookOpen size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.practicing_periods')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.periods_hint')}</p>
        {periodFeedback ? (
          <p
            className={`${styles.sectionNotice} ${
              periodFeedback.tone === 'error'
                ? styles.sectionNoticeError
                : styles.sectionNoticeSuccess
            }`}
            role={periodFeedback.tone === 'error' ? 'alert' : undefined}
          >
            {periodFeedback.message}
          </p>
        ) : null}

        {/* Existing Periods */}
        {(periods ?? []).length === 0 && !showAddPeriod && (
          <div className={styles.periodsEmpty}>
            <p className={styles.periodsEmptyText}>{t('settings.periods_empty')}</p>
            <p className={styles.periodsEmptyHint}>{t('settings.periods_empty_hint')}</p>
          </div>
        )}
        {(periods ?? []).length > 0 && (
          <div className={styles.periodsList}>
            {(periods ?? []).map((p) =>
              editingPeriodId === p.periodId ? (
                <div key={p.periodId} className={styles.addPeriodForm}>
                  <div className={styles.periodFormRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>{t('onboarding.period_start')}</label>
                      <HijriDatePicker
                        value={editStart}
                        onChange={setEditStart}
                        onError={setEditStartError}
                        label={t('onboarding.period_start')}
                      />
                      {editStartError && <p className={styles.fieldError}>{editStartError}</p>}
                    </div>

                    {!editOngoing && (
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{t('onboarding.period_end')}</label>
                        <HijriDatePicker
                          value={editEnd}
                          onChange={setEditEnd}
                          onError={setEditEndError}
                          label={t('onboarding.period_end')}
                        />
                        {editEndError && <p className={styles.fieldError}>{editEndError}</p>}
                      </div>
                    )}
                  </div>

                  <label className={styles.ongoingLabel}>
                    <input
                      type="checkbox"
                      checked={editOngoing}
                      onChange={(e) => setEditOngoing(e.target.checked)}
                    />
                    <span>{t('onboarding.period_current')}</span>
                  </label>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>{t('onboarding.period_type_label')}</label>
                    <select
                      className={styles.typeSelect}
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as 'both' | 'salah' | 'sawm')}
                    >
                      <option value="both">{t('onboarding.period_type_both')}</option>
                      <option value="salah">{t('onboarding.period_type_salah')}</option>
                      <option value="sawm">{t('onboarding.period_type_sawm')}</option>
                    </select>
                  </div>

                  {editPeriodPreview ? (
                    <div className={styles.impactPreview}>
                      <div className={styles.impactPreviewHeader}>
                        <span className={styles.impactPreviewTitle}>
                          {t('settings.debt_preview_title')}
                        </span>
                        <span
                          className={`${styles.impactPreviewDelta} ${
                            editPeriodPreview.delta < 0
                              ? styles.impactPreviewPositive
                              : editPeriodPreview.delta > 0
                                ? styles.impactPreviewNegative
                                : styles.impactPreviewNeutral
                          }`}
                        >
                          {editPeriodPreview.delta < 0
                            ? `-${fmtNumber(Math.abs(editPeriodPreview.delta))}`
                            : editPeriodPreview.delta > 0
                              ? `+${fmtNumber(editPeriodPreview.delta)}`
                              : fmtNumber(0)}
                        </span>
                      </div>
                      <div className={styles.impactPreviewStats}>
                        <div className={styles.impactPreviewStat}>
                          <span>{t('settings.debt_preview_current')}</span>
                          <strong>{fmtNumber(editPeriodPreview.current)}</strong>
                        </div>
                        <div className={styles.impactPreviewStat}>
                          <span>{t('settings.debt_preview_next')}</span>
                          <strong>{fmtNumber(editPeriodPreview.next)}</strong>
                        </div>
                      </div>
                      <p className={styles.impactPreviewBody}>
                        {describeDebtPreview(editPeriodPreview)}
                      </p>
                    </div>
                  ) : null}

                  <div className={styles.addPeriodActions}>
                    <button className={styles.cancelAddBtn} onClick={handleCancelEdit}>
                      {t('common.cancel')}
                    </button>
                    <button
                      className={styles.confirmAddBtn}
                      onClick={() => handleSaveEdit(p.periodId)}
                      disabled={!editStart || updatePeriod.isPending}
                    >
                      <Save size={14} />
                      {updatePeriod.isPending
                        ? t('common.loading')
                        : t('settings.save_period_edit')}
                    </button>
                  </div>
                </div>
              ) : (
                <div key={p.periodId} className={styles.periodRow}>
                  <div className={styles.periodInfo}>
                    <span className={styles.periodDates}>
                      {formatHijriDisplay(p.startDate)} {t('onboarding.period_to')}{' '}
                      {p.endDate ? formatHijriDisplay(p.endDate) : t('settings.period_ongoing')}
                    </span>
                    <span className={styles.periodType}>
                      {t(`onboarding.period_type_${p.type}`)}
                    </span>
                  </div>
                  <div className={styles.periodActions}>
                    <button
                      className={styles.periodEditBtn}
                      onClick={() => handleStartEdit(p)}
                      aria-label={t('settings.period_edit')}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className={styles.periodDeleteBtn}
                      onClick={() => handleDeletePeriod(p.periodId)}
                      aria-label={t('settings.period_delete')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {!showAddPeriod ? (
          <button className={styles.addPeriodBtn} onClick={() => setShowAddPeriod(true)}>
            <Plus size={16} />
            {t('settings.add_period')}
          </button>
        ) : (
          <div className={styles.addPeriodForm}>
            <div className={styles.periodFormRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>{t('onboarding.period_start')}</label>
                <HijriDatePicker
                  value={periodStart}
                  onChange={setPeriodStart}
                  onError={setPeriodStartError}
                  label={t('onboarding.period_start')}
                />
                {periodStartError && <p className={styles.fieldError}>{periodStartError}</p>}
              </div>

              {!periodOngoing && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{t('onboarding.period_end')}</label>
                  <HijriDatePicker
                    value={periodEnd}
                    onChange={setPeriodEnd}
                    onError={setPeriodEndError}
                    label={t('onboarding.period_end')}
                  />
                  {periodEndError && <p className={styles.fieldError}>{periodEndError}</p>}
                </div>
              )}
            </div>

            <label className={styles.ongoingLabel}>
              <input
                type="checkbox"
                checked={periodOngoing}
                onChange={(e) => setPeriodOngoing(e.target.checked)}
              />
              <span>{t('onboarding.period_current')}</span>
            </label>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('onboarding.period_type_label')}</label>
              <select
                className={styles.typeSelect}
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as 'both' | 'salah' | 'sawm')}
              >
                <option value="both">{t('onboarding.period_type_both')}</option>
                <option value="salah">{t('onboarding.period_type_salah')}</option>
                <option value="sawm">{t('onboarding.period_type_sawm')}</option>
              </select>
            </div>

            {addPeriodPreview ? (
              <div className={styles.impactPreview}>
                <div className={styles.impactPreviewHeader}>
                  <span className={styles.impactPreviewTitle}>
                    {t('settings.debt_preview_title')}
                  </span>
                  <span
                    className={`${styles.impactPreviewDelta} ${
                      addPeriodPreview.delta < 0
                        ? styles.impactPreviewPositive
                        : addPeriodPreview.delta > 0
                          ? styles.impactPreviewNegative
                          : styles.impactPreviewNeutral
                    }`}
                  >
                    {addPeriodPreview.delta < 0
                      ? `-${fmtNumber(Math.abs(addPeriodPreview.delta))}`
                      : addPeriodPreview.delta > 0
                        ? `+${fmtNumber(addPeriodPreview.delta)}`
                        : fmtNumber(0)}
                  </span>
                </div>
                <div className={styles.impactPreviewStats}>
                  <div className={styles.impactPreviewStat}>
                    <span>{t('settings.debt_preview_current')}</span>
                    <strong>{fmtNumber(addPeriodPreview.current)}</strong>
                  </div>
                  <div className={styles.impactPreviewStat}>
                    <span>{t('settings.debt_preview_next')}</span>
                    <strong>{fmtNumber(addPeriodPreview.next)}</strong>
                  </div>
                </div>
                <p className={styles.impactPreviewBody}>{describeDebtPreview(addPeriodPreview)}</p>
              </div>
            ) : null}

            <div className={styles.addPeriodActions}>
              <button
                className={styles.cancelAddBtn}
                onClick={() => {
                  setShowAddPeriod(false);
                  setPeriodStart('');
                  setPeriodEnd('');
                  setPeriodOngoing(false);
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                className={styles.confirmAddBtn}
                onClick={handleAddPeriod}
                disabled={!periodStart || addPeriod.isPending}
              >
                <Plus size={14} />
                {addPeriod.isPending ? t('common.loading') : t('settings.add_period')}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Language Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Languages size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.language')}</h2>
        </div>
        <LanguageSwitcher variant="full" />
      </Card>

      {/* Notifications Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Bell size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
        </div>
        <p className={styles.comingSoon}>{t('settings.coming_soon')}</p>
      </Card>

      {/* Privacy Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Shield size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.privacy')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.privacy_note')}</p>
        <button
          className={styles.exportBtn}
          onClick={handleExportData}
          disabled={exportData.isPending}
        >
          <Download size={16} />
          {exportData.isPending ? t('settings.exporting') : t('settings.export_data')}
        </button>
      </Card>

      {/* About Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Info size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.about')}</h2>
        </div>
        <div className={styles.aboutInfo}>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>{t('settings.version')}</span>
            <span className={styles.aboutVal}>{APP_VERSION}</span>
          </div>
          <div className={styles.aboutRow}>
            <span className={styles.aboutKey}>{t('settings.built_with')}</span>
            <span className={styles.aboutVal}>{t('settings.built_with_value')}</span>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <button
        className={styles.signOutBtn}
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label={t('nav.logout')}
      >
        <LogOut size={18} />
        {signingOut ? t('settings.signing_out') : t('nav.logout')}
      </button>

      {/* Data Management Card */}
      <Card className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <RotateCcw size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.data_management')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.data_management_hint')}</p>

        <div className={styles.resetActions}>
          <div className={styles.resetItem}>
            <div className={styles.resetItemInfo}>
              <span className={styles.resetItemLabel}>{t('settings.reset_prayers')}</span>
              <span className={styles.resetItemHint}>{t('settings.reset_prayers_hint')}</span>
            </div>
            <button
              className={styles.resetBtn}
              onClick={handleResetPrayerData}
              disabled={resetPrayerLogs.isPending}
              aria-label={t('settings.reset_prayers')}
            >
              <RotateCcw size={14} />
              {resetPrayerLogs.isPending ? t('settings.resetting') : t('settings.reset_prayers')}
            </button>
          </div>

          <div className={styles.resetItem}>
            <div className={styles.resetItemInfo}>
              <span className={styles.resetItemLabel}>{t('settings.reset_fasts')}</span>
              <span className={styles.resetItemHint}>{t('settings.reset_fasts_hint')}</span>
            </div>
            <button
              className={styles.resetBtn}
              onClick={handleResetFastData}
              disabled={resetFastLogs.isPending}
              aria-label={t('settings.reset_fasts')}
            >
              <RotateCcw size={14} />
              {resetFastLogs.isPending ? t('settings.resetting') : t('settings.reset_fasts')}
            </button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className={`${styles.section} ${styles.dangerZone}`}>
        <div className={styles.sectionHeader}>
          <div className={`${styles.sectionIcon} ${styles.dangerIcon}`}>
            <Trash2 size={18} />
          </div>
          <h2 className={styles.sectionTitle}>{t('settings.danger_zone')}</h2>
        </div>
        <p className={styles.privacyText}>{t('settings.delete_account_hint')}</p>

        {!showDeleteConfirm ? (
          <button
            className={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
            aria-label={t('settings.delete_account')}
          >
            <Trash2 size={16} />
            {t('settings.delete_account')}
          </button>
        ) : (
          <div className={styles.deleteConfirm}>
            <p className={styles.deleteConfirmText}>{t('settings.delete_confirm_text')}</p>
            <input
              type="password"
              className={styles.deletePasswordInput}
              placeholder={t('settings.delete_confirm_password')}
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError('');
              }}
              aria-label={t('settings.delete_confirm_password')}
            />
            {deleteError && (
              <p className={styles.deleteErrorText} role="alert">
                {deleteError}
              </p>
            )}
            <div className={styles.deleteConfirmBtns}>
              <button
                className={styles.deleteConfirmBtn}
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                aria-label={t('settings.delete_confirm_btn')}
              >
                {isDeleting ? t('settings.deleting') : t('settings.delete_confirm_btn')}
              </button>
              <button
                className={styles.deleteCancelBtn}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                aria-label={t('settings.delete_cancel')}
              >
                {t('settings.delete_cancel')}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
