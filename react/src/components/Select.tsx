import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Icon } from "./Icon.js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id: string;
  options: SelectOption[];
  value?: string;
  ariaLabel?: string;
  labelledBy?: string;
  onChange?: (value: string) => void;
  dataActive?: boolean;
}

export interface SelectHandle {
  node: HTMLDivElement | null;
  trigger: HTMLButtonElement | null;
  value: string;
}

export const Select = forwardRef<SelectHandle, SelectProps>(function Select(
  props,
  ref,
) {
  const { id, options, value: externalValue, ariaLabel, labelledBy, onChange, dataActive } = props;
  const [value, setValueState] = useState<string>(
    externalValue ?? options[0]?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const typedRef = useRef("");
  const typedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (externalValue !== undefined) {
      setValueState(externalValue);
    } else if (options.length > 0 && !options.some((o) => o.value === value)) {
      setValueState(options[0].value);
    }
  }, [externalValue, options]);

  useImperativeHandle(ref, () => ({
    node: containerRef.current,
    trigger: triggerRef.current,
    value,
  }));

  const currentLabel = () => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : "";
  };

  const closeList = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  const openList = useCallback(() => {
    if (options.length === 0) return;
    setOpen(true);
    const index = options.findIndex((o) => o.value === value);
    setActiveIndex(index >= 0 ? index : 0);
  }, [options, value]);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      closeList(true);
      if (!option || option.value === value) return;
      setValueState(option.value);
      onChange?.(option.value);
    },
    [options, value, closeList, onChange],
  );

  useEffect(() => {
    function onOutsidePointer(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeList();
      }
    }

    if (open) {
      document.addEventListener("pointerdown", onOutsidePointer, true);
    }
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointer, true);
    };
  }, [open, closeList]);

  const typeahead = (char: string) => {
    clearTimeout(typedTimerRef.current);
    typedRef.current += char.toLowerCase();
    typedTimerRef.current = setTimeout(() => {
      typedRef.current = "";
    }, 700);

    const found = options.findIndex((option) =>
      option.label.toLowerCase().startsWith(typedRef.current),
    );
    if (found >= 0) {
      if (open) setActiveIndex(found);
      else commit(found);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) setActiveIndex((prev) => (prev + 1) % options.length);
        else openList();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open)
          setActiveIndex(
            (prev) => (prev - 1 + options.length) % options.length,
          );
        else openList();
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
      case "Spacebar":
        event.preventDefault();
        if (open) commit(activeIndex);
        else openList();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          closeList(true);
        }
        break;
      case "Tab":
        closeList();
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          typeahead(event.key);
        }
    }
  };

  return (
    <div className="pick" ref={containerRef}>
      <button
        ref={triggerRef}
        className="pick__trigger"
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        aria-activedescendant={
          open ? `${id}-option-${activeIndex}` : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        data-active={dataActive !== undefined ? String(dataActive) : undefined}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className="pick__text">{currentLabel()}</span>
        <span className="pick__caret">
          <Icon name="chevronDown" size={16} />
        </span>
      </button>

      <div
        ref={listRef}
        className="pick__list"
        role="listbox"
        id={`${id}-list`}
        hidden={!open}
        tabIndex={-1}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <div
              key={option.value}
              className="pick__option"
              role="option"
              id={`${id}-option-${index}`}
              aria-selected={selected ? "true" : "false"}
              data-active={isActive ? "true" : undefined}
              onClick={() => commit(index)}
              onMouseMove={() => setActiveIndex(index)}
            >
              <span className="pick__check">
                {selected ? <Icon name="check" size={16} /> : null}
              </span>
              <span>{option.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
