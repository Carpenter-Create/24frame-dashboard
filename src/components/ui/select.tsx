"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

import { AppearanceCheck } from "@/components/chrome/appearance-check";
import {
  HOUSE_FORM_SELECT_CHEVRON_CLASS,
  HOUSE_FORM_SELECT_OPTION_CHECK_CLASS,
  HOUSE_FORM_SELECT_OPTION_CHECK_GUTTER_CLASS,
  HOUSE_FORM_SELECT_OPTION_LABEL_CLASS,
  HOUSE_FORM_SELECT_PANEL_CLASS,
  HOUSE_FORM_SELECT_TRIGGER_CLASS,
  HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS,
  houseFormSelectOptionClass,
  type HouseFormSelectOption,
} from "@/lib/house-form-select";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";

export type { HouseFormSelectOption };

export function Select({
  id,
  name,
  value,
  options,
  disabled,
  defaultOpen = false,
  onChange,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value: string;
  options: readonly HouseFormSelectOption[];
  disabled?: boolean;
  defaultOpen?: boolean;
  onChange: (value: string) => void;
  "aria-label"?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const host = hostRef.current;
      if (!host || host.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  function pick(next: string) {
    setOpen(false);
    onChange(next);
  }

  return (
    <div data-house-form-select="" className="relative w-full" ref={hostRef}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        id={id}
        data-house-form-select-trigger=""
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={HOUSE_FORM_SELECT_TRIGGER_CLASS}
      >
        <span data-house-form-select-current="" className={HOUSE_FORM_SELECT_TRIGGER_LABEL_CLASS}>
          {current?.label ?? value}
        </span>
        <CaretDown
          data-house-form-select-chevron=""
          className={HOUSE_FORM_SELECT_CHEVRON_CLASS}
          weight={PHOSPHOR_CHROME_IDLE_WEIGHT}
        />
      </button>
      {open ? (
        <div
          data-house-form-select-menu=""
          role="listbox"
          aria-label={ariaLabel}
          className={HOUSE_FORM_SELECT_PANEL_CLASS}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                data-house-form-select-option={option.value}
                aria-selected={selected}
                className={houseFormSelectOptionClass(selected)}
                onClick={() => pick(option.value)}
              >
                <span
                  data-house-form-select-option-label=""
                  className={HOUSE_FORM_SELECT_OPTION_LABEL_CLASS}
                >
                  {option.label}
                </span>
                <span
                  data-house-form-select-option-check=""
                  className={HOUSE_FORM_SELECT_OPTION_CHECK_GUTTER_CLASS}
                  aria-hidden="true"
                >
                  <AppearanceCheck
                    selected={selected}
                    className={HOUSE_FORM_SELECT_OPTION_CHECK_CLASS}
                  />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
