type Props = {
  children: React.ReactNode;
  variant?: "error" | "success" | "info";
};

const STYLES = {
  error: "border-destructive/40 bg-destructive/10 text-red-300",
  success: "border-success/40 bg-success/10 text-green-300",
  info: "border-border bg-surface-2 text-muted-foreground",
} as const;

export function Alert({ children, variant = "info" }: Props) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${STYLES[variant]}`}
    >
      {children}
    </div>
  );
}
