import rawCountries from "./countries.json";

function flagFromCode(code: string) {
  if (!code || code.length !== 2) return "";
  const base = 127397;
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => base + char.charCodeAt(0)));
}

export const COUNTRIES = (rawCountries as { name: string; code: string }[])
  .map((country) => ({
    code: country.code,
    name: country.name,
    flag: flagFromCode(country.code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
