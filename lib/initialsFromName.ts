export function initialsFromName(name: string) {
    return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0,2)
    .join("")
    .toUpperCase();
};