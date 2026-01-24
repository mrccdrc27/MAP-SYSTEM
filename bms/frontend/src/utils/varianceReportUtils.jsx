import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from "lucide-react";

/**
 * Calculates percentage variance: ((Actual - Budget) / Budget) * 100
 */
export const calculateVariancePercentage = (budget, actual) => {
  if (!budget || budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
};

/**
 * Determines text color based on variance and availability
 */
export const getVarianceColor = (percentage, available) => {
  // If Available is negative, we have overspent -> RED
  if (available < 0) return "#dc2626";

  // If Variance % is positive, it means Actual > Budget -> RED
  if (percentage > 0) return "#dc2626";

  // If we are getting close (e.g., -5% variance, meaning we used 95% of budget) -> YELLOW
  if (percentage > -10 && percentage <= 0) return "#f59e0b";

  // Otherwise, we are well under budget -> GREEN
  return "#10b981";
};

/**
 * Returns a Status Icon component based on financial health
 */
export const getStatusIcon = (percentage, available) => {
  if (available < 0 || percentage > 0)
    return <XCircle size={16} color="#dc2626" />;
  if (percentage > -10) return <AlertCircle size={16} color="#f59e0b" />;
  return <CheckCircle size={16} color="#10b981" />;
};

/**
 * Returns a Trend Arrow Icon component
 */
export const getTrendArrow = (percentage) => {
  // Positive variance means we exceeded budget -> Up Arrow (Red usually in cost context)
  if (percentage > 0) return <TrendingUp size={16} color="#dc2626" />;
  // Negative variance means we saved money -> Down Arrow (Green)
  if (percentage < 0) return <TrendingDown size={16} color="#10b981" />;
  return <Minus size={16} color="#6b7280" />;
};

/**
 * Formats a number as Philippine Peso currency
 */
export const formatCurrency = (value) => {
  return `₱${parseFloat(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};