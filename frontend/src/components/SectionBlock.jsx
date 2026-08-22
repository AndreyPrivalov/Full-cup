export function SectionBlock({
  title,
  subtitle,
  controls,
  children,
  bodyClassName = "a-flex a-flex-col",
  className = "",
}) {
  return (
    <div className={`a-flex a-flex-col a-gap-16 ${className}`}>
      <div className="a-flex a-flex-col a-gap-4">
        <h2 className="a-text-h2 a-font-medium a-clr-text-primary">{title}</h2>
        {(subtitle || controls) && (
          <div
            className="a-flex a-justify-between a-items-center a-text-s"
            style={{ minHeight: "32px" }}
          >
            <div className="a-flex a-gap-8 a-items-center a-font-medium">{subtitle}</div>
            {controls && <div>{controls}</div>}
          </div>
        )}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
