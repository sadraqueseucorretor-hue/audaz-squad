import { STATUS } from '../data/config.js';

export default function StatusBadge({ status, className = '' }) {
  const info = STATUS[status] || { label: status, tom: 'navy' };
  return <span className={`badge badge--${info.tom} ${className}`}>{info.label}</span>;
}
