export const Select = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  error,
  touched,
  required = true,
  helperText,
}) => {
  const showError = Boolean(touched && error)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-sm font-semibold text-crimson-deep">
          {label} {required && <span className="text-crimson-bright">*</span>}
        </label>
      )}

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={showError}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-ink bg-white/70 outline-none transition-all duration-200 focus:ring-2 ${
          showError
            ? 'border-crimson-bright focus:ring-crimson-bright/30'
            : 'border-gold/40 focus:ring-gold/40 focus:border-gold'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="min-h-[18px]">
        {showError ? (
          <p className="text-crimson-bright text-xs">{error}</p>
        ) : helperText ? (
          <p className="text-ink/50 text-xs">{helperText}</p>
        ) : null}
      </div>
    </div>
  )
}
