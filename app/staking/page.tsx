import { redirect } from 'next/navigation';
// LP pool coordination absorbed into /wallet hub → LP Staking tab.
export default function StakingRedirect() {
  const t = useT(); redirect('/wallet?tab=staking'); }
