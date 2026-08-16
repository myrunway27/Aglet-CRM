"use client";

import { useState } from "react";

export function StarInput({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onClick={() => setValue(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className={`text-3xl leading-none cursor-pointer transition-transform hover:scale-110 ${
            i <= shown ? "text-star" : "text-stone-300"
          }`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-stone-500">
          {["", "Terrible", "Poor", "Okay", "Good", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}
