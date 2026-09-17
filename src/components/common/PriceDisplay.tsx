import { localeForCurrency } from "@/utils/formatters";

interface PriceDisplayProps {
  amount: number;
  symbol: string;
  currencyCode?: string;
  decimals?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-3xl",
};

export function PriceDisplay({
  amount,
  symbol,
  currencyCode,
  decimals = 0,
  size = "md",
  className = "",
}: PriceDisplayProps) {
  const formatted = amount.toLocaleString(localeForCurrency(currencyCode), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={`font-bold ${sizeClasses[size]} ${className}`}>
      {symbol}{formatted}
    </span>
  );
}
