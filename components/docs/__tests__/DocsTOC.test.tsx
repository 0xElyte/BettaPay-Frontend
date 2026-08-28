import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocsTOC } from '../DocsTOC';

// Mock the useScrollSpy hook so we can control active state and avoid real intersection observers
jest.mock('@/lib/hooks/useScrollSpy', () => ({
  useScrollSpy: jest.fn((ids) => ids[0] || ''),
}));

describe('DocsTOC Component Integration & Unique IDs', () => {
  beforeEach(() => {
    // Clear DOM and any mock states
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('generates unique, stable IDs for duplicate-title headings across different sections', () => {
    // Setup a mock DOM representing multiple documentation sections with duplicate headings
    document.body.innerHTML = `
      <main id="main-content">
        <section id="overview">
          <h3 id="overview-conventions">Conventions</h3>
          <h3 id="overview-response">Response format</h3>
        </section>
        <section id="authentication">
          <h3 id="auth-conventions">Conventions</h3>
        </section>
      </main>
    `;

    // Render the DocsTOC targeting 'overview' first
    const { rerender } = render(<DocsTOC activeSection="overview" />);

    // Query headings in the DOM to check their newly assigned unique IDs
    const headings = document.querySelectorAll('h3');
    expect(headings).toHaveLength(3);

    // Verify unique, stable ID generation (slug + index format)
    expect(headings[0].id).toBe('conventions-0');
    expect(headings[1].id).toBe('response-format-1');
    expect(headings[2].id).toBe('conventions-2');

    // Verify TOC generated for the 'overview' section has correct anchors
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#conventions-0');
    expect(links[0]).toHaveTextContent('Conventions');
    expect(links[1]).toHaveAttribute('href', '#response-format-1');
    expect(links[1]).toHaveTextContent('Response format');

    // Rerender with 'authentication' as the active section
    rerender(<DocsTOC activeSection="authentication" />);

    // Verify TOC generated for the 'authentication' section uses its unique conventions-2 anchor
    const authLinks = screen.getAllByRole('link');
    expect(authLinks).toHaveLength(1);
    expect(authLinks[0]).toHaveAttribute('href', '#conventions-2');
    expect(authLinks[0]).toHaveTextContent('Conventions');
  });
});
