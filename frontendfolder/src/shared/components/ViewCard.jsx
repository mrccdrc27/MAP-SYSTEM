import formCardStyles from './ViewCard.module.css';

export default function ViewCard({ children, className = '', plain = false, ...props }) {
  // plain = true -> render only the shared spacing (formContainer) without the white card background
  if (plain) {
    const classes = `${formCardStyles.formContainer} ${className}`.trim();
    return (
      <div className={classes} {...props}>
        {children}
      </div>
    );
  }

  // Default view: render container with same side margins and an inner white full-width card
  return (
    <div className={formCardStyles.viewContainer} {...props}>
      <div className={`${formCardStyles.viewCard} ${className}`}>
        {children}
      </div>
    </div>
  );
}
