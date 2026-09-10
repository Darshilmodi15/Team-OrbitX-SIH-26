import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ThankYouPage from '@/pages/ThankYouPage';
import { answerQuestion } from '@/lib/orca/assistant';

it('does not confirm SOS dispatch or receipt from query parameters', () => {
  render(<MemoryRouter initialEntries={['/thank-you?reason=sos&email=test@example.com']}><ThankYouPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Submission not verified' })).toBeInTheDocument();
  expect(screen.queryByText(/receipt sent to/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/INCOIS Coastal Ground Station/)).not.toBeInTheDocument();
  expect(screen.queryByText(/AES-256 Validated/)).not.toBeInTheDocument();
  expect(screen.queryByText(/ORCA-IN-\d/)).not.toBeInTheDocument();
});
it('quarantines the legacy synthetic assistant even if imported', () => {
  expect(() => answerQuestion('waves', {} as Parameters<typeof answerQuestion>[1])).toThrow('LEGACY_SYNTHETIC_TEMPLATE_DISABLED');
});
