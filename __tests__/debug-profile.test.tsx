
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '@/components/profile/UserProfile';

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }) => <div className={className} style={style} onClick={onClick} {...props}>{children}</div>,
    button: ({ children, className, style, onClick, disabled, ...props }) => <button className={className} style={style} onClick={onClick} disabled={disabled} {...props}>{children}</button>,
    span: ({ children, className, style, ...props }) => <span className={className} style={style} {...props}>{children}</span>,
    p: ({ children, className, style, ...props }) => <p className={className} style={style} {...props}>{children}</p>,
    img: ({ src, alt, className, ...props }) => <img src={src} alt={alt} className={className} {...props} />,
    a: ({ children, className, style, href, target, rel, ...props }) => <a className={className} style={style} href={href} target={target} rel={rel} {...props}>{children}</a>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: jest.fn(), on: () => () => {} }),
  useTransform: () => ({ get: () => 0, on: () => () => {} }),
  animate: jest.fn(() => ({ stop: jest.fn() })),
}));

jest.mock('@/hooks/useTransactionSounds', () => ({
  useTransactionSounds: () => ({ playSuccess: jest.fn(), playNotification: jest.fn(), play: jest.fn() }),
}));

jest.mock('lucide-react', () => ({
  Share2: () => <span />,
  Copy: () => <span />,
  Check: () => <span />,
  QrCode: () => <span />,
  ChevronLeft: () => <span />,
  ChevronRight: () => <span />,
  Edit2: () => <span />,
  X: () => <span />,
  ExternalLink: () => <span />,
  Twitter: () => <span />,
  Github: () => <span />,
  Globe: () => <span />,
  MapPin: () => <span />,
  Calendar: () => <span />,
  TrendingUp: () => <span />,
  Award: () => <span />,
  Zap: () => <span />,
  Users: () => <span />,
  MessageSquare: () => <span />,
}));

test('debug: check for duplicate johndoe', async () => {
  const { container } = render(<UserProfile />);
  
  // Click edit mode
  const editBtn = await screen.findByRole('button', { name: /Edit Profile/i });
  fireEvent.click(editBtn);
  
  // Find all inputs with johndoe
  const allInputs = container.querySelectorAll('input');
  console.log('Total inputs:', allInputs.length);
  allInputs.forEach((input, i) => {
    console.log('Input ' + i + ':', input.value, input.type, input.className?.slice(0, 50));
  });
  
  const johnDoeInputs = Array.from(allInputs).filter(i => i.value === 'johndoe');
  console.log('Inputs with johndoe value:', johnDoeInputs.length);
});
