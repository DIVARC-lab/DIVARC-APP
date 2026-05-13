type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
};

export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: Props) {
  const borderClass =
    tone === "danger" ? "border-red-200" : "border-line";
  const headerClass =
    tone === "danger" ? "text-red-700" : "text-night";
  return (
    <section
      className={`rounded-2xl bg-white border ${borderClass} overflow-hidden`}
    >
      <header className="px-4 sm:px-5 py-3 border-b border-line">
        <h2 className={`text-[15px] font-extrabold ${headerClass}`}>
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[11.5px] text-night-dim leading-snug">
            {description}
          </p>
        ) : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
