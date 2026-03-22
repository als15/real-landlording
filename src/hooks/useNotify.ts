import { useMemo } from 'react';
import { App } from 'antd';

/**
 * Drop-in replacement for App.useApp() that upgrades error/warning messages
 * to prominent notification cards instead of brief toast messages.
 *
 * Usage: const { message, modal } = useNotify();
 * Then use message.success/error/warning as usual — errors and warnings
 * will automatically display as larger, longer-lasting notification cards.
 *
 * Errors: 8s duration, closable, with countdown progress bar
 * Warnings: 6s duration, closable, with countdown progress bar
 * Success/Info: standard message toast (unchanged)
 */
export function useNotify() {
  const app = App.useApp();
  const { notification } = app;

  const enhancedMessage = useMemo(() => ({
    ...app.message,
    error(content: string) {
      notification.error({
        title: 'Error',
        description: content,
        duration: 8,
        showProgress: true,
        pauseOnHover: true,
      });
    },
    warning(content: string) {
      notification.warning({
        title: 'Warning',
        description: content,
        duration: 6,
        showProgress: true,
        pauseOnHover: true,
      });
    },
  }), [app.message, notification]);

  return { ...app, message: enhancedMessage };
}
