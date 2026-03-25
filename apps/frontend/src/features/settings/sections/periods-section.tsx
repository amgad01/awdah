import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import {
  useProfile,
  usePracticingPeriods,
  useAddPracticingPeriod,
  useUpdatePracticingPeriod,
  useDeletePracticingPeriod,
} from '@/hooks/use-profile';
import { HijriDate } from '@awdah/shared';
import { rangesOverlap } from '@/lib/practicing-periods';
import { BookOpen, Pencil, Plus, X } from 'lucide-react';
import { SettingsSection, SectionNotice, PeriodForm } from '../components';
import { buildDebtPreview, formatHijriDisplay, getErrorMessage } from '../helpers';
import type { FeedbackState, PeriodLike, DebtPreview } from '../types';
import styles from '../settings-page.module.css';

export const PeriodsSection: React.FC = () => {
  const { t, language, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const { data: periods } = usePracticingPeriods();
  const addPeriod = useAddPracticingPeriod();
  const updatePeriod = useUpdatePracticingPeriod();
  const deletePeriod = useDeletePracticingPeriod();

  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodStartError, setPeriodStartError] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodEndError, setPeriodEndError] = useState('');
  const [periodOngoing, setPeriodOngoing] = useState(false);
  const [periodType, setPeriodType] = useState<'both' | 'salah' | 'sawm'>('both');

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

  const fmtHijri = (hijriStr: string, invert = false) =>
    formatHijriDisplay(hijriStr, language, t, fmtNumber, invert);

  const describeDebtPreview = (preview: DebtPreview) => {
    if (preview.delta < 0)
      return t('settings.debt_preview_reduced', { n: fmtNumber(Math.abs(preview.delta)) });
    if (preview.delta > 0)
      return t('settings.debt_preview_increased', { n: fmtNumber(preview.delta) });
    return t('settings.debt_preview_unchanged');
  };

  const formatPreviewSummary = (preview: DebtPreview) =>
    t('settings.confirm_profile_change_preview', {
      current: fmtNumber(preview.current),
      next: fmtNumber(preview.next),
    });

  const addPeriodPreview = useMemo(() => {
    const nextEndDate = periodOngoing ? undefined : periodEnd || undefined;
    return buildDebtPreview(persistedBulughDate, persistedBulughDate, persistedPeriods, [
      ...persistedPeriods,
      { startDate: periodStart, endDate: nextEndDate, type: periodType },
    ]);
  }, [persistedBulughDate, persistedPeriods, periodStart, periodEnd, periodOngoing, periodType]);

  const editPeriodPreview = useMemo(() => {
    if (!editingPeriodId) return null;
    const nextEndDate = editOngoing ? undefined : editEnd || undefined;
    return buildDebtPreview(
      persistedBulughDate,
      persistedBulughDate,
      persistedPeriods,
      persistedPeriods.map((p) =>
        p.periodId === editingPeriodId
          ? { ...p, startDate: editStart, endDate: nextEndDate, type: editType }
          : p,
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
      persistedPeriods.filter((p) => p.periodId !== periodId),
    );

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
    setStartError: (msg: string) => void;
    setEndError: (msg: string) => void;
  }): boolean => {
    setStartError('');
    setEndError('');
    setPeriodFeedback(null);
    if (!startDate) return false;

    if (profile?.dateOfBirth) {
      try {
        if (HijriDate.fromString(startDate).isBefore(HijriDate.fromString(profile.dateOfBirth))) {
          const msg = t('onboarding.period_error_before_dob');
          setStartError(msg);
          setPeriodFeedback({ tone: 'error', message: msg });
          return false;
        }
      } catch {
        /* picker covers malformed dates */
      }
    }

    if (endDate) {
      try {
        if (HijriDate.fromString(endDate).isBefore(HijriDate.fromString(startDate))) {
          const msg = t('onboarding.period_error_end_before_start');
          setEndError(msg);
          setPeriodFeedback({ tone: 'error', message: msg });
          return false;
        }
      } catch {
        /* picker covers malformed dates */
      }
    }

    for (const existing of periods ?? []) {
      if (existing.periodId === excludePeriodId) continue;
      if (rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
        const msg = t('onboarding.period_error_overlap');
        setStartError(msg);
        setPeriodFeedback({ tone: 'error', message: msg });
        return false;
      }
    }
    return true;
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
    )
      return;
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
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error, t('common.error')) });
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
    )
      return;
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
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error, t('common.error')) });
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
      setPeriodFeedback({ tone: 'error', message: getErrorMessage(error, t('common.error')) });
    }
  };

  const resetAddForm = () => {
    setShowAddPeriod(false);
    setPeriodStart('');
    setPeriodEnd('');
    setPeriodOngoing(false);
  };

  return (
    <SettingsSection icon={<BookOpen size={18} />} title={t('settings.practicing_periods')}>
      <p className={styles.privacyText}>{t('settings.periods_hint')}</p>
      {periodFeedback ? <SectionNotice feedback={periodFeedback} /> : null}

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
              <PeriodForm
                key={p.periodId}
                mode="edit"
                startDate={editStart}
                endDate={editEnd}
                isOngoing={editOngoing}
                periodType={editType}
                startError={editStartError}
                endError={editEndError}
                preview={editPeriodPreview}
                isPending={updatePeriod.isPending}
                onStartChange={setEditStart}
                onEndChange={setEditEnd}
                onOngoingChange={setEditOngoing}
                onTypeChange={setEditType}
                onStartError={setEditStartError}
                onEndError={setEditEndError}
                onSubmit={() => handleSaveEdit(p.periodId)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div key={p.periodId} className={styles.periodRow}>
                <div className={styles.periodInfo}>
                  <div className={styles.periodRowTitle}>
                    <span className={styles.periodDates}>
                      {fmtHijri(p.startDate)} {t('onboarding.period_to')}{' '}
                      {p.endDate ? fmtHijri(p.endDate) : t('settings.period_ongoing')}
                    </span>
                    <span className={styles.periodDatesSecondary}>
                      {fmtHijri(p.startDate, true)} {t('onboarding.period_to')}{' '}
                      {p.endDate ? fmtHijri(p.endDate, true) : t('settings.period_ongoing')}
                    </span>
                  </div>
                  <span className={styles.periodType}>{t(`onboarding.period_type_${p.type}`)}</span>
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
        <PeriodForm
          mode="add"
          startDate={periodStart}
          endDate={periodEnd}
          isOngoing={periodOngoing}
          periodType={periodType}
          startError={periodStartError}
          endError={periodEndError}
          preview={addPeriodPreview}
          isPending={addPeriod.isPending}
          onStartChange={setPeriodStart}
          onEndChange={setPeriodEnd}
          onOngoingChange={setPeriodOngoing}
          onTypeChange={setPeriodType}
          onStartError={setPeriodStartError}
          onEndError={setPeriodEndError}
          onSubmit={handleAddPeriod}
          onCancel={resetAddForm}
        />
      )}
    </SettingsSection>
  );
};
