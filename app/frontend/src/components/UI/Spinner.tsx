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