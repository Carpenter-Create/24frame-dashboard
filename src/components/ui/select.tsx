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
  houseFormSelectMatch,
  houseFormSelectOptionClass,
  houseFormSelectStep,
  type HouseFormSelectOption,
} from "@/lib/house-form-select";
import { PHOSPHOR_CHROME_IDLE_WEIGHT } from "@/lib/phosphor-icon";

export type { HouseFormSelectOption };

// Keys: on the field, ↓ ↑ Enter or Space open the menu on the chosen option.
// On the menu, ↓ ↑ Home End move, typing jumps to a label, Enter or Space
// picks, Esc closes back to the field, Tab moves on.
const TYPE_AHEAD_MS = 500;

export function Select({
  id,
  name,
  value,
  options,
  disabled,
  defaultOpen = false,
  onChange,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name?: string;
  value: string;
  options: readonly HouseFormSelectOption[];
  disabled?: boolean;
  defaultOpen?: boolean;
  onChange: (value: string) => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(defaultOpen);
  const current = options.find((option) => option.value === value);

  function optionNodes(): HTMLButtonElement[] {
    return [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[data-house-form-select-option]") ?? [])];
  }

  function focusOption(index: number) {
    const node = optionNodes()[index];
    if (!node) return;
    node.focus();
    node.scrollIntoView?.({ block: "nearest" });
  }

  // The menu opens on the chosen option (or the first).
  const chosenIndex = options.findIndex((option) => option.value === value);
  useEffect(() => {
    if (!open || defaultOpen) return;
    focusOption(Math.max(0, chosenIndex));
    // Only when the menu opens; picking closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const inside = hostRef.current?.contains(document.activeElement) ?? false;
      setOpen(false);
      if (inside) triggerRef.current?.focus();
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
    triggerRef.current?.focus();
  }

  function onTriggerKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (open || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    event.preventDefault();
    setOpen(true);
  }

  function onMenuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const nodes = optionNodes();
    const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const step = houseFormSelectStep(index, event.key, nodes.length);
    if (step !== null) {
      event.preventDefault();
      focusOption(step);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const now = Date.now();
    const typed = typedRef.current;
    if (now - typed.at > TYPE_AHEAD_MS) typed.text = "";
    // Space picks unless a word is being typed.
    if (event.key === " " && typed.text === "") return;
    typed.text += event.key;
    typed.at = now;
    event.preventDefault();
    const match = houseFormSelectMatch(options, typed.text, index);
    if (match !== null) focusOption(match);
  }

  return (
    <div data-house-form-select="" className="relative w-full" ref={hostRef}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        data-house-form-select-trigger=""
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onKeyDown={onTriggerKey}
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
          ref={listRef}
          data-house-form-select-menu=""
          role="listbox"
          aria-label={ariaLabel}
          className={HOUSE_FORM_SELECT_PANEL_CLASS}
          onKeyDown={onMenuKey}
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
