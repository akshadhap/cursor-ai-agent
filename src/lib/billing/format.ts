const compactFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const standardFormatter = new Intl.NumberFormat("en-US");

export const formatTokens = (value: number) => {
  return `${compactFormatter.format(value)} tokens`;
};

export const formatNumber = (value: number) => {
  return standardFormatter.format(value);
};
