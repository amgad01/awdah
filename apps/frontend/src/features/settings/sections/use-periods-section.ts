import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useLanguage } from '@/hooks/use-language';
import {
  useProfile,
  usePracticingPeriods,
  useAddPracticingPeriod,
  useUpdatePracticingPeriod,
  useDeletePracticingPeriod,
} from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { getPracticingPeriodValidationError } from '@/lib/practicing-periods';
import { buildDebtPreview, getErrorMessage } from '../helpers';
import type { DebtPreview, FeedbackState, PeriodLike, PeriodType } from '../types';

type PeriodFormState = {
  startDate: string;
  startError: string;
  endDate: string;
  endError: string;
  isOngoing: boolean;
  periodType: PeriodType;
};

const createPeriodFormState = (): PeriodFormState => ({
  startDate: '',
  startError: '',
  endDate: '',
  endError: '',
  isOngoing: false,
  periodType: 'both',
});

export const usePeriodsSection = () => {
  const { t, fmtNumber } = useLanguage();
  const { data: profile } = useProfile();
  const { data: periods } = usePracticingPeriods();
  const addPeriod = useAddPracticingPeriod();
  const updatePeriod = useUpdatePracticingPeriod();
  const deletePeriod = useDeletePracticingPeriod();
  const { toast } = useToast();

  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [periodFeedback, setPeriodFeedback] = useState<FeedbackState | null>(null);
  const [addForm, setAddForm] = useState<PeriodFormState>(createPeriodFormState);
  const [editForm, setEditForm] = useState<PeriodFormState>(createPeriodFormState);

  const persistedBulughDate = profile?.bulughDate;
  const persistedDobDate = profile?.dateOfBirth;
  const persistedPeriods = useMemo(() => (periods ?? []) as PeriodLike[], [periods]);
  const periodsWithId = useMemo(
    () =>
      persistedPeriods.filter((period): period is PeriodLike & { periodId: string } =>
        Boolean(period.periodId),
      ),
    [persistedPeriods],
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

  const updateAddForm = useCallback((updates: Partial<PeriodFormState>) => {
    setAddForm((current) => ({ ...current, ...updates }));
  }, []);

  const updateEditForm = useCallback((updates: Partial<PeriodFormState>) => {
    setEditForm((current) => ({ ...current, ...updates }));
  }, []);

  const resetFeedback = useCallback(() => {
    setPeriodFeedback(null);
  }, []);

  const validatePeriodForm = useCallback(
    ({
      form,
      excludePeriodId,
      setForm,
      silent = false,
    }: {
      form: PeriodFormState;
      excludePeriodId?: string;
      setForm: Dispatch<SetStateAction<PeriodFormState>>;
      silent?: boolean;
    }): boolean => {
      if (!silent) {
        setForm((current) => ({ ...current, startError: '', endError: '' }));
        setPeriodFeedback(null);
      }

      const validationError = getPracticingPeriodValidationError({
        startDate: form.startDate,
        endDate: form.isOngoing ? undefined : form.endDate || undefined,
        dateOfBirth: persistedDobDate ?? undefined,
        revertDate: profile?.revertDate ?? undefined,
        existingPeriods: persistedPeriods,
        excludePeriodId,
      });

      if (validationError && !silent) {
        const message = t(validationError.messageKey);
        setForm((current) => ({
          ...current,
          startError: validationError.field === 'start' ? message : '',
          endError: validationError.field === 'end' ? message : '',
        }));
        setPeriodFeedback({
          tone: validationError.severity === 'warning' ? 'warning' : 'error',
          message,
        });
      }

      return !validationError || validationError.severity === 'warning';
    },
    [persistedDobDate, persistedPeriods, profile?.revertDate, t],
  );

  const isAddValid = useMemo(
    () =>
      validatePeriodForm({
        form: addForm,
        setForm: setAddForm,
        silent: true,
      }),
    [addForm, validatePeriodForm],
  );

  const isEditValid = useMemo(
    () =>
      Boolean(editingPeriodId) &&
      validatePeriodForm({
        form: editForm,
        excludePeriodId: editingPeriodId ?? undefined,
        setForm: setEditForm,
        silent: true,
      }),
    [editForm, editingPeriodId, validatePeriodForm],
  );

  const addPeriodPreview = useMemo(() => {
    if (!isAddValid || !addForm.startDate) return null;
    return buildDebtPreview(persistedBulughDate, persistedBulughDate, persistedPeriods, [
      ...persistedPeriods,
      {
        startDate: addForm.startDate,
        endDate: addForm.isOngoing ? undefined : addForm.endDate || undefined,
        type: addForm.periodType,
      },
    ]);
  }, [addForm, isAddValid, persistedBulughDate, persistedPeriods]);

  const editPeriodPreview = useMemo(() => {
    if (!editingPeriodId || !isEditValid) return null;
    return buildDebtPreview(
      persistedBulughDate,
      persistedBulughDate,
      persistedPeriods,
      persistedPeriods.map((period) =>
        period.periodId === editingPeriodId
          ? {
              ...period,
              startDate: editForm.startDate,
              endDate: editForm.isOngoing ? undefined : editForm.endDate || undefined,
              type: editForm.periodType,
            }
          : period,
      ),
    );
  }, [editForm, editingPeriodId, isEditValid, persistedBulughDate, persistedPeriods]);

  const getDeletePeriodPreview = useCallback(
    (periodId: string) =>
      buildDebtPreview(
        persistedBulughDate,
        persistedBulughDate,
        periodsWithId,
        periodsWithId.filter((period) => period.periodId !== periodId),
      ),
    [periodsWithId, persistedBulughDate],
  );

  const resetAddForm = useCallback(() => {
    setShowAddPeriod(false);
    setAddForm(createPeriodFormState());
    setPeriodFeedback(null);
  }, []);

  const handleAddPeriod = useCallback(async () => {
    if (!addForm.startDate) return;
    if (!validatePeriodForm({ form: addForm, setForm: setAddForm })) return;

    try {
      await addPeriod.mutateAsync({
        startDate: addForm.startDate,
        endDate: addForm.isOngoing ? undefined : addForm.endDate || undefined,
        type: addForm.periodType,
      });
      const successMsg = addPeriodPreview
        ? `${t('settings.period_added')}. ${describeDebtPreview(addPeriodPreview)}`
        : t('settings.period_added');
      resetAddForm();
      toast.success(successMsg);
    } catch (error) {
      toast.error(t(getErrorMessage(error, 'common.error')));
    }
  }, [
    addForm,
    addPeriod,
    addPeriodPreview,
    describeDebtPreview,
    resetAddForm,
    t,
    toast,
    validatePeriodForm,
  ]);

  const handleStartEdit = useCallback((period: PeriodLike & { periodId: string }) => {
    setEditingPeriodId(period.periodId);
    setDeletingPeriodId(null);
    setEditForm({
      startDate: period.startDate,
      startError: '',
      endDate: period.endDate ?? '',
      endError: '',
      isOngoing: !period.endDate,
      periodType: period.type ?? 'both',
    });
    setPeriodFeedback(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPeriodId(null);
    setEditForm(createPeriodFormState());
    setPeriodFeedback(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingPeriodId || !editForm.startDate) return;
    if (
      !validatePeriodForm({
        form: editForm,
        excludePeriodId: editingPeriodId,
        setForm: setEditForm,
      })
    ) {
      return;
    }

    try {
      await updatePeriod.mutateAsync({
        periodId: editingPeriodId,
        startDate: editForm.startDate,
        endDate: editForm.isOngoing ? undefined : editForm.endDate || undefined,
        type: editForm.periodType,
      });
      const successMsg = editPeriodPreview
        ? `${t('settings.period_saved')}. ${describeDebtPreview(editPeriodPreview)}`
        : t('settings.period_saved');
      handleCancelEdit();
      toast.success(successMsg);
    } catch (error) {
      toast.error(t(getErrorMessage(error, 'common.error')));
    }
  }, [
    describeDebtPreview,
    editForm,
    editPeriodPreview,
    editingPeriodId,
    handleCancelEdit,
    t,
    toast,
    updatePeriod,
    validatePeriodForm,
  ]);

  const handleConfirmDelete = useCallback(
    async (periodId: string) => {
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
    },
    [deletePeriod, describeDebtPreview, getDeletePeriodPreview, t, toast],
  );

  return {
    periods: periodsWithId,
    persistedDobDate,
    showAddPeriod,
    editingPeriodId,
    deletingPeriodId,
    periodFeedback,
    addForm,
    editForm,
    addPeriodPreview,
    editPeriodPreview,
    addPeriodPending: addPeriod.isPending,
    updatePeriodPending: updatePeriod.isPending,
    deletePeriodPending: deletePeriod.isPending,
    describeDebtPreview,
    getDeletePeriodPreview,
    resetFeedback,
    setShowAddPeriod,
    setDeletingPeriodId,
    updateAddForm,
    updateEditForm,
    resetAddForm,
    handleAddPeriod,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleConfirmDelete,
  };
};
