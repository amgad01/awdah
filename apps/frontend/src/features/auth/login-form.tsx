import React, { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { getAuthService } from '@/lib/auth-service';
import { Card } from '@/components/ui/card/card';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import styles from './auth-forms.module.css';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToSignup }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const authService = await getAuthService();
      await authService.signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="glass" className={styles.container}>
      <h2 className={styles.title}>{t('auth.login')}</h2>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

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
            />
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={20} /> : t('auth.login')}
        </button>
      </form>

      <div className={styles.footer}>
        <span>{t('auth.no_account')}</span>
        <button type="button" onClick={onSwitchToSignup} className={styles.switchBtn}>
          {t('auth.sign_up')}
        </button>
      </div>
    </Card>
  );
};
