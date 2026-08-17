"use client";

import { useState } from "react";

const LABELS: Record<number, string> = {
  0.5: "Awful", 1: "Terrible", 1.5: "Bad", 2: "Poor", 2.5: "Meh",
  3: "Okay", 3.5: "Decent", 4: "Good", 4.5: "Great", 5: "Excellent",
};

// Half-star precision: each star is two hit targets, left half and right half.
export function StarInput({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  const star = (i: number) => {
    const full = shown >= i;
    const half = !full && shown >= i - 0.5;
    return (
      <span className="relative inline-block text-3xl leading-none select-none" key={i}>
        <span className="text-stone-300">★</span>
        {(full || half) && (
          <span
            className="absolute inset-0 overflow-hidden text-star"
            style={{ width: full ? "100%" : "50%" }}
            aria-hidden="true"
          >
            ★
          </span>
        )}
        <button
          type="button"
          aria-label={`${i - 0.5} stars`}
          onClick={() => setValue(i - 0.5)}
          onMouseEnter={() => setHover(i - 0.5)}
          onMouseLeave={() => setHover(0)}
          className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
        />
        <button
          type="button"
          aria-label={`${i} stars`}
          onClick={() => setValue(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
        />
      </span>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map(star)}
      {shown > 0 && (
        <span className="ml-2 text-sm text-stone-500">
          {shown} · {LABELS[shown]}
        </span>
      )}
    </div>
  );
}
