import Image from "next/image";

export function CardThumb({
  name,
  setName,
  number,
  imageUrl,
  size = "md",
}: {
  name: string;
  setName: string;
  number: string;
  imageUrl: string | null;
  size?: "sm" | "md";
}) {
  const [w, h] = size === "sm" ? [72, 100] : [120, 167];
  const alt = `${name}, ${setName} #${number}`;
  if (imageUrl) {
    return <Image src={imageUrl} alt={alt} width={w} height={h} className="shrink-0 rounded-md shadow-sm" />;
  }
  return (
    <div
      role="img"
      aria-label={`${alt} (no image available)`}
      style={{ width: w, height: h }}
      className="flex shrink-0 flex-col justify-between rounded-md border border-amber-300 bg-gradient-to-b from-amber-100 to-amber-50 p-1.5 text-[10px] leading-tight text-amber-900 shadow-sm"
    >
      <span className="font-semibold break-words">{name}</span>
      <span aria-hidden="true" className="self-center text-lg opacity-60">
        ◇
      </span>
      <span className="truncate">#{number}</span>
    </div>
  );
}
