import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mb-6">
        <Icon className="w-9 h-9 text-white" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm max-w-sm mb-6" style={{ color: "var(--muted)" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
