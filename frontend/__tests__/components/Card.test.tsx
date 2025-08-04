import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card>
        <CardContent>
          <p>Card content</p>
        </CardContent>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders card with header and title', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-class">
        <CardContent>Content</CardContent>
      </Card>
    );
    const card = screen.getByText('Content').closest('div')?.parentElement;
    expect(card).toHaveClass('custom-class');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
  });
}); 