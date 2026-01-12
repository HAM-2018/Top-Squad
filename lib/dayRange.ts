export function dayRange(minDay: string, maxDay: string) {
  const days: string[] = [];
  const start = new Date(`${minDay}T00:00:00Z`);
  const end = new Date(`${maxDay}T00:00:00Z`);

  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}