import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import WelcomePage from '../WelcomePage';

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

// Mock the useResponsiveLayout hook
vi.mock('../hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    screenSize: 'desktop',
    sidebarCollapsed: false,
    showEducationPanel: true,
    contentWidth: '60%',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    toggleSidebar: vi.fn(),
    toggleEducationPanel: vi.fn(),
    setSidebarCollapsed: vi.fn(),
    setShowEducationPanel: vi.fn(),
  }),
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
      expect(screen.getByText('Contract Examples')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Learning Paths')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getAllByText('Interactive').length).toBeGreaterThan(0);
    });
  });

  describe('Learning Paths', () => {
    it('renders all three learning paths', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('New to Smart Contracts')).toBeInTheDocument();
      expect(screen.getByText('Building DeFi Applications')).toBeInTheDocument();
      expect(screen.getByText('Expert Contract Development')).toBeInTheDocument();
    });

    it('shows time estimates for each path', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('30 min')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
    });

    it('calls onSelectExample when learning path is clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const beginnerPath = screen.getByText('New to Smart Contracts').closest('div[role="button"]');
      expect(beginnerPath).toBeInTheDocument();
      
      await user.click(beginnerPath!);
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });
  });

  describe('Feature Showcase', () => {
    it('renders all three feature cards', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('Contract Tester')).toBeInTheDocument();
      expect(screen.getByText('Visual Designer')).toBeInTheDocument();
      expect(screen.getByText('Learning Center')).toBeInTheDocument();
    });

    it('navigates to contract designer when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const designerCard = screen.getByText('Visual Designer').closest('div[role="button"]');
      await user.click(designerCard!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('contractDesigner');
    });

    it('navigates to education when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const educationCard = screen.getByText('Learning Center').closest('div[role="button"]');
      await user.click(educationCard!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('pinLockContract');
    });
  });

  describe('Quick Start Examples', () => {
    it('renders example cards', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByText('Hello ErgoScript')).toBeInTheDocument();
      expect(screen.getByText('PIN Security')).toBeInTheDocument();
      expect(screen.getByText('Visual Builder')).toBeInTheDocument();
    });

    it('navigates to examples when clicked', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const helloErgoCard = screen.getByText('Hello ErgoScript').closest('div[role="button"]');
      await user.click(helloErgoCard!);
      
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });
  });

  describe('Mobile Behavior', () => {
    it('shows mobile-specific elements when isMobile is true', () => {
      render(<WelcomePage {...defaultProps} isMobile={true} />);
      
      const getStartedButton = screen.getByText('Get Started');
      expect(getStartedButton).toBeInTheDocument();
    });

    it('calls onToggleSidebar when get started is clicked on mobile', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} isMobile={true} />);
      
      const getStartedButton = screen.getByText('Get Started');
      await user.click(getStartedButton);
      
      expect(mockOnToggleSidebar).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<WelcomePage {...defaultProps} />);
      
      expect(screen.getByLabelText('Platform statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Learning path options')).toBeInTheDocument();
      expect(screen.getByLabelText('Platform feature showcase')).toBeInTheDocument();
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
      
      const getStartedButton = screen.getByText('Get Started');
      
      // Focus the button
      getStartedButton.focus();
      expect(getStartedButton).toHaveFocus();
      
      // Activate with Enter key
      await user.keyboard('{Enter}');
      expect(mockOnSelectExample).toHaveBeenCalledWith('simpleSend');
    });

    it('supports space key activation', async () => {
      const user = userEvent.setup();
      render(<WelcomePage {...defaultProps} />);
      
      const button = screen.getByText('Get Started');
      button.focus();
      
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
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(4); // Multiple main sections
    });
  });
});