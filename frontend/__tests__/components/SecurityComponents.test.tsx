/**
 * Security Component Tests
 * Tests for security panel and emergency control components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon" />,
  ShieldAlert: () => <span data-testid="shield-alert" />,
  ShieldCheck: () => <span data-testid="shield-check" />,
  Lock: () => <span data-testid="lock-icon" />,
  Unlock: () => <span data-testid="unlock-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  AlertCircle: () => <span data-testid="alert-circle" />,
  CheckCircle: () => <span data-testid="check-circle" />,
  XCircle: () => <span data-testid="x-circle" />,
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off" />,
  Key: () => <span data-testid="key-icon" />,
  UserCheck: () => <span data-testid="user-check" />,
  Users: () => <span data-testid="users-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Activity: () => <span data-testid="activity-icon" />,
  Power: () => <span data-testid="power-icon" />,
}))

// Test Security Panel pattern
describe('SecurityPanel Pattern', () => {
  interface SecurityStatus {
    vaultLocked: boolean
    guardianCount: number
    nextOfKinSet: boolean
    recoveryActive: boolean
    lastActivity: string
  }

  function SecurityPanel({ status }: { status: SecurityStatus }) {
    return (
      <div data-testid="security-panel">
        <h2 data-testid="panel-title">Security Status</h2>
        <div data-testid="status-items">
          <div data-testid="vault-status">
            <span data-testid="vault-label">Vault Status</span>
            <span data-testid="vault-value">{status.vaultLocked ? 'Locked' : 'Unlocked'}</span>
          </div>
          <div data-testid="guardian-status">
            <span data-testid="guardian-label">Guardians</span>
            <span data-testid="guardian-value">{status.guardianCount} configured</span>
          </div>
          <div data-testid="kin-status">
            <span data-testid="kin-label">Next of Kin</span>
            <span data-testid="kin-value">{status.nextOfKinSet ? 'Set' : 'Not Set'}</span>
          </div>
          <div data-testid="recovery-status">
            <span data-testid="recovery-label">Recovery</span>
            <span data-testid="recovery-value">{status.recoveryActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div data-testid="activity-status">
            <span data-testid="activity-label">Last Activity</span>
            <span data-testid="activity-value">{status.lastActivity}</span>
          </div>
        </div>
      </div>
    )
  }

  it('displays panel title', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 2,
      nextOfKinSet: true,
      recoveryActive: false,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('panel-title')).toHaveTextContent('Security Status')
  })

  it('shows vault as Locked', () => {
    const status = {
      vaultLocked: true,
      guardianCount: 2,
      nextOfKinSet: true,
      recoveryActive: false,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('vault-value')).toHaveTextContent('Locked')
  })

  it('shows vault as Unlocked', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 2,
      nextOfKinSet: true,
      recoveryActive: false,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('vault-value')).toHaveTextContent('Unlocked')
  })

  it('displays guardian count', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 3,
      nextOfKinSet: true,
      recoveryActive: false,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('guardian-value')).toHaveTextContent('3 configured')
  })

  it('shows next of kin status', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 2,
      nextOfKinSet: false,
      recoveryActive: false,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('kin-value')).toHaveTextContent('Not Set')
  })

  it('shows recovery status', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 2,
      nextOfKinSet: true,
      recoveryActive: true,
      lastActivity: '5 minutes ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('recovery-value')).toHaveTextContent('Active')
  })

  it('displays last activity', () => {
    const status = {
      vaultLocked: false,
      guardianCount: 2,
      nextOfKinSet: true,
      recoveryActive: false,
      lastActivity: '2 hours ago',
    }
    render(<SecurityPanel status={status} />)
    expect(screen.getByTestId('activity-value')).toHaveTextContent('2 hours ago')
  })
})

// Test Emergency Panel pattern
describe('EmergencyPanel Pattern', () => {
  function EmergencyPanel({ 
    isEmergencyActive,
    canActivate,
    onActivateEmergency,
    onDeactivateEmergency,
  }: { 
    isEmergencyActive: boolean
    canActivate: boolean
    onActivateEmergency: () => void
    onDeactivateEmergency: () => void
  }) {
    return (
      <div data-testid="emergency-panel">
        <h2 data-testid="emergency-title">Emergency Controls</h2>
        <div data-testid="emergency-status">
          Status: {isEmergencyActive ? 'EMERGENCY ACTIVE' : 'Normal'}
        </div>
        {isEmergencyActive ? (
          <button 
            data-testid="deactivate-button"
            onClick={onDeactivateEmergency}
          >
            Deactivate Emergency
          </button>
        ) : (
          <button 
            data-testid="activate-button"
            onClick={onActivateEmergency}
            disabled={!canActivate}
          >
            Activate Emergency Lock
          </button>
        )}
        {!canActivate && !isEmergencyActive && (
          <p data-testid="not-authorized">You are not authorized to activate emergency controls</p>
        )}
      </div>
    )
  }

  it('shows normal status when emergency not active', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={false}
        canActivate={true}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('emergency-status')).toHaveTextContent('Normal')
  })

  it('shows emergency active status', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={true}
        canActivate={true}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('emergency-status')).toHaveTextContent('EMERGENCY ACTIVE')
  })

  it('shows activate button when emergency not active', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={false}
        canActivate={true}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('activate-button')).toBeInTheDocument()
  })

  it('shows deactivate button when emergency active', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={true}
        canActivate={true}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('deactivate-button')).toBeInTheDocument()
  })

  it('disables activate button when not authorized', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={false}
        canActivate={false}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('activate-button')).toBeDisabled()
  })

  it('shows not authorized message', () => {
    render(
      <EmergencyPanel 
        isEmergencyActive={false}
        canActivate={false}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={() => {}}
      />
    )
    expect(screen.getByTestId('not-authorized')).toBeInTheDocument()
  })

  it('calls onActivateEmergency when activate clicked', () => {
    const onActivateEmergency = vi.fn()
    render(
      <EmergencyPanel 
        isEmergencyActive={false}
        canActivate={true}
        onActivateEmergency={onActivateEmergency}
        onDeactivateEmergency={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('activate-button'))
    expect(onActivateEmergency).toHaveBeenCalled()
  })

  it('calls onDeactivateEmergency when deactivate clicked', () => {
    const onDeactivateEmergency = vi.fn()
    render(
      <EmergencyPanel 
        isEmergencyActive={true}
        canActivate={true}
        onActivateEmergency={() => {}}
        onDeactivateEmergency={onDeactivateEmergency}
      />
    )
    fireEvent.click(screen.getByTestId('deactivate-button'))
    expect(onDeactivateEmergency).toHaveBeenCalled()
  })
})

// Test Guardian Manager pattern
describe('GuardianManager Pattern', () => {
  interface Guardian {
    address: string
    name?: string
    addedAt: string
    isActive: boolean
  }

  function GuardianManager({ 
    guardians,
    onAddGuardian,
    onRemoveGuardian,
    maxGuardians = 5,
  }: { 
    guardians: Guardian[]
    onAddGuardian: () => void
    onRemoveGuardian: (address: string) => void
    maxGuardians?: number
  }) {
    const canAddMore = guardians.length < maxGuardians

    return (
      <div data-testid="guardian-manager">
        <h2 data-testid="manager-title">Guardian Management</h2>
        <div data-testid="guardian-count">
          {guardians.length} / {maxGuardians} Guardians
        </div>
        <div data-testid="guardian-list">
          {guardians.map(guardian => (
            <div key={guardian.address} data-testid={`guardian-${guardian.address}`}>
              <span data-testid="guardian-name">{guardian.name || guardian.address}</span>
              <span data-testid="guardian-status">{guardian.isActive ? 'Active' : 'Inactive'}</span>
              <button 
                data-testid="remove-button"
                onClick={() => onRemoveGuardian(guardian.address)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button 
          data-testid="add-guardian-button"
          onClick={onAddGuardian}
          disabled={!canAddMore}
        >
          Add Guardian
        </button>
      </div>
    )
  }

  const mockGuardians: Guardian[] = [
    { address: '0x1234', name: 'Alice', addedAt: '2024-01-01', isActive: true },
    { address: '0x5678', name: 'Bob', addedAt: '2024-01-02', isActive: true },
  ]

  it('displays guardian count', () => {
    render(
      <GuardianManager 
        guardians={mockGuardians}
        onAddGuardian={() => {}}
        onRemoveGuardian={() => {}}
      />
    )
    expect(screen.getByTestId('guardian-count')).toHaveTextContent('2 / 5 Guardians')
  })

  it('renders guardian list', () => {
    render(
      <GuardianManager 
        guardians={mockGuardians}
        onAddGuardian={() => {}}
        onRemoveGuardian={() => {}}
      />
    )
    expect(screen.getByTestId('guardian-0x1234')).toBeInTheDocument()
    expect(screen.getByTestId('guardian-0x5678')).toBeInTheDocument()
  })

  it('shows add button when under max', () => {
    render(
      <GuardianManager 
        guardians={mockGuardians}
        onAddGuardian={() => {}}
        onRemoveGuardian={() => {}}
      />
    )
    expect(screen.getByTestId('add-guardian-button')).not.toBeDisabled()
  })

  it('disables add button when at max', () => {
    const maxedGuardians = [
      { address: '0x1', name: 'G1', addedAt: '2024-01-01', isActive: true },
      { address: '0x2', name: 'G2', addedAt: '2024-01-01', isActive: true },
      { address: '0x3', name: 'G3', addedAt: '2024-01-01', isActive: true },
    ]
    render(
      <GuardianManager 
        guardians={maxedGuardians}
        onAddGuardian={() => {}}
        onRemoveGuardian={() => {}}
        maxGuardians={3}
      />
    )
    expect(screen.getByTestId('add-guardian-button')).toBeDisabled()
  })

  it('calls onAddGuardian when add clicked', () => {
    const onAddGuardian = vi.fn()
    render(
      <GuardianManager 
        guardians={mockGuardians}
        onAddGuardian={onAddGuardian}
        onRemoveGuardian={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('add-guardian-button'))
    expect(onAddGuardian).toHaveBeenCalled()
  })

  it('calls onRemoveGuardian when remove clicked', () => {
    const onRemoveGuardian = vi.fn()
    render(
      <GuardianManager 
        guardians={mockGuardians}
        onAddGuardian={() => {}}
        onRemoveGuardian={onRemoveGuardian}
      />
    )
    fireEvent.click(screen.getAllByTestId('remove-button')[0])
    expect(onRemoveGuardian).toHaveBeenCalledWith('0x1234')
  })
})

// Test Recovery Status pattern
describe('RecoveryStatus Pattern', () => {
  interface RecoveryInfo {
    isActive: boolean
    initiatedBy?: string
    initiatedAt?: string
    completesAt?: string
    approvals: number
    requiredApprovals: number
  }

  function RecoveryStatus({ recovery }: { recovery: RecoveryInfo }) {
    if (!recovery.isActive) {
      return (
        <div data-testid="recovery-inactive">
          <span data-testid="status">No active recovery</span>
        </div>
      )
    }

    return (
      <div data-testid="recovery-active">
        <h3 data-testid="recovery-title">Recovery In Progress</h3>
        <div data-testid="initiated-by">Initiated by: {recovery.initiatedBy}</div>
        <div data-testid="initiated-at">Started: {recovery.initiatedAt}</div>
        <div data-testid="completes-at">Completes: {recovery.completesAt}</div>
        <div data-testid="approvals">
          Approvals: {recovery.approvals} / {recovery.requiredApprovals}
        </div>
        <div 
          data-testid="progress-bar" 
          style={{ width: `${(recovery.approvals / recovery.requiredApprovals) * 100}%` }}
        />
      </div>
    )
  }

  it('shows inactive state when no recovery', () => {
    const recovery = {
      isActive: false,
      approvals: 0,
      requiredApprovals: 2,
    }
    render(<RecoveryStatus recovery={recovery} />)
    expect(screen.getByTestId('status')).toHaveTextContent('No active recovery')
  })

  it('shows active recovery details', () => {
    const recovery = {
      isActive: true,
      initiatedBy: '0x1234...5678',
      initiatedAt: '2024-01-15 10:00',
      completesAt: '2024-01-17 10:00',
      approvals: 1,
      requiredApprovals: 2,
    }
    render(<RecoveryStatus recovery={recovery} />)
    expect(screen.getByTestId('recovery-title')).toHaveTextContent('Recovery In Progress')
    expect(screen.getByTestId('initiated-by')).toHaveTextContent('0x1234...5678')
    expect(screen.getByTestId('approvals')).toHaveTextContent('1 / 2')
  })
})
