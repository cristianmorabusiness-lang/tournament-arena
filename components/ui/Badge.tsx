type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted-foreground",
  success: "bg-success/15 text-green-300",
  warning: "bg-secondary/15 text-secondary",
  danger: "bg-destructive/15 text-red-300",
  primary: "bg-primary/15 text-primary",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
