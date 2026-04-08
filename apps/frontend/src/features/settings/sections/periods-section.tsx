import React, { useMemo, useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/use-language';
import {
  useProfile,
  usePracticingPeriods,
  useAddPracticingPeriod,
  useUpdatePracticingPeriod,
  useDeletePracticingPeriod,
} from '@/hooks/use-profile';
import { getPracticingPeriodValidationError } from '@/lib/practicing-periods';
import { todayHijriDate } from '@/utils/date-utils';
import { BookOpen, Pencil, Plus, X } from 'lucide-react';
import { DualDateLabel } from '@/components/ui/dual-date-label/dual-date-label';
import { SettingsSection, SectionNotice, PeriodForm } from '../components';
import { buildDebtPreview, getErrorMessage } from '../helpers';
import { useToast } from '@/hooks/use-toast';
import type { FeedbackState, PeriodLike, DebtPreview } from '../types';
import styles from '../settings-page.module.css';

export const PeriodsSection: React.FC = () => {
  const { t, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const { data: periods } = usePracticingPeriods();
  const addPeriod = useAddPracticingPeriod();
  const updatePeriod = useUpdatePracticingPeriod();
  const deletePeriod = useDeletePracticingPeriod();
  const { toast } = useToast();

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
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);

  const persistedBulughDate = profile?.bulughDate;
  const persistedDobDate = profile?.dateOfBirth;
  const persistedPeriods = useMemo(() => (periods ?? []) as PeriodLike[], [periods]);

  const describeDebtPreview = (preview: DebtPreview) => {
    if (preview.delta < 0)
      return t('settings.debt_preview_reduced', { n: fmtNumber(Math.abs(preview.delta)) });
    if (preview.delta > 0)
      return t('settings.debt_preview_increased', { n: fmtNumber(preview.delta) });
    return t('settings.debt_preview_unchanged');
  };

  const validatePeriodForm = useCallback(
    ({
      startDate,
      endDate,
      excludePeriodId,
      setStartError,
      setEndError,
      silent = false,
    }: {
      startDate: string;
      endDate?: string;
      excludePeriodId?: string;
      setStartError: (msg: string) => void;
      setEndError: (msg: string) => void;
      silent?: boolean;
    }): boolean => {
      if (!silent) {
        setStartError('');
        setEndError('');
        setPeriodFeedback(null);
      }
      const validationError = getPracticingPeriodValidationError({
        startDate,
        endDate,
        dateOfBirth: persistedDobDate ?? undefined,
        existingPeriods: persistedPeriods,
        excludePeriodId,
      });

      if (validationError && !silent) {
        const message = t(validationError.messageKey);
        if (validationError.field === 'start') {
          setStartError(message);
        }
        if (validationError.field === 'end') {
          setEndError(message);
        }
        setPeriodFeedback({ tone: 'error', message });
      }

      return validationError == null;
    },
    [persistedDobDate, persistedPeriods, t],
  );

  const isAddValid = useMemo(() => {
    return validatePeriodForm({
      startDate: periodStart,
      endDate: periodOngoing ? undefined : periodEnd || undefined,
      setStartError: setPeriodStartError,
      setEndError: setPeriodEndError,
      silent: true,
    });
  }, [
    validatePeriodForm,
    periodStart,
    periodEnd,
    periodOngoing,
    setPeriodStartError,
    setPeriodEndError,
  ]);

  const addPeriodPreview = useMemo(() => {
    if (!isAddValid || !periodStart) return null;
    const nextEndDate = periodOngoing ? undefined : periodEnd || undefined;
    return buildDebtPreview(persistedBulughDate, persistedBulughDate, persistedPeriods, [
      ...persistedPeriods,
      { startDate: periodStart, endDate: nextEndDate, type: periodType },
    ]);
  }, [
    isAddValid,
    persistedBulughDate,
    persistedPeriods,
    periodStart,
    periodEnd,
    periodOngoing,
    periodType,
  ]);

  const isEditValid = useMemo(() => {
    if (!editingPeriodId) return false;
    return validatePeriodForm({
      startDate: editStart,
      endDate: editOngoing ? undefined : editEnd || undefined,
      excludePeriodId: editingPeriodId,
      setStartError: setEditStartError,
      setEndError: setEditEndError,
      silent: true,
    });
  }, [
    validatePeriodForm,
    editingPeriodId,
    editStart,
    editEnd,
    editOngoing,
    setEditStartError,
    setEditEndError,
  ]);

  const editPeriodPreview = useMemo(() => {
    if (!editingPeriodId || !isEditValid) return null;
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
    isEditValid,
    editingPeriodId,
    persistedBulughDate,
    persistedPeriods,
    editStart,
    editEnd,
    editOngoing,
    editType,
  ]);

  const getDeletePeriodPreview = useCallback(
    (periodId: string) =>
      buildDebtPreview(
        persistedBulughDate,
        persistedBulughDate,
        persistedPeriods,
        persistedPeriods.filter((p) => p.periodId !== periodId),
      ),
    [persistedBulughDate, persistedPeriods],
  );

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

      const successMsg = preview
        ? `${t('settings.period_added')}. ${describeDebtPreview(preview)}`
        : t('settings.period_added');
      toast.success(successMsg);
    } catch (error) {
      const msg = getErrorMessage(error, 'common.error');
      toast.error(t(msg));
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
    setEditType(p.type ?? 'both');
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

      const successMsg = preview
        ? `${t('settings.period_saved')}. ${describeDebtPreview(preview)}`
        : t('settings.period_saved');
      toast.success(successMsg);
    } catch (error) {
      const msg = getErrorMessage(error, 'common.error');
      toast.error(t(msg));
    }
  };

  const handleDeletePeriod = (periodId: string) => {
    setDeletingPeriodId(periodId);
  };

  const handleConfirmDelete = async (periodId: string) => {
    const preview = getDeletePeriodPreview(periodId);
    setDeletingPeriodId(null);
    setPeriodFeedback(null);
    try {
      await deletePeriod.mutateAsync(periodId);
      const successMsg = preview
        ? `${t('settings.period_deleted')}. ${describeDebtPreview(preview)}`
        : t('settings.period_deleted');
      toast.success(successMsg);
    } catch (error) {
      toast.error(t(getErrorMessage(error, 'common.error')));
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
      {persistedDobDate && (
        <p className={styles.periodsBulughHint}>{t('settings.periods_bulugh_hint')}</p>
      )}
      {periodFeedback && !showAddPeriod && !editingPeriodId ? (
        <SectionNotice feedback={periodFeedback} />
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
                feedback={periodFeedback}
                isPending={updatePeriod.isPending}
                minDate={persistedDobDate ?? ''}
                maxDate={todayHijriDate()}
                onStartChange={setEditStart}
                onEndChange={setEditEnd}
                onOngoingChange={setEditOngoing}
                onTypeChange={setEditType}
                onStartError={setEditStartError}
                onEndError={setEditEndError}
                onSubmit={() => handleSaveEdit(p.periodId)}
                onCancel={handleCancelEdit}
              />
            ) : deletingPeriodId === p.periodId ? (
              <div key={p.periodId} className={styles.periodDeleteConfirm}>
                <p className={styles.periodDeleteConfirmMsg}>
                  {t('settings.period_delete_confirm')}
                </p>
                {(() => {
                  const preview = getDeletePeriodPreview(p.periodId);
                  return preview ? (
                    <p className={styles.periodDeleteConfirmPreview}>
                      {describeDebtPreview(preview)}
                    </p>
                  ) : null;
                })()}
                <div className={styles.periodDeleteConfirmActions}>
                  <button
                    type="button"
                    className={styles.cancelAddBtn}
                    onClick={() => setDeletingPeriodId(null)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className={styles.periodDeleteConfirmBtn}
                    onClick={() => void handleConfirmDelete(p.periodId)}
                    disabled={deletePeriod.isPending}
                  >
                    <X size={14} />
                    {t('settings.period_delete')}
                  </button>
                </div>
              </div>
            ) : (
              <div key={p.periodId} className={styles.periodRow}>
                <div className={styles.periodInfo}>
                  <div className={styles.periodRowTitle}>
                    <span className={styles.periodDates}>
                      <DualDateLabel date={p.startDate} layout="inline" />{' '}
                      {t('onboarding.period_to')}{' '}
                      {p.endDate ? (
                        <DualDateLabel date={p.endDate} layout="inline" />
                      ) : (
                        t('settings.period_ongoing')
                      )}
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
          feedback={periodFeedback}
          isPending={addPeriod.isPending}
          minDate={persistedDobDate ?? ''}
          maxDate={todayHijriDate()}
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
