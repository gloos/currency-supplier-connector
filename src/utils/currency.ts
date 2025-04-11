/**
 * Formats a number as a currency string using Intl.NumberFormat.
 * 
 * @param amount The numeric amount to format.
 * @param currencyCode A valid ISO 4217 currency code (e.g., "USD", "GBP", "EUR").
 * @returns The formatted currency string, or the original amount as string if formatting fails.
 */
export function formatCurrency(amount: number | undefined | null, currencyCode: string | undefined | null): string {
  // Handle null or undefined inputs gracefully
  if (amount == null || currencyCode == null || currencyCode.trim() === "") {
    // Return a default representation or an empty string
    return amount?.toString() ?? "0.00"; // Or return "" or a placeholder like "---"
  }

  try {
    // Intl.NumberFormat handles finding the correct symbol, decimal places etc.
    const formatter = new Intl.NumberFormat(undefined, { // Use locale default
      style: 'currency',
      currency: currencyCode, // Pass the code directly
      // Let Intl decide minimum/maximum fraction digits based on the currency
      // minimumFractionDigits: 2, // Optional: Force 2 digits if needed
      // maximumFractionDigits: 2, // Optional: Force 2 digits if needed
    });
    return formatter.format(amount);
  } catch (error) {
    console.error(`Error formatting currency ${currencyCode}:`, error);
    // Fallback if Intl.NumberFormat fails (e.g., invalid code, though it usually handles this)
    return `${currencyCode} ${amount.toFixed(2)}`; // Basic fallback
  }
}
