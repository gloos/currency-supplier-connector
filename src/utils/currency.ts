
export type CurrencyCode = keyof typeof currencies;

interface Currency {
  name: string;
  symbol: string;
  decimal_digits: number;
  format: string; // e.g., "%s%v" where %s is symbol, %v is amount
}

export const currencies: Record<string, Currency> = {
  USD: {
    name: "US Dollar",
    symbol: "$",
    decimal_digits: 2,
    format: "%s%v"
  },
  EUR: {
    name: "Euro",
    symbol: "€",
    decimal_digits: 2,
    format: "%s%v"
  },
  GBP: {
    name: "British Pound",
    symbol: "£",
    decimal_digits: 2,
    format: "%s%v"
  },
  JPY: {
    name: "Japanese Yen",
    symbol: "¥",
    decimal_digits: 0,
    format: "%s%v"
  },
  CAD: {
    name: "Canadian Dollar",
    symbol: "C$",
    decimal_digits: 2,
    format: "%s%v"
  },
  AUD: {
    name: "Australian Dollar",
    symbol: "A$",
    decimal_digits: 2,
    format: "%s%v"
  },
  CHF: {
    name: "Swiss Franc",
    symbol: "CHF",
    decimal_digits: 2,
    format: "%s %v"
  },
  CNY: {
    name: "Chinese Yuan",
    symbol: "¥",
    decimal_digits: 2,
    format: "%s%v"
  },
  SEK: {
    name: "Swedish Krona",
    symbol: "kr",
    decimal_digits: 2,
    format: "%v %s"
  },
  NZD: {
    name: "New Zealand Dollar",
    symbol: "NZ$",
    decimal_digits: 2,
    format: "%s%v"
  }
};

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const currency = currencies[currencyCode];
  
  if (!currency) {
    throw new Error(`Unknown currency code: ${currencyCode}`);
  }
  
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimal_digits,
    maximumFractionDigits: currency.decimal_digits
  });
  
  return formatter.format(amount);
}

export function getExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number> {
  // In a real app, this would call an external API to get exchange rates
  // For this demo, we'll simulate with static data
  return Promise.resolve(1.15); // Mock exchange rate
}
