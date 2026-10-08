import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DevForgeDashboard } from './DevForgeDashboard';

describe('DevForgeDashboard', () => {
  it('shows deterministic platform metrics and key destinations', () => {
    render(
      <MemoryRouter>
        <DevForgeDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Service' }),
    ).toHaveAttribute('href', '/create');
    expect(
      screen.getByRole('button', { name: 'Explore Services' }),
    ).toHaveAttribute('href', '/catalog?filters[kind]=component');
    expect(
      screen.getByRole('button', { name: 'Documentation' }),
    ).toHaveAttribute(
      'href',
      '/catalog/default/component/threat-intel-api/docs',
    );
  });
});
