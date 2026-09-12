import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';

export interface InlineEditProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    multiline?: boolean;
    className?: string;
    editClassName?: string;
    validate?: (value: string) => string | null;
}

const baseInputClass =
    'rounded border border-border bg-surface text-content px-2 py-0.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[8rem]';

/**
 * @registryCategory atomic
 * @registryTags inline edit editable
 */
export function InlineEdit({
    value,
    onChange,
    placeholder,
    disabled = false,
    multiline = false,
    className,
    editClassName,
    validate,
}: InlineEditProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    // Sync display value if parent updates while not editing
    useEffect(() => {
        if (!editing) {
            setDraft(value);
        }
    }, [value, editing]);

    const startEditing = useCallback(() => {
        if (disabled) return;
        setDraft(value);
        setError(null);
        setEditing(true);
    }, [disabled, value]);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
        }
    }, [editing]);

    const tryCommit = useCallback(
        (newValue: string) => {
            if (validate) {
                const msg = validate(newValue);
                if (msg !== null) {
                    setError(msg);
                    return false;
                }
            }
            setError(null);
            setEditing(false);
            if (newValue !== value) {
                onChange(newValue);
            }
            return true;
        },
        [validate, value, onChange],
    );

    const cancel = useCallback(() => {
        setError(null);
        setEditing(false);
        setDraft(value);
    }, [value]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
                return;
            }
            if (!multiline && e.key === 'Enter') {
                e.preventDefault();
                tryCommit(draft);
                return;
            }
            if (multiline && e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                tryCommit(draft);
            }
        },
        [multiline, draft, tryCommit, cancel],
    );

    const handleBlur = useCallback(() => {
        const committed = tryCommit(draft);
        if (!committed) {
            // Validation failed — cancel instead of leaving in edit mode with error
            cancel();
        }
    }, [draft, tryCommit, cancel]);

    const inputClass = `${baseInputClass}${editClassName ? ` ${editClassName}` : ''}`;
    const ariaLabel = 'Edit';

    if (editing) {
        return (
            <span className="inline-flex flex-col gap-0.5">
                {multiline ? (
                    <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        aria-label={ariaLabel}
                        className={`${inputClass} resize-none`}
                        rows={3}
                    />
                ) : (
                    <input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        aria-label={ariaLabel}
                        className={inputClass}
                    />
                )}
                {error && (
                    <span className="text-xs text-danger" role="alert">
                        {error}
                    </span>
                )}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={startEditing}
            disabled={disabled}
            aria-label={ariaLabel}
            className={`group inline-flex items-center gap-1 rounded px-1 py-0.5 text-sm text-content transition-colors
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted-bg focus:outline-none focus:ring-1 focus:ring-primary'}
                ${className ?? ''}`}
        >
            <span className={value ? '' : 'text-muted'}>
                {value || placeholder || <span className="italic text-muted">Click to edit</span>}
            </span>
            {!disabled && (
                <Pencil
                    size={12}
                    aria-hidden="true"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60 group-focus:opacity-60"
                />
            )}
        </button>
    );
}
