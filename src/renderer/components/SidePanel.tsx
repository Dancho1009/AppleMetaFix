import React, { useEffect } from "react";

interface SidePanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  width?: "normal" | "wide";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function SidePanel({
  open,
  title,
  subtitle,
  onClose,
  width = "normal",
  children,
  footer,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="side-panel-overlay" onMouseDown={onClose}>
      <aside
        className={"side-panel side-panel-" + width}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="side-panel-header">
          <div className="side-panel-heading">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="side-panel-content">{children}</div>

        {footer && <footer className="side-panel-footer">{footer}</footer>}
      </aside>
    </div>
  );
}
