/**
 * Centralized Formatter Utilities for Baroda Swim Front (SAMS)
 */

/**
 * Formats a numeric value into Indian Rupees (INR) with Indian numbering format (e.g., ₹1,25,000).
 * Uses en-IN locale and INR currency.
 */
export const formatCurrency = (amount: number | string): string => {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(numericAmount);
};

/**
 * Formats an ISO or string date to Indian format (DD/MM/YYYY).
 */
export const formatDateToIndian = (dateStr?: string | null): string => {
  if (!dateStr) return "N/A";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  // Match standard ISO dates YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {}
  return dateStr;
};

/**
 * Formats time to 24-hour format.
 */
export const formatTimeTo24Hour = (timeStr?: string | null): string => {
  if (!timeStr) return "N/A";
  try {
    // If it's already HH:MM format
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    const d = new Date(`1970-01-01T${timeStr}`);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  } catch (e) {}
  return timeStr;
};
