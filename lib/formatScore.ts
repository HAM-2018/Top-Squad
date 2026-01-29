import { formatTime } from "./formatTime";

export function formatScore(value: number, metric: string, unit?: string| null) {
    switch(metric) {
        case "time":
            return formatTime(value);
        case "distance":
            return unit ? `${value}` : `${value}`;
        case "reps":
            return `${value}`;
        case "weight":
            return unit ? `${value}` : `${value}`;
        default:
        return `${value}`;
    }
};

export function metricCapitalize(metric: string) {
     switch (metric) {
    case "time":
      return "Time";
    case "distance":
      return "Distance";
    case "reps":
      return "Reps";
    case "weight":
      return "Weight";
    default:
      return "Score";
  }
};