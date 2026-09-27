'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Brand } from '../../../components/brand';
import { PreferredStrategy, PreferredTrade, RegistrationInput, getStrategySuggestions, register } from '../../../lib/api';
import styles from './register.module.css';

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

const tradeOptions: Array<{ value: PreferredTrade; label: string }> = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'forex', label: 'Forex' },
  { value: 'indices', label: 'Indices' },
  { value: 'all', label: 'All markets' },
];

const strategyOptions: Array<{ value: PreferredStrategy; label: string }> = [
  { value: 'smc', label: 'SMC — Smart Money Concepts' },
  { value: 'ict', label: 'ICT — Inner Circle Trader' },
  { value: 'algo', label: 'ALGO' },
  { value: 'msnr', label: 'MSNR' },
  { value: 'price_action', label: 'Price Action' },
  { value: 'custom', label: 'Custom strategy' },
];

type RegistrationForm = RegistrationInput & { confirmPassword: string };
type FieldName = keyof RegistrationForm;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialForm: RegistrationForm = {
  email: '',
  password: '',
  confirmPassword: '',
  traderName: '',
  preferredTrade: 'all',
  preferredStrategy: 'smc',
  customStrategy: '',
};

function passwordChecks(password: string) {
  return [
    { label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`, passed: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH },
    { label: 'An uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'A lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'A number', passed: /\d/.test(password) },
    { label: 'A special character', passed: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

function getPasswordStrength(password: string): { label: string; tone: 'weak' | 'fair' | 'strong' } {
  if (!password) return { label: 'Start typing to check password strength', tone: 'weak' };
  const score = passwordChecks(password).filter((check) => check.passed).length;
  if (score === 5) return { label: 'Strong password', tone: 'strong' };
  if (score >= 3) return { label: 'Almost there', tone: 'fair' };
  return { label: 'Needs strengthening', tone: 'weak' };
}

function validate(form: RegistrationForm): FieldErrors {
  const errors: FieldErrors = {};
  const checks = passwordChecks(form.password);
  const customStrategy = form.customStrategy?.trim() ?? '';

  if (!form.traderName.trim()) errors.traderName = 'Enter the name you trade under.';
  else if (form.traderName.trim().length > 80) errors.traderName = 'Trader name must be 80 characters or fewer.';

  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!checks.every((check) => check.passed)) {
    errors.password = `Use ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters with uppercase, lowercase, number, and special character.`;
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  if (form.preferredStrategy === 'custom' && !customStrategy) {
    errors.customStrategy = 'Tell us the name of your custom strategy.';
  } else if (form.preferredStrategy === 'custom' && customStrategy.length < 3) {
    errors.customStrategy = 'Use at least 3 characters for your custom strategy.';
  } else if (customStrategy.length > 160) {
    errors.customStrategy = 'Keep your strategy suggestion to 160 characters or fewer.';
  }

  return errors;
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [communitySuggestions, setCommunitySuggestions] = useState<string[]>([]);

  const checks = useMemo(() => passwordChecks(form.password), [form.password]);
  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  useEffect(() => {
    let active = true;
    void getStrategySuggestions()
      .then((suggestions) => {
        if (active) setCommunitySuggestions(suggestions.slice(0, 6));
      })
      // Suggestions enhance the form but should never block account creation.
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  function updateField(name: FieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name] && !(name === 'password' && current.confirmPassword)) return current;
      const next = { ...current };
      delete next[name];
      if (name === 'password') delete next.confirmPassword;
      return next;
    });
    setMessage('');
  }

  function onStrategyChange(event: ChangeEvent<HTMLSelectElement>) {
    const preferredStrategy = event.target.value as PreferredStrategy;
    setForm((current) => ({ ...current, preferredStrategy, customStrategy: preferredStrategy === 'custom' ? current.customStrategy : '' }));
    setErrors((current) => {
      const next = { ...current };
      delete next.customStrategy;
      return next;
    });
  }

  function chooseCommunitySuggestion(suggestion: string) {
    setForm((current) => ({ ...current, preferredStrategy: 'custom', customStrategy: suggestion }));
    setErrors((current) => {
      const next = { ...current };
      delete next.customStrategy;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setMessage('Please review the highlighted fields before creating your account.');
      return;
    }

    setPending(true);
    setMessage('');
    try {
      const { confirmPassword: _confirmPassword, ...registration } = form;
      const result = await register({
        ...registration,
        email: registration.email.trim(),
        traderName: registration.traderName.trim(),
        customStrategy: registration.preferredStrategy === 'custom' ? registration.customStrategy?.trim() : undefined,
      });
      setMessage(result.message);
      setComplete(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration could not be completed. Check your details and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card auth-card-register" onSubmit={submit} noValidate>
        <Link className={styles.homeLink} href="/">
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <path d="M11.75 4.5 6.25 10l5.5 5.5M6.75 10h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back to home</span>
        </Link>
        <Brand />
        <p className="eyebrow">CREATE YOUR WORKSPACE</p>
        <h1>Trade your way.</h1>
        <p className="auth-copy">Tell us how you approach the market. We use these preferences to make your Only1AI workspace feel like yours.</p>

        <fieldset className="registration-section">
          <legend>Your trading profile</legend>
          <label htmlFor="trader-name">Trader name
            <input id="trader-name" name="traderName" type="text" autoComplete="nickname" maxLength={80} value={form.traderName} onChange={(event) => updateField('traderName', event.target.value)} aria-invalid={Boolean(errors.traderName)} aria-describedby={errors.traderName ? 'trader-name-error' : undefined} placeholder="How should we call you?" required />
          </label>
          {errors.traderName && <p id="trader-name-error" className="field-error" role="alert">{errors.traderName}</p>}

          <div className="form-row">
            <label htmlFor="preferred-trade">Preferred trade
              <select id="preferred-trade" name="preferredTrade" value={form.preferredTrade} onChange={(event) => updateField('preferredTrade', event.target.value)}>
                {tradeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor="preferred-strategy">Preferred strategy
              <select id="preferred-strategy" name="preferredStrategy" value={form.preferredStrategy} onChange={onStrategyChange}>
                {strategyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          {communitySuggestions.length > 0 && <aside className="strategy-suggestions" aria-labelledby="community-suggestions-title">
            <p id="community-suggestions-title"><strong>Community suggestions</strong><span>Pick one to use it as your custom starting point.</span></p>
            <div>{communitySuggestions.map((suggestion) => <button key={suggestion} className="strategy-suggestion" type="button" onClick={() => chooseCommunitySuggestion(suggestion)}>{suggestion}</button>)}</div>
          </aside>}

          {form.preferredStrategy === 'custom' && <div className="custom-strategy-field">
            <label htmlFor="custom-strategy">Your custom strategy
              <textarea id="custom-strategy" name="customStrategy" maxLength={160} value={form.customStrategy ?? ''} onChange={(event) => updateField('customStrategy', event.target.value)} aria-invalid={Boolean(errors.customStrategy)} aria-describedby={errors.customStrategy ? 'custom-strategy-help custom-strategy-error' : 'custom-strategy-help'} placeholder="For example: London-session liquidity sweep and displacement" required />
            </label>
            <p id="custom-strategy-help" className="form-hint">We’ll save this as a strategy suggestion other traders can discover.</p>
            {errors.customStrategy && <p id="custom-strategy-error" className="field-error" role="alert">{errors.customStrategy}</p>}
          </div>}
        </fieldset>

        <fieldset className="registration-section">
          <legend>Secure your account</legend>
          <label htmlFor="register-email">Email address
            <input id="register-email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'register-email-error' : undefined} placeholder="you@example.com" required />
          </label>
          {errors.email && <p id="register-email-error" className="field-error" role="alert">{errors.email}</p>}

          <label htmlFor="register-password">Password
            <span className="password-input-wrap">
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} value={form.password} onChange={(event) => updateField('password', event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-guidance password-error' : 'password-guidance'} placeholder="Create a strong password" required />
              <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          <div id="password-guidance" className="password-guidance">
            <div className={`password-strength is-${strength.tone}`} aria-live="polite"><span aria-hidden="true" />{strength.label}</div>
            <p className="password-note">Use all of the following. Passwords longer than {PASSWORD_MAX_LENGTH} characters are not accepted.</p>
            <ul className="password-requirements" aria-label="Password requirements">
              {checks.map((check) => <li key={check.label} className={check.passed ? 'is-met' : ''}><span aria-hidden="true">{check.passed ? '✓' : '○'}</span>{check.label}</li>)}
            </ul>
          </div>
          {errors.password && <p id="password-error" className="field-error" role="alert">{errors.password}</p>}

          <label htmlFor="confirm-password">Confirm password
            <span className="password-input-wrap">
              <input id="confirm-password" name="confirmPassword" type={showConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined} placeholder="Re-enter your password" required />
              <button className="password-toggle" type="button" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)}>{showConfirmation ? 'Hide' : 'Show'}</button>
            </span>
          </label>
          {errors.confirmPassword && <p id="confirm-password-error" className="field-error" role="alert">{errors.confirmPassword}</p>}
        </fieldset>

        <button className="button" disabled={pending || complete} type="submit">{complete ? 'Account request received' : pending ? 'Creating account…' : 'Create account'}</button>
        <p className={`form-status${message && !complete ? ' is-error' : complete ? ' is-success' : ''}`} role={message && !complete ? 'alert' : 'status'}>{message}</p>
        <Link href="/login">Already have an account? Sign in</Link>
      </form>
    </main>
  );
}
