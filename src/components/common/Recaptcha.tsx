import { useEffect, useId, useRef } from 'react';
import { env } from '../../config/env';
import { useTheme } from '../../context/ThemeContext';

/**
 * Google's reCAPTCHA v2 checkbox, as a React component.
 *
 * Written against the API directly rather than pulling in a wrapper package:
 * the whole integration is one script tag and three calls, and a dependency
 * for that would be more code to keep current than the code it replaces.
 *
 * The parent owns the token. This component reports it upward and never
 * renders anything about it, because the token is only ever interesting to the
 * submit handler - and a token is single-use, so the parent also needs a way
 * to throw one away after a failed submit. That is what the `resetKey` prop
 * is for: change it and the widget clears itself back to an unticked box.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          theme?: 'light' | 'dark';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
    /** Named in the script URL below; grecaptcha calls it once it is usable. */
    __onRecaptchaLoad?: () => void;
  }
}

const SCRIPT_ID = 'google-recaptcha-v2';

/**
 * Loads api.js once per document and resolves when grecaptcha is usable.
 *
 * Module-level rather than per-component: two mounted widgets must not insert
 * two script tags, and React 18's StrictMode mounts every component twice in
 * development - without this, a dev-mode login screen would try to load the
 * script twice on every render pass.
 *
 * `onload=` plus `render=explicit` is the documented way to know the API is
 * ready. Polling for window.grecaptcha would also work and would also be a
 * race, since the object exists slightly before render() does.
 */
let loader: Promise<void> | null = null;

function loadRecaptcha(): Promise<void> {
  if (loader) return loader;

  loader = new Promise<void>((resolve, reject) => {
    if (window.grecaptcha?.render) {
      resolve();
      return;
    }

    window.__onRecaptchaLoad = () => resolve();

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) return; // Already in flight; the callback above will fire.

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src =
      'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      // A blocked or offline script must not leave the promise pending forever,
      // or the sign-in button would sit disabled with no explanation.
      loader = null;
      reject(new Error('reCAPTCHA script could not be loaded'));
    };
    document.head.appendChild(script);
  });

  return loader;
}

interface RecaptchaProps {
  /** Called with the token when the box is ticked, and with null when it is not. */
  onChange: (token: string | null) => void;
  /**
   * Change this to clear a spent token. A reCAPTCHA token is valid once and for
   * two minutes, so after any failed submit the old one is worthless and the
   * visitor has to tick again.
   */
  resetKey?: number;
  /** Rendered under the widget when the parent wants to mark it as required. */
  error?: string | null;
}

export function Recaptcha({ onChange, resetKey = 0, error }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const { theme } = useTheme();
  const describedBy = useId();

  // Kept in a ref so the render effect below does not depend on the parent
  // passing a stable callback - re-rendering the widget on every keystroke in
  // the email field would reset the visitor's tick.
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!env.recaptchaSiteKey) return;

    let cancelled = false;

    void loadRecaptcha()
      .then(() => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        if (!window.grecaptcha?.render) return;

        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: env.recaptchaSiteKey,
          theme: theme === 'dark' ? 'dark' : 'light',
          callback: (token: string) => onChangeRef.current(token),
          // A token expires after two minutes. Clearing it here means a form
          // left open then submitted fails in the browser rather than at the
          // server, which is a clearer thing to recover from.
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => onChangeRef.current(null),
        });
      })
      .catch(() => {
        // Reported as "no token"; the parent decides whether to block submit.
        if (!cancelled) onChangeRef.current(null);
      });

    return () => {
      cancelled = true;
    };
    // theme is deliberately absent: grecaptcha bakes the theme in at render
    // time and offers no way to change it, so reacting to a theme toggle would
    // mean destroying and recreating the widget and discarding a valid tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetKey === 0 || widgetIdRef.current === null) return;
    window.grecaptcha?.reset(widgetIdRef.current);
    onChangeRef.current(null);
  }, [resetKey]);

  // Nothing configured: render nothing at all rather than an empty bordered
  // box. The backend accepts tokenless submissions while its secret is unset,
  // so this is a working state, not a broken one.
  if (!env.recaptchaSiteKey) return null;

  return (
    <div>
      <div ref={containerRef} aria-describedby={error ? describedBy : undefined} />
      {error && (
        <p id={describedBy} className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
