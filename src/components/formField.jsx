const borderByStatus = {
  idle: 'border-gold-dim focus:border-gold',
  error: 'border-error focus:border-error',
  success: 'border-success focus:border-success',
};

function FormField({ id, label, type = 'text', value, onChange, onBlur, errorMessage, isValid, autoComplete }) {
  const status = errorMessage ? 'error' : isValid ? 'success' : 'idle';
  const messageId = `${id}Message`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-xs uppercase tracking-wide text-gold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder="Escribe aquí..."
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? messageId : undefined}
        className={`h-12 w-full border bg-panel-deep px-3 font-body text-sm text-parchment outline-none transition-colors placeholder:font-display placeholder:text-xs placeholder:text-muted ${borderByStatus[status]}`}
      />
      {errorMessage && (
        <p id={messageId} className="font-body text-xs text-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default FormField;
