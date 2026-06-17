/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Spinner.tsx — Loading indicator
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT DOES
 *   Renders a CSS spinner. With a label it wraps the spinner in a full-page
 *   loading container with text beneath; without a label it returns the bare
 *   spinner element for inline use.
 *
 * RELATIONSHIPS
 *   Imports:
 *     · (none)
 *   Used by:
 *     · App.tsx (initial load) and various pages/buttons needing a busy indicator
 *
 * PROPS
 *   · size?: 'sm' | 'lg' → 'lg' applies .spinner-lg (larger); default small
 *   · label?: string → optional caption; when present renders the full-page variant
 *
 * INPUTS / OUTPUTS
 *   Input:  size, optional label
 *   Output: spinner element, optionally inside a .loading-page wrapper
 *
 * NOTES
 *   · Visual styling lives in index.css (.spinner / .spinner-lg / .loading-page).
 * ──────────────────────────────────────────────────────────────────────────────
 */

interface SpinnerProps {
  size?: 'sm' | 'lg';
  label?: string;
}

export default function Spinner({ size, label }: SpinnerProps) {
  if (label) {
    return (
      <div className="loading-page">
        <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />
        <span>{label}</span>
      </div>
    );
  }
  return <div className={`spinner ${size === 'lg' ? 'spinner-lg' : ''}`} />;
}