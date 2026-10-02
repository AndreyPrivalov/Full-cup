export const DeleteButton = ({ onClick, title = "Удалить", size = "m", className = "" }) => {
  return (
    <button
      type="button"
      className={`m-button ${className}`}
      data-variant="icon-danger"
      data-size={size}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      title={title}
    >
      <i className="ri-delete-bin-line"></i>
    </button>
  );
};
