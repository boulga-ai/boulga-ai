import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input(
  {
    label,
    error,
    helperText,
    id,
    className = "",
    ...props
  }: InputProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-ui font-body font-500 text-neutral-text mb-1"
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={`
          w-full px-3 py-2.5
          text-body font-body
          bg-neutral-white
          border border-neutral-border rounded-md
          placeholder:text-neutral-text-tertiary
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-0 focus:border-transparent
          disabled:bg-neutral-bg disabled:text-neutral-text-tertiary disabled:cursor-not-allowed
          ${error ? "border-error focus:ring-error" : ""}
          ${className}
        `}
        {...props}
      />

      {(error || helperText) && (
        <p
          className={`
            mt-1 text-caption font-body
            ${error ? "text-error" : "text-neutral-text-tertiary"}
          `}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}

const InputForwarded = React.forwardRef(Input);
InputForwarded.displayName = "Input";
export { InputForwarded };
