/**
 * DAO Component Tests
 * Tests for DAO governance components like proposals, voting, etc.
 */

import { describe, it, expect, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Vote: () => <span data-testid="vote-icon" />,
  ThumbsUp: () => <span data-testid="thumbs-up" />,
  ThumbsDown: () => <span data-testid="thumbs-down" />,
  Clock: () => <span data-testid="clock-icon" />,
  CheckCircle: () => <span data-testid="check-circle" />,
  XCircle: () => <span data-testid="x-circle" />,
  AlertCircle: () => <span data-testid="alert-circle" />,
  Users: () => <span data-testid="users-icon" />,
  FileText: () => <span data-testid="file-text" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  Timer: () => <span data-testid="timer-icon" />,
  Gavel: () => <span data-testid="gavel-icon" />,
  Scale: () => <span data-testid="scale-icon" />,
}))

// Test Proposal Card pattern
describe('ProposalCard Pattern', () => {
  interface Proposal {
    id: number
    title: string
    description: string
    status: 'active' | 'passed' | 'rejected' | 'pending'
    forVotes: bigint
    againstVotes: bigint
    endTime: number
    proposer: string
  }

  function ProposalCard({ proposal, onClick }: { proposal: Proposal; onClick: () => void }) {
    const totalVotes = proposal.forVotes + proposal.againstVotes
    const forPercentage = totalVotes > 0n 
      ? Number((proposal.forVotes * 100n) / totalVotes) 
      : 0

    const statusColors = {
      active: 'blue',
      passed: 'green',
      rejected: 'red',
      pending: 'yellow',
    }

    return (
      <div data-testid="proposal-card" onClick={onClick}>
        <div data-testid="proposal-header">
          <span data-testid="proposal-id">#{proposal.id}</span>
          <span 
            data-testid="proposal-status"
            style={{ color: statusColors[proposal.status] }}
          >
            {proposal.status.toUpperCase()}
          </span>
        </div>
        <h3 data-testid="proposal-title">{proposal.title}</h3>
        <p data-testid="proposal-description">{proposal.description}</p>
        <div data-testid="vote-results">
          <div data-testid="for-votes">For: {proposal.forVotes.toString()}</div>
          <div data-testid="against-votes">Against: {proposal.againstVotes.toString()}</div>
          <div 
            data-testid="vote-bar"
            style={{ width: `${forPercentage}%` }}
          />
        </div>
        <div data-testid="proposal-footer">
          <span data-testid="proposer">By: {proposal.proposer}</span>
          <span data-testid="end-time">Ends: {new Date(proposal.endTime * 1000).toLocaleDateString()}</span>
        </div>
      </div>
    )
  }

  const mockProposal: Proposal = {
    id: 1,
    title: 'Increase Merchant Service Budget',
    description: 'Proposal to increase verified merchant service funding by 10%',
    status: 'active',
    forVotes: 1000n,
    againstVotes: 500n,
    endTime: Math.floor(Date.now() / 1000) + 86400,
    proposer: '0x1234...5678',
  }

  it('displays proposal ID', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('proposal-id')).toHaveTextContent('#1')
  })

  it('displays proposal title', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('proposal-title')).toHaveTextContent('Increase Merchant Service Budget')
  })

  it('displays proposal status', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('proposal-status')).toHaveTextContent('ACTIVE')
  })

  it('displays for votes', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('for-votes')).toHaveTextContent('For: 1000')
  })

  it('displays against votes', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('against-votes')).toHaveTextContent('Against: 500')
  })

  it('displays proposer', () => {
    render(<ProposalCard proposal={mockProposal} onClick={() => {}} />)
    expect(screen.getByTestId('proposer')).toHaveTextContent('By: 0x1234...5678')
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<ProposalCard proposal={mockProposal} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('proposal-card'))
    expect(onClick).toHaveBeenCalled()
  })

  it('shows passed status correctly', () => {
    const passedProposal = { ...mockProposal, status: 'passed' as const }
    render(<ProposalCard proposal={passedProposal} onClick={() => {}} />)
    expect(screen.getByTestId('proposal-status')).toHaveTextContent('PASSED')
  })
})

// Test Voting Interface pattern
describe('VotingInterface Pattern', () => {
  function VotingInterface({
    proposalId,
    hasVoted,
    userVote,
    votingPower,
    onVote,
    isVoting,
  }: {
    proposalId: number
    hasVoted: boolean
    userVote?: 'for' | 'against'
    votingPower: bigint
    onVote: (vote: 'for' | 'against') => void
    isVoting: boolean
  }) {
    if (votingPower === 0n) {
      return (
        <div data-testid="no-voting-power">
          You need VFIDE tokens to vote on proposals
        </div>
      )
    }

    if (hasVoted) {
      return (
        <div data-testid="already-voted">
          <span data-testid="vote-cast">You voted: {userVote?.toUpperCase()}</span>
          <span data-testid="your-power">Voting power used: {votingPower.toString()}</span>
        </div>
      )
    }

    return (
      <div data-testid="voting-interface">
        <div data-testid="voting-power">Your voting power: {votingPower.toString()}</div>
        <div data-testid="vote-buttons">
          <button 
            data-testid="vote-for-button"
            onClick={() => onVote('for')}
            disabled={isVoting}
          >
            {isVoting ? 'Voting...' : 'Vote For'}
          </button>
          <button 
            data-testid="vote-against-button"
            onClick={() => onVote('against')}
            disabled={isVoting}
          >
            {isVoting ? 'Voting...' : 'Vote Against'}
          </button>
        </div>
      </div>
    )
  }

  it('shows no voting power message', () => {
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={0n}
        onVote={() => {}}
        isVoting={false}
      />
    )
    expect(screen.getByTestId('no-voting-power')).toBeInTheDocument()
  })

  it('shows voting interface when has power', () => {
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={1000n}
        onVote={() => {}}
        isVoting={false}
      />
    )
    expect(screen.getByTestId('voting-interface')).toBeInTheDocument()
    expect(screen.getByTestId('voting-power')).toHaveTextContent('1000')
  })

  it('shows vote buttons', () => {
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={1000n}
        onVote={() => {}}
        isVoting={false}
      />
    )
    expect(screen.getByTestId('vote-for-button')).toBeInTheDocument()
    expect(screen.getByTestId('vote-against-button')).toBeInTheDocument()
  })

  it('calls onVote with for', () => {
    const onVote = jest.fn()
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={1000n}
        onVote={onVote}
        isVoting={false}
      />
    )
    fireEvent.click(screen.getByTestId('vote-for-button'))
    expect(onVote).toHaveBeenCalledWith('for')
  })

  it('calls onVote with against', () => {
    const onVote = jest.fn()
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={1000n}
        onVote={onVote}
        isVoting={false}
      />
    )
    fireEvent.click(screen.getByTestId('vote-against-button'))
    expect(onVote).toHaveBeenCalledWith('against')
  })

  it('disables buttons when voting', () => {
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={false}
        votingPower={1000n}
        onVote={() => {}}
        isVoting={true}
      />
    )
    expect(screen.getByTestId('vote-for-button')).toBeDisabled()
    expect(screen.getByTestId('vote-against-button')).toBeDisabled()
  })

  it('shows already voted state', () => {
    render(
      <VotingInterface
        proposalId={1}
        hasVoted={true}
        userVote="for"
        votingPower={1000n}
        onVote={() => {}}
        isVoting={false}
      />
    )
    expect(screen.getByTestId('already-voted')).toBeInTheDocument()
    expect(screen.getByTestId('vote-cast')).toHaveTextContent('FOR')
  })
})

// Test Proposal List pattern
describe('ProposalList Pattern', () => {
  interface ProposalSummary {
    id: number
    title: string
    status: string
  }

  function ProposalList({
    proposals,
    isLoading,
    onSelectProposal,
    filter,
    onFilterChange,
  }: {
    proposals: ProposalSummary[]
    isLoading: boolean
    onSelectProposal: (id: number) => void
    filter: string
    onFilterChange: (filter: string) => void
  }) {
    if (isLoading) {
      return <div data-testid="loading">Loading proposals...</div>
    }

    if (proposals.length === 0) {
      return <div data-testid="empty">No proposals found</div>
    }

    return (
      <div data-testid="proposal-list">
        <div data-testid="filter-controls">
          <button 
            data-testid="filter-all"
            onClick={() => onFilterChange('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            All
          </button>
          <button 
            data-testid="filter-active"
            onClick={() => onFilterChange('active')}
            className={filter === 'active' ? 'active' : ''}
          >
            Active
          </button>
          <button 
            data-testid="filter-passed"
            onClick={() => onFilterChange('passed')}
            className={filter === 'passed' ? 'active' : ''}
          >
            Passed
          </button>
        </div>
        <div data-testid="proposals">
          {proposals.map(proposal => (
            <div 
              key={proposal.id}
              data-testid={`proposal-item-${proposal.id}`}
              onClick={() => onSelectProposal(proposal.id)}
            >
              <span data-testid={`proposal-title-${proposal.id}`}>{proposal.title}</span>
              <span data-testid={`proposal-status-${proposal.id}`}>{proposal.status}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const mockProposals = [
    { id: 1, title: 'Proposal 1', status: 'active' },
    { id: 2, title: 'Proposal 2', status: 'passed' },
  ]

  it('shows loading state', () => {
    render(
      <ProposalList
        proposals={[]}
        isLoading={true}
        onSelectProposal={() => {}}
        filter="all"
        onFilterChange={() => {}}
      />
    )
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(
      <ProposalList
        proposals={[]}
        isLoading={false}
        onSelectProposal={() => {}}
        filter="all"
        onFilterChange={() => {}}
      />
    )
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('renders proposals', () => {
    render(
      <ProposalList
        proposals={mockProposals}
        isLoading={false}
        onSelectProposal={() => {}}
        filter="all"
        onFilterChange={() => {}}
      />
    )
    expect(screen.getByTestId('proposal-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('proposal-item-2')).toBeInTheDocument()
  })

  it('calls onSelectProposal when clicked', () => {
    const onSelectProposal = jest.fn()
    render(
      <ProposalList
        proposals={mockProposals}
        isLoading={false}
        onSelectProposal={onSelectProposal}
        filter="all"
        onFilterChange={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('proposal-item-1'))
    expect(onSelectProposal).toHaveBeenCalledWith(1)
  })

  it('renders filter controls', () => {
    render(
      <ProposalList
        proposals={mockProposals}
        isLoading={false}
        onSelectProposal={() => {}}
        filter="all"
        onFilterChange={() => {}}
      />
    )
    expect(screen.getByTestId('filter-all')).toBeInTheDocument()
    expect(screen.getByTestId('filter-active')).toBeInTheDocument()
    expect(screen.getByTestId('filter-passed')).toBeInTheDocument()
  })

  it('calls onFilterChange when filter clicked', () => {
    const onFilterChange = jest.fn()
    render(
      <ProposalList
        proposals={mockProposals}
        isLoading={false}
        onSelectProposal={() => {}}
        filter="all"
        onFilterChange={onFilterChange}
      />
    )
    fireEvent.click(screen.getByTestId('filter-active'))
    expect(onFilterChange).toHaveBeenCalledWith('active')
  })
})

// Test Governance Stats pattern
describe('GovernanceStats Pattern', () => {
  interface GovernanceData {
    totalProposals: number
    activeProposals: number
    totalVoters: number
    totalVotes: bigint
    quorumPercentage: number
  }

  function GovernanceStats({ data }: { data: GovernanceData }) {
    return (
      <div data-testid="governance-stats">
        <div data-testid="stat-total-proposals">
          <span data-testid="label">Total Proposals</span>
          <span data-testid="value">{data.totalProposals}</span>
        </div>
        <div data-testid="stat-active-proposals">
          <span data-testid="label">Active Proposals</span>
          <span data-testid="value">{data.activeProposals}</span>
        </div>
        <div data-testid="stat-total-voters">
          <span data-testid="label">Total Voters</span>
          <span data-testid="value">{data.totalVoters}</span>
        </div>
        <div data-testid="stat-total-votes">
          <span data-testid="label">Total Votes Cast</span>
          <span data-testid="value">{data.totalVotes.toString()}</span>
        </div>
        <div data-testid="stat-quorum">
          <span data-testid="label">Quorum</span>
          <span data-testid="value">{data.quorumPercentage}%</span>
        </div>
      </div>
    )
  }

  const mockData: GovernanceData = {
    totalProposals: 25,
    activeProposals: 3,
    totalVoters: 1500,
    totalVotes: 500000n,
    quorumPercentage: 10,
  }

  it('displays total proposals', () => {
    render(<GovernanceStats data={mockData} />)
    expect(screen.getByTestId('stat-total-proposals')).toHaveTextContent('25')
  })

  it('displays active proposals', () => {
    render(<GovernanceStats data={mockData} />)
    expect(screen.getByTestId('stat-active-proposals')).toHaveTextContent('3')
  })

  it('displays total voters', () => {
    render(<GovernanceStats data={mockData} />)
    expect(screen.getByTestId('stat-total-voters')).toHaveTextContent('1500')
  })

  it('displays total votes', () => {
    render(<GovernanceStats data={mockData} />)
    expect(screen.getByTestId('stat-total-votes')).toHaveTextContent('500000')
  })

  it('displays quorum percentage', () => {
    render(<GovernanceStats data={mockData} />)
    expect(screen.getByTestId('stat-quorum')).toHaveTextContent('10%')
  })
})

// Test Delegation Panel pattern
describe('DelegationPanel Pattern', () => {
  function DelegationPanel({
    currentDelegate,
    delegatedPower,
    onDelegate,
    onUndelegate,
    isProcessing,
  }: {
    currentDelegate: string | null
    delegatedPower: bigint
    onDelegate: (address: string) => void
    onUndelegate: () => void
    isProcessing: boolean
  }) {
    const [inputAddress, setInputAddress] = React.useState('')

    if (currentDelegate) {
      return (
        <div data-testid="delegation-active">
          <div data-testid="delegate-info">
            <span>Delegated to: </span>
            <span data-testid="delegate-address">{currentDelegate}</span>
          </div>
          <div data-testid="delegated-power">
            Power delegated: {delegatedPower.toString()}
          </div>
          <button 
            data-testid="undelegate-button"
            onClick={onUndelegate}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Undelegate'}
          </button>
        </div>
      )
    }

    return (
      <div data-testid="delegation-form">
        <input
          data-testid="delegate-input"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          placeholder="Enter delegate address"
        />
        <button
          data-testid="delegate-button"
          onClick={() => onDelegate(inputAddress)}
          disabled={isProcessing || !inputAddress}
        >
          {isProcessing ? 'Processing...' : 'Delegate'}
        </button>
      </div>
    )
  }

  // Need to import React for useState
  const React = { useState: jest.fn().mockReturnValue(['', jest.fn()]) }

  it('shows delegation form when not delegated', () => {
    render(
      <DelegationPanel
        currentDelegate={null}
        delegatedPower={0n}
        onDelegate={() => {}}
        onUndelegate={() => {}}
        isProcessing={false}
      />
    )
    expect(screen.getByTestId('delegation-form')).toBeInTheDocument()
  })

  it('shows active delegation when delegated', () => {
    render(
      <DelegationPanel
        currentDelegate="0x1234...5678"
        delegatedPower={1000n}
        onDelegate={() => {}}
        onUndelegate={() => {}}
        isProcessing={false}
      />
    )
    expect(screen.getByTestId('delegation-active')).toBeInTheDocument()
    expect(screen.getByTestId('delegate-address')).toHaveTextContent('0x1234...5678')
  })

  it('shows delegated power', () => {
    render(
      <DelegationPanel
        currentDelegate="0x1234...5678"
        delegatedPower={5000n}
        onDelegate={() => {}}
        onUndelegate={() => {}}
        isProcessing={false}
      />
    )
    expect(screen.getByTestId('delegated-power')).toHaveTextContent('5000')
  })

  it('calls onUndelegate when clicked', () => {
    const onUndelegate = jest.fn()
    render(
      <DelegationPanel
        currentDelegate="0x1234...5678"
        delegatedPower={1000n}
        onDelegate={() => {}}
        onUndelegate={onUndelegate}
        isProcessing={false}
      />
    )
    fireEvent.click(screen.getByTestId('undelegate-button'))
    expect(onUndelegate).toHaveBeenCalled()
  })

  it('disables undelegate when processing', () => {
    render(
      <DelegationPanel
        currentDelegate="0x1234...5678"
        delegatedPower={1000n}
        onDelegate={() => {}}
        onUndelegate={() => {}}
        isProcessing={true}
      />
    )
    expect(screen.getByTestId('undelegate-button')).toBeDisabled()
  })
})
