
"use client";

export default function ChallengeLegend() {
  return (
    <div className="flex justify-center w-full">
    <div className="flex gap-4 text-xs p-2">
      <div className="flex items-center gap-1">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: "#22c55e" }}
        />
        <span>You</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="inline-block h-3 w-3 rounded-sm"
          style={{ backgroundColor: "#f43f5e" }}
        />
        <span>Other Competitors</span>
      </div>
    </div>
    </div>
  );
}
