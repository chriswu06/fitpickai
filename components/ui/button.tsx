import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary: "bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-400",
                outline: "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white",
                ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-white",
            },
            size: {
                default: "px-6 py-2.5",
                lg: "px-8 py-3",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
);

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
    return (
        <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
}

export { Button, buttonVariants };
