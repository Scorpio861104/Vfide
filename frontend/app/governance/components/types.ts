export interface Proposal {
  id: number;
  type: string;
  title: string;
  author: string;
  timeLeft: string;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  voted: boolean;
  description?: string;
}
