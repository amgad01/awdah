import React from 'react';
import { useLanguage } from '@/hooks/use-language';
import { todayHijriDate } from '@/utils/date-utils';
import { BookOpen, Plus } from 'lucide-react';
import { SettingsSection, SectionNotice, PeriodForm } from '../components';
import { PeriodDeleteConfirm, PeriodRow } from './period-row';
import { usePeriodsSection } from './use-periods-section';
import styles from '../settings-page.module.css';

export const PeriodsSection: React.FC = () => {
  const { t } = useLanguage();
  const {
    periods,
    persistedDobDate,
    showAddPeriod,
    editingPeriodId,
    deletingPeriodId,
    periodFeedback,
    addForm,
    editForm,
    addPeriodPreview,
    editPeriodPreview,
    addPeriodPending,
    updatePeriodPending,
    deletePeriodPending,
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
  } = usePeriodsSection();

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
      {periods.length === 0 && !showAddPeriod && (
        <div className={styles.periodsEmpty}>
          <p className={styles.periodsEmptyText}>{t('settings.periods_empty')}</p>
          <p className={styles.periodsEmptyHint}>{t('settings.periods_empty_hint')}</p>
        </div>
      )}

      {periods.length > 0 && (
        <div className={styles.periodsList}>
          {periods.map((period) =>
            deletingPeriodId === period.periodId ? (
              <PeriodDeleteConfirm
                key={period.periodId}
                preview={getDeletePeriodPreview(period.periodId)}
                describeDebtPreview={describeDebtPreview}
                isPending={deletePeriodPending}
                onCancel={() => setDeletingPeriodId(null)}
                onConfirm={() => void handleConfirmDelete(period.periodId)}
              />
            ) : editingPeriodId === period.periodId ? (
              <PeriodForm
                key={period.periodId}
                mode="edit"
                startDate={editForm.startDate}
                endDate={editForm.endDate}
                isOngoing={editForm.isOngoing}
                periodType={editForm.periodType}
                startError={editForm.startError}
                endError={editForm.endError}
                preview={editPeriodPreview}
                feedback={periodFeedback}
                isPending={updatePeriodPending}
                minDate={persistedDobDate ?? ''}
                maxDate={todayHijriDate()}
                onStartChange={(value) => {
                  updateEditForm({ startDate: value, startError: '' });
                  resetFeedback();
                }}
                onEndChange={(value) => {
                  updateEditForm({ endDate: value, endError: '' });
                  resetFeedback();
                }}
                onOngoingChange={(value) => {
                  updateEditForm({
                    isOngoing: value,
                    endDate: value ? '' : editForm.endDate,
                    endError: '',
                  });
                  resetFeedback();
                }}
                onTypeChange={(value) => updateEditForm({ periodType: value })}
                onStartError={(message) => updateEditForm({ startError: message })}
                onEndError={(message) => updateEditForm({ endError: message })}
                onSubmit={() => void handleSaveEdit()}
                onCancel={handleCancelEdit}
                onDelete={() => setDeletingPeriodId(period.periodId)}
              />
            ) : (
              <PeriodRow
                key={period.periodId}
                period={period}
                onEdit={() => handleStartEdit(period)}
              />
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
          startDate={addForm.startDate}
          endDate={addForm.endDate}
          isOngoing={addForm.isOngoing}
          periodType={addForm.periodType}
          startError={addForm.startError}
          endError={addForm.endError}
          preview={addPeriodPreview}
          feedback={periodFeedback}
          isPending={addPeriodPending}
          minDate={persistedDobDate ?? ''}
          maxDate={todayHijriDate()}
          onStartChange={(value) => {
            updateAddForm({ startDate: value, startError: '' });
            resetFeedback();
          }}
          onEndChange={(value) => {
            updateAddForm({ endDate: value, endError: '' });
            resetFeedback();
          }}
          onOngoingChange={(value) => {
            updateAddForm({
              isOngoing: value,
              endDate: value ? '' : addForm.endDate,
              endError: '',
            });
            resetFeedback();
          }}
          onTypeChange={(value) => updateAddForm({ periodType: value })}
          onStartError={(message) => updateAddForm({ startError: message })}
          onEndError={(message) => updateAddForm({ endError: message })}
          onSubmit={() => void handleAddPeriod()}
          onCancel={resetAddForm}
        />
      )}
    </SettingsSection>
  );
};
