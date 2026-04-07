import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileSwipeableSections } from '../mobile-swipeable-sections';

let currentLanguage = 'en';

vi.mock('@/hooks/use-language', () => ({
  useLanguage: () => ({
    isRTL: currentLanguage === 'ar',
  }),
}));

const sections = [
  {
    id: 'first',
    title: 'First section',
    content: <div>First content</div>,
  },
  {
    id: 'second',
    title: 'Second section',
    content: <div>Second content</div>,
  },
  {
    id: 'third',
    title: 'Third section',
    content: <div>Third content</div>,
  },
];

describe('MobileSwipeableSections', () => {
  beforeEach(() => {
    currentLanguage = 'en';
  });

  it('renders navigation controls and accessibility state', () => {
    render(<MobileSwipeableSections sections={sections} />);

    expect(screen.getByTestId('mobile-swipeable-sections')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next section' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to First section' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('navigates with arrow buttons and dot controls', async () => {
    const user = userEvent.setup();
    render(<MobileSwipeableSections sections={sections} />);

    await user.click(screen.getByRole('button', { name: 'Next section' }));
    expect(screen.getByText('Second section')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to Third section' }));
    expect(screen.getByText('Third section')).toBeInTheDocument();
  });

  it('swipes left to advance in ltr mode', () => {
    render(<MobileSwipeableSections sections={sections} />);

    const swipeArea = screen.getByTestId('mobile-swipeable-sections-swipe-area');

    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 220, clientY: 40 }],
    });
    fireEvent.touchEnd(swipeArea, {
      changedTouches: [{ clientX: 120, clientY: 40 }],
    });

    expect(screen.getByText('Second section')).toBeInTheDocument();
  });

  it('reverses swipe direction in rtl mode', () => {
    currentLanguage = 'ar';
    render(<MobileSwipeableSections sections={sections} />);

    const swipeArea = screen.getByTestId('mobile-swipeable-sections-swipe-area');

    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 220, clientY: 40 }],
    });
    fireEvent.touchEnd(swipeArea, {
      changedTouches: [{ clientX: 120, clientY: 40 }],
    });

    expect(screen.getByText('Third section')).toBeInTheDocument();
  });

  it('wraps from the last section back to the first when swiping forward', () => {
    render(<MobileSwipeableSections sections={sections} />);

    const swipeArea = screen.getByTestId('mobile-swipeable-sections-swipe-area');

    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 220, clientY: 40 }],
    });
    fireEvent.touchEnd(swipeArea, {
      changedTouches: [{ clientX: 120, clientY: 40 }],
    });

    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 220, clientY: 40 }],
    });
    fireEvent.touchEnd(swipeArea, {
      changedTouches: [{ clientX: 120, clientY: 40 }],
    });

    fireEvent.touchStart(swipeArea, {
      touches: [{ clientX: 220, clientY: 40 }],
    });
    fireEvent.touchEnd(swipeArea, {
      changedTouches: [{ clientX: 120, clientY: 40 }],
    });

    expect(screen.getByText('First section')).toBeInTheDocument();
  });
});
