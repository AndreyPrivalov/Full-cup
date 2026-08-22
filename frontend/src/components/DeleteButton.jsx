export const DeleteButton = ({ onClick, title = "Удалить", size = "m" }) => {
  const fontSize = size === "s" ? "var(--font-size-m)" : "var(--font-size-l)";

  return (
    <button
      type="button"
      className="a-flex a-items-center a-justify-center"
      style={{
        background: "none",
        border: "none",
        padding: "0 var(--spc-8)",
        cursor: "pointer",
        color: "var(--clr-text-secondary)",
        transition: "color 0.2s",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(e);
      }}
      title={title}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--clr-semantic-error)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--clr-text-secondary)")}
    >
      <i className="ri-delete-bin-line" style={{ fontSize }}></i>
    </button>
  );
};
