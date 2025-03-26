
import { cn } from "@/lib/utils";
import React from "react";

interface BlurCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  intensity?: "light" | "medium" | "heavy";
}

const BlurCard = ({ 
  children, 
  className, 
  hoverEffect = true, 
  intensity = "medium", 
  ...props 
}: BlurCardProps) => {
  const intensityClasses = {
    light: "bg-white/40 dark:bg-gray-900/30 backdrop-blur-md",
    medium: "bg-white/60 dark:bg-gray-900/40 backdrop-blur-lg",
    heavy: "bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl"
  };
  
  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 dark:border-white/10 shadow-glass transition-all duration-300",
        intensityClasses[intensity],
        hoverEffect && "hover:shadow-glass-hover hover:scale-[1.01]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default BlurCard;
