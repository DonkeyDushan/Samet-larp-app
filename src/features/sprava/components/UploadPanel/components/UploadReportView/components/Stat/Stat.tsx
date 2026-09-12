interface StatProps {
  label: string
  value: string | number
}

export const Stat = ({ label, value }: StatProps) => (
  <div>
    <dt className="text-xs text-neutral-500">{label}</dt>
    <dd className="font-medium">{value}</dd>
  </div>
)
