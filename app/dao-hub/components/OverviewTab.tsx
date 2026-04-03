'use client';

const OVERVIEW_SECTIONS = [
  {
    title: 'Active Disputes',
    description: 'Track open member issues, mediation queues, and required reviewer assignments.',
  },
  {
    title: 'Proposal Pipeline',
    description: 'Review upcoming submissions, quorum timing, and scheduled governance windows.',
  },
  {
    title: 'DAO Messages',
    description: 'Check operational broadcasts, notices from guardians, and coordination updates.',
  },
  {
    title: 'DAO Payment Queue',
    description: 'Monitor payroll approvals, reimbursements, and queued treasury releases.',
  },
];

export function OverviewTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {OVERVIEW_SECTIONS.map((section) => (
        <div key={section.title} className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-3">{section.title}</h3>
          <p className="text-gray-400">{section.description}</p>
        </div>
      ))}
    </div>
  );
}
