import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { getAuthService } from '@/lib/auth-service';
import { Card } from '@/components/ui/card/card';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { getAuthErrorKey } from '@/lib/auth-errors';
import { AuthNotice } from './auth-notice';
import styles from './auth-forms.module.css';

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

type ForgotPhase = 'request' | 'confirm';

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<ForgotPhase>('request');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusKey, setStatusKey] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusKey(null);
    setLoading(true);

    try {
      const authService = await getAuthService();
      await authService.forgotPassword(email);
      setPhase('confirm');
    } catch (err: unknown) {
      setStatusKey(getAuthErrorKey(err, 'auth.forgot_password_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusKey(null);
    if (newPassword !== confirmPassword) {
      setStatusKey('auth.password_mismatch');
      return;
    }

    setLoading(true);

    try {
      const authService = await getAuthService();
      await authService.confirmPassword(email, verificationCode, newPassword);
      await authService.signIn(email, newPassword);
      onSuccess();
    } catch (err: unknown) {
      setStatusKey(getAuthErrorKey(err, 'auth.forgot_password_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setStatusKey(null);
  };

  const handleVerificationCodeChange = (value: string) => {
    setVerificationCode(value);
    setStatusKey(null);
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setStatusKey(null);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setStatusKey(null);
  };

  if (phase === 'confirm') {
    return (
      <Card variant="glass" className={styles.container}>
        <h2 className={styles.title}>{t('auth.reset_password')}</h2>
        <p className={styles.subtitle}>{t('auth.reset_password_subtitle')}</p>

        <form onSubmit={handleConfirm} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="verificationCode">{t('auth.verify_code')}</label>
            <div className={styles.inputWrapper}>
              <ShieldCheck className={styles.inputIcon} size={18} />
              <input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => handleVerificationCodeChange(e.target.value)}
                placeholder={t('auth.verify_code_placeholder')}
                required
                data-testid="forgot-code"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="newPassword">{t('auth.new_password')}</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                required
                data-testid="forgot-new-password"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">{t('auth.confirm_password')}</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                required
                data-testid="forgot-confirm-password"
              />
            </div>
          </div>

          {statusKey && <AuthNotice message={t(statusKey)} />}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            data-testid="forgot-confirm-submit"
          >
            {loading ? <span className="animate-spin">...</span> : t('auth.reset_password')}
          </button>
        </form>

        <div className={styles.footer}>
          <button type="button" onClick={onSwitchToLogin} className={styles.switchBtn}>
            {t('auth.back_to_login')}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={styles.container}>
      <h2 className={styles.title}>{t('auth.forgot_password')}</h2>
      <p className={styles.subtitle}>{t('auth.forgot_password_subtitle')}</p>

      <form onSubmit={handleRequest} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">{t('auth.email')}</label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              required
              data-testid="forgot-email"
            />
          </div>
        </div>

        {statusKey && <AuthNotice message={t(statusKey)} />}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          data-testid="forgot-submit"
        >
          {loading ? <span className="animate-spin">...</span> : t('auth.send_reset_code')}
        </button>
      </form>

      <div className={styles.footer}>
        <button type="button" onClick={onSwitchToLogin} className={styles.switchBtn}>
          {t('auth.back_to_login')}
        </button>
      </div>
    </Card>
  );
};
