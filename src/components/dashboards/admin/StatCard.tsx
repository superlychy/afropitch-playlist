/** Dark stat card per the admin mockup: big value, small label, optional sub line. */
export function StatCard({
    value,
    label,
    sub,
    accent = "text-green-500",
}: {
    value: string;
    label: string;
    sub?: string;
    accent?: string;
}) {
    return (
        <div className="bg-[#141417] border border-white/[0.08] rounded-2xl p-3.5 lg:p-[18px]">
            <b className="text-2xl lg:text-[28px] font-extrabold text-white block leading-tight">{value}</b>
            <span className="text-[11px] lg:text-xs text-[#71717A] block mt-0.5">{label}</span>
            {sub && <div className={`text-[11px] font-bold mt-1 ${accent}`}>{sub}</div>}
        </div>
    );
}
