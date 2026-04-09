import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { getAuthService } from '@/lib/auth-service';
import { Card } from '@/components/ui/card/card';
import { Loader2, Mail, Lock, ShieldCheck, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthErrorKey } from '@/lib/auth-errors';
import styles from './auth-forms.module.css';

interface SignupFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

type SignupPhase = 'register' | 'verify';

const PASSWORD_MIN_LENGTH = 12;

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [phase, setPhase] = useState<SignupPhase>('register');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= PASSWORD_MIN_LENGTH,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^a-zA-Z0-9]/.test(password),
    }),
    [password],
  );

  const allChecksPassed = Object.values(passwordChecks).every(Boolean);

  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const showMatchHint = confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (password !== confirmPassword) {
      toast.error(t('auth.password_mismatch'));
      setLoading(false);
      return;
    }

    try {
      const authService = await getAuthService();
      const { needsVerification } = await authService.signUp(email, password);
      if (needsVerification) {
        setPhase('verify');
      } else {
        // Local auth, no verification needed, sign in directly
        await authService.signIn(email, password);
        onSuccess();
      }
    } catch (err: unknown) {
      toast.error(t(getAuthErrorKey(err, 'auth.signup_error')));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authService = await getAuthService();
      await authService.confirmSignUp(email, verifyCode);
      await authService.signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      toast.error(t(getAuthErrorKey(err, 'auth.verify_error')));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const authService = await getAuthService();
      await authService.signUp(email, password);
      toast.success(t('auth.verify_resend_done'));
    } catch (err: unknown) {
      toast.error(t(getAuthErrorKey(err, 'auth.signup_error')));
    }
  };

  if (phase === 'verify') {
    return (
      <Card variant="glass" className={styles.container}>
        <h2 className={styles.title}>{t('auth.verify_title')}</h2>
        <p className={styles.subtitle}>{t('auth.verify_subtitle')}</p>

        <form onSubmit={handleVerify} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="verifyCode">{t('auth.verify_code')}</label>
            <div className={styles.inputWrapper}>
              <ShieldCheck className={styles.inputIcon} size={18} />
              <input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder={t('auth.verify_code_placeholder')}
                required
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : t('auth.verify_btn')}
          </button>
        </form>

        <div className={styles.footer}>
          <button type="button" onClick={handleResend} className={styles.switchBtn}>
            {t('auth.verify_resend')}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" className={styles.container}>
      <h2 className={styles.title}>{t('auth.sign_up')}</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email">{t('auth.email')}</label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} size={18} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              required
              data-testid="signup-email"
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">{t('auth.password')}</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.password_placeholder')}
              required
              data-testid="signup-password"
            />
          </div>
          {password.length > 0 && (
            <ul
              className={styles.passwordChecklist}
              aria-label={t('auth.password_requirements_title')}
            >
              <li className={passwordChecks.length ? styles.checkPass : styles.checkFail}>
                {passwordChecks.length ? <Check size={12} /> : <X size={12} />}
                <span>{t('auth.password_requirement_length')}</span>
              </li>
              <li className={passwordChecks.lowercase ? styles.checkPass : styles.checkFail}>
                {passwordChecks.lowercase ? <Check size={12} /> : <X size={12} />}
                <span>{t('auth.password_requirement_lowercase')}</span>
              </li>
              <li className={passwordChecks.uppercase ? styles.checkPass : styles.checkFail}>
                {passwordChecks.uppercase ? <Check size={12} /> : <X size={12} />}
                <span>{t('auth.password_requirement_uppercase')}</span>
              </li>
              <li className={passwordChecks.number ? styles.checkPass : styles.checkFail}>
                {passwordChecks.number ? <Check size={12} /> : <X size={12} />}
                <span>{t('auth.password_requirement_number')}</span>
              </li>
              <li className={passwordChecks.symbol ? styles.checkPass : styles.checkFail}>
                {passwordChecks.symbol ? <Check size={12} /> : <X size={12} />}
                <span>{t('auth.password_requirement_symbol')}</span>
              </li>
            </ul>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="confirmPassword">{t('auth.confirm_password')}</label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} size={18} />
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirm_password_placeholder')}
              required
              data-testid="signup-confirm-password"
            />
          </div>
          {showMatchHint && (
            <p
              className={passwordsMatch ? styles.matchHintPass : styles.matchHintFail}
              role="status"
            >
              {passwordsMatch ? <Check size={12} /> : <X size={12} />}
              <span>
                {passwordsMatch ? t('auth.passwords_match') : t('auth.passwords_do_not_match')}
              </span>
            </p>
          )}
        </div>

        <button
          type="submit"
          data-testid="signup-submit"
          className={styles.submitBtn}
          disabled={loading || !allChecksPassed || !passwordsMatch}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : t('auth.sign_up')}
        </button>
      </form>

      <div className={styles.footer}>
        <span>{t('auth.have_account')}</span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className={styles.switchBtn}
          data-testid="switch-to-login"
        >
          {t('auth.login')}
        </button>
      </div>
    </Card>
  );
};
