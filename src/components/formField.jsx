import { useState } from 'react';

const borderByStatus = {
  idle: 'border-gold-dim focus:border-gold',
  error: 'border-error focus:border-error',
  success: 'border-success focus:border-success',
};

function FormField({ id, label, type = 'text', value, onChange, onBlur, errorMessage, isValid, autoComplete, helpText, showPasswordToggle = false }) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const status = errorMessage ? 'error' : isValid ? 'success' : 'idle';
  const messageId = `${id}Message`;
  const helpId = `${id}Help`;
  const describedBy = [focused && helpText ? helpId : null, errorMessage ? messageId : null].filter(Boolean).join(' ') || undefined;
  const inputType = showPasswordToggle && passwordVisible ? 'text' : type;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-xs uppercase tracking-wide text-gold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          autoComplete={autoComplete}
          placeholder="Escribe aquí..."
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={describedBy}
          className={`h-12 w-full border bg-panel-deep px-3 font-body text-sm text-parchment outline-none transition-colors placeholder:font-display placeholder:text-xs placeholder:text-muted ${showPasswordToggle ? 'pr-12' : ''} ${borderByStatus[status]}`}
        />
        {showPasswordToggle && (
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={passwordVisible} className="absolute right-3 top-1/2 -translate-y-1/2 text-gold transition-colors hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            {passwordVisible ? (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10.8 10.8 0 0112 4.9c5.2 0 8.7 4.2 9.7 6.1a2.2 2.2 0 010 2c-.4.8-1.2 1.9-2.3 2.8M6.6 6.6C4.7 8 3.4 10 2.3 12a2.2 2.2 0 000 2c1 1.9 4.5 6.1 9.7 6.1 1.1 0 2.1-.2 3-.5" />
              </svg>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.3 12a2.2 2.2 0 010-2C3.3 8.1 6.8 3.9 12 3.9S20.7 8.1 21.7 10a2.2 2.2 0 010 2c-1 1.9-4.5 6.1-9.7 6.1S3.3 13.9 2.3 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {helpText && (
        <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out motion-reduce:transition-none ${focused ? 'max-h-12 translate-y-0 opacity-100' : 'max-h-0 -translate-y-1 opacity-0'}`}>
          <p id={helpId} className="pb-0.5 font-body text-xs text-muted">{helpText}</p>
        </div>
      )}
      {errorMessage && (
        <p id={messageId} className="font-body text-xs text-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default FormField;
