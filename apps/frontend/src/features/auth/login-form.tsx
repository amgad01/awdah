import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { getAuthService } from '@/lib/auth-service';
import { Card } from '@/components/ui/card/card';
import { Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthErrorKey } from '@/lib/auth-errors';
import styles from './auth-forms.module.css';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
  onSwitchToForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignup,
  onSwitchToForgotPassword,
}) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authService = await getAuthService();
      await authService.signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      const message = getAuthErrorKey(err, 'auth.login_error');
      toast.error(t(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="glass" className={styles.container}>
      <h2 className={styles.title}>{t('auth.login')}</h2>

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
              data-testid="login-email"
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
              data-testid="login-password"
            />
          </div>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
          data-testid="login-submit"
        >
          {loading ? <span className="animate-spin">...</span> : t('auth.login')}
        </button>
      </form>

      <div className={styles.footer}>
        <button type="button" onClick={onSwitchToForgotPassword} className={styles.switchBtn}>
          {t('auth.forgot_password')}
        </button>
      </div>

      <div className={styles.footer}>
        <span>{t('auth.no_account')}</span>
        <button
          type="button"
          onClick={onSwitchToSignup}
          className={styles.switchBtn}
          data-testid="switch-to-signup"
        >
          {t('auth.sign_up')}
        </button>
      </div>
    </Card>
  );
};
