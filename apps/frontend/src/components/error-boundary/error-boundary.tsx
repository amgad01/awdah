import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '@/i18n';
import styles from './error-boundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log the render error for observability. In production this feeds into
    // browser devtools and any monitoring service wired to window.onerror.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.container} role="alert" aria-live="assertive">
          <p className={styles.heading}>{i18n.t('common.error')}</p>
          <button className={styles.reloadBtn} onClick={this.handleReload}>
            {i18n.t('common.retry')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
