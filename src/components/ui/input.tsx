import { cn } from "../../lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-offset-background",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        props.className
      )}
    />
  );
}