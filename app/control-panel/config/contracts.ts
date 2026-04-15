// OwnerControlPanel Contract Configuration
import { OwnerControlPanelABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, ZERO_ADDRESS } from '@/lib/contracts';

export const OWNER_CONTROL_PANEL_ADDRESS = CONTRACT_ADDRESSES.OwnerControlPanel ?? ZERO_ADDRESS;
export const OWNER_CONTROL_PANEL_ABI = OwnerControlPanelABI;
