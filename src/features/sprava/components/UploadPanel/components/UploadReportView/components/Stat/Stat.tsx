import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: string | number
}

export const Stat = ({ label, value }: StatProps) => (
  <div>
    <dt className={styles.label}>{label}</dt>
    <dd className={styles.value}>{value}</dd>
  </div>
)
