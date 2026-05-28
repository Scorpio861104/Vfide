import { redirect } from 'next/navigation';
// RevenueSplitter tool absorbed into /developer hub → Rev. Splitter tab.
export default function SplitterRedirect() { redirect('/developer?tab=splitter'); }
