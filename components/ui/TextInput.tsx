"use client";

import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import styles from "./TextInput.module.css";

type TextInputProps = {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  type?: "text" | "password";
  autoComplete?: string;
  "aria-label"?: string;
};

export function TextInput({
  value,
  onChange,
  placeholder,
  onBlur,
  onKeyDown,
  type = "text",
  autoComplete,
  "aria-label": ariaLabel,
}: TextInputProps) {
  return (
    <input
      type={type}
      className={styles.input}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
    />
  );
}
