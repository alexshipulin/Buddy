export function formatTimeAgo(isoDate: string, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - new Date(isoDate).getTime());
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
