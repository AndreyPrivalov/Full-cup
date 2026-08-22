export const Slider = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  size = "m", // s, m, l
  context = "normal", // normal, inverse
  className = "",
  ...props
}) => {
  return (
    <input
      type="range"
      className={`m-slider ${className}`}
      data-size={size}
      data-context={context}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};
