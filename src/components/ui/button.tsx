import * as React from "react";
import { cn } from "@/lib/utils";
// Note: radix-ui slot is handy for asChild but if not installed I'll simulate or skip. 
// Standard Next.js usually doesn't have it preinstalled. I'll just use standard props for now to avoid dependency hell if I didn't install it.
// Actually I'll use a simpler version without radix for now to keep it lightweight as requested.

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "white";
    size?: "default" | "sm" | "lg" | "icon" | "xs";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-green-600 text-white shadow hover:bg-green-700": variant === "default",
                        "bg-red-600 text-white shadow hover:bg-red-700": variant === "destructive",
                        "bg-white text-black shadow hover:bg-gray-200": variant === "white",
                        "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground": variant === "outline",
                        "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
                        "text-primary underline-offset-4 hover:underline": variant === "link",
                        "h-9 px-4 py-2": size === "default",
                        "h-8 rounded-md px-3 text-xs": size === "sm",
                        "h-10 rounded-md px-8": size === "lg",
                        "h-9 w-9": size === "icon",
                        "h-6 px-2 text-[10px]": size === "xs",
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
