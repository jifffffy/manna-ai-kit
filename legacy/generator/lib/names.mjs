export function toKebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function toPascal(value) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function toCamel(value) {
  const pascal = toPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function packagePath(pkg) {
  return pkg.split(".").join("/");
}

export function unique(values) {
  return [...new Set(values)];
}

export function plural(value) {
  if (value.endsWith("s")) return value;
  if (value.endsWith("y")) return value.slice(0, -1) + "ies";
  return value + "s";
}

export function toCamelFromUpperSnake(value) {
  return value
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
}
