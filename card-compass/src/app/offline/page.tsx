export const metadata = { title: "Offline — Card Compass" };

export default function Offline() {
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-slate-700">
        Card Compass needs a connection to scan cards and fetch prices. We never show cached prices as current. Reconnect
        and try again.
      </p>
    </div>
  );
}
