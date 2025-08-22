import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WelcomePage } from '../WelcomePage';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('WelcomePage', () => {
  const mockOnSelectExample = vi.fn();
  const mockOnToggleSidebar = vi.fn();

  const defaultProps = {
    onSelectExample: mockOnSelectExample,
    onToggleSidebar: mockOnToggleSidebar,
    isMobile: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all main sections', () => {
      render(<WelcomePage {...defaultProps} />);

      expect(screen.getByTestId('welcome-hero')).toBeInTheDocument();
      expect(screen.getByTestId('learning-paths')).toBeInTheDocument();
      expect(screen.getByTestId('feature-showcase')).toBeInTheDocument();
      expect(screen.getByTestId('quick-start')).toBeInTheDocument();
      expect(screen.getByTestId('cta-footer')).toBeInTheDocument();
    });

    it('displays the correct heading', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Welcome to Ergo Playgrounds'
      );
    });

    it('shows platform statistics', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('15+')).toBeInTheDocument();
      expect(screen.getByText('Smart Contract Examples')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Learning Modes')).toBeInTheDocument();
      expect(screen.getByText('1000+')).toBeInTheDocument();
      expect(screen.getByText('Active Learners')).toBeInTheDocument();
    });
  });

  describe('Learning Paths', () => {
    it('renders all three learning paths', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('Beginner Path')).toBeInTheDocument();
      expect(screen.getByText('Intermediate Path')).toBeInTheDocument();
      expect(screen.getByText('Advanced Path')).toBeInTheDocument();
    });

    it('shows time estimates for each path', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('2-3 hours')).toBeInTheDocument();
      expect(screen.getByText('4-6 hours')).toBeInTheDocument();
      expect(screen.getByText('6+ hours')).toBeInTheDocument();
    });

    it('calls onSelectExample when learning path is clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const beginnerPath = screen.getByText('Start Beginner Path').closest('button');
      expect(beginnerPath).toBeInTheDocument();
      
      await user.click(beginnerPath!);
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });
  });

  describe('Feature Showcase', () => {
    it('renders all three feature cards', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('Interactive Contract Tester')).toBeInTheDocument();
      expect(screen.getByText('Visual Contract Designer')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive Learning Center')).toBeInTheDocument();
    });

    it('navigates to contract designer when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const designerButton = screen.getByText('Open Designer').closest('button');
      await user.click(designerButton!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner');
    });

    it('navigates to education when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const educationButton = screen.getByText('Start Learning').closest('button');
      await user.click(educationButton!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('education');
    });
  });

  describe('Quick Start Examples', () => {
    it('renders example cards', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('Simple Payment')).toBeInTheDocument();
      expect(screen.getByText('Token Swap')).toBeInTheDocument();
      expect(screen.getByText('NFT Minting')).toBeInTheDocument();
    });

    it('navigates to examples when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const simplePaymentButton = screen.getByText('Try Simple Payment').closest('button');
      await user.click(simplePaymentButton!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });
  });

  describe('Mobile Behavior', () => {
    it('shows mobile-specific elements when isMobile is true', () => {
      render(<WelcomePage {...defaultProps} isMobile={true} />);
      
      const browseButton = screen.getByText('Browse Examples');
      expect(browseButton).toBeInTheDocument();
    });

    it('calls onToggleSidebar when browse examples is clicked on mobile', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} isMobile={true} />);
      
      const browseButton = screen.getByText('Browse Examples');
      await user.click(browseButton);
      
      expect(mockOnToggleSidebar).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByLabelText('Platform statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Choose your learning path')).toBeInTheDocument();
      expect(screen.getByLabelText('Explore platform features')).toBeInTheDocument();
    });

    it('has proper heading hierarchy', () => {
      render(<WelcomePage {...defaultProps} />);
      
      const headings = screen.getAllByRole('heading');
      const h1 = headings.find(h => h.tagName === 'H1');
      const h2s = headings.filter(h => h.tagName === 'H2');
      
      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const firstButton = screen.getByText('Start Beginner Path').closest('button');
      
      // Focus the button
      await user.tab();
      expect(firstButton).toHaveFocus();
      
      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });

    it('supports space key activation', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const button = screen.getByText('Start Beginner Path').closest('button');
      button?.focus();
      
      await user.keyboard(' ');
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });
  });

  describe('Error Handling', () => {
    it('handles missing onSelectExample gracefully', () => {
      const { container } = render(
        <WelcomePage 
          onSelectExample={undefined as any}
          onToggleSidebar={mockOnToggleSidebar}
          isMobile={false}
        />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('handles missing onToggleSidebar gracefully', () => {
      const { container } = render(
        <WelcomePage 
          onSelectExample={mockOnSelectExample}
          onToggleSidebar={undefined}
          isMobile={true}
        />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('applies welcome-page class for styling', () => {
      const { container } = render(<WelcomePage {...defaultProps} />);
      
      expect(container.firstChild).toHaveClass('welcome-page');
    });

    it('has proper semantic structure', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getAllByRole('region')).toHaveLength(4); // Four main sections
    });
  });
});