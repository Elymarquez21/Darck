export const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  maxLength,
  required = true,
  autoComplete,
  helperText,
  inputMode,
}) => {
  const showError = Boolean(touched && error)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-crimson-deep">
          {label} {required && <span className="text-crimson-bright">*</span>}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={showError}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-ink bg-white/70 outline-none transition-all duration-200 focus:ring-2 ${
          showError
            ? 'border-crimson-bright focus:ring-crimson-bright/30'
            : 'border-gold/40 focus:ring-gold/40 focus:border-gold'
        }`}
      />

      <div className="min-h-[18px] flex items-center justify-between gap-2">
        {showError ? (
          <p className="text-crimson-bright text-xs">{error}</p>
        ) : helperText ? (
          <p className="text-ink/50 text-xs">{helperText}</p>
        ) : (
          <span />
        )}
        {maxLength && (
          <span className="text-[11px] text-ink/30 whitespace-nowrap">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
