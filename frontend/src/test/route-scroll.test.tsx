import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter } from 'react-router-dom';
import { RouteScrollReset } from '@/components/orca/RouteScrollReset';
afterEach(() => vi.restoreAllMocks());
it('starts each new path at the top without resetting query-only state', () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<MemoryRouter><RouteScrollReset/><Link to='/location'>Location</Link><Link to='/location?view=map'>Filter</Link></MemoryRouter>);
  expect(scroll).toHaveBeenLastCalledWith({top:0,left:0,behavior:'instant'});
  scroll.mockClear(); fireEvent.click(screen.getByText('Location'));
  expect(scroll).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Filter')); expect(scroll).toHaveBeenCalledTimes(1);
});
it('preserves explicit fragment destinations', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {value:scroll,configurable:true});
  render(<MemoryRouter><RouteScrollReset/><Link to='/privacy#details'>Read</Link><section id='details'>Details</section></MemoryRouter>);
  fireEvent.click(screen.getByText('Read'));
  expect(scroll).toHaveBeenCalledWith({behavior:'instant',block:'start'});
});
