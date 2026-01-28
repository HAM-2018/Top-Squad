export type DailyCell =
    | { kind: "best"; value: number }
    | { kind: "sum"; value: number }
    | { kind: "avg"; sum: number; count: number }
    | { kind: "latest"; value: number; recordedAt: Date; id: number };
