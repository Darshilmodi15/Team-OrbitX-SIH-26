import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/lib/orca/theme';
import { I18nProvider } from '@/lib/orca/i18n';
import { AppearanceMenu } from '@/components/orca/AppearanceMenu';
import { LanguageMenu } from '@/components/orca/LanguageMenu';

let change: ((event: {matches:boolean}) => void) | undefined;
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches:true, addEventListener: (_: string, handler: typeof change) => {change=handler;}, removeEventListener: vi.fn() })));
});
afterEach(() => { vi.unstubAllGlobals(); document.documentElement.classList.remove('dark'); document.documentElement.style.removeProperty('font-size'); });
const mount = () => render(<ThemeProvider><I18nProvider><AppearanceMenu /></I18nProvider></ThemeProvider>);

it('defaults to System, responds live to OS changes, and preserves an explicit theme', () => {
  mount(); fireEvent.click(screen.getByRole('button', {name:'Appearance'}));
  expect(screen.getByRole('button', {name:'System default'})).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement).toHaveClass('dark');
  act(() => change?.({matches:false}));
  expect(document.documentElement).not.toHaveClass('dark');
  fireEvent.click(screen.getByRole('button', {name:'Dark mode'}));
  expect(localStorage.getItem('orca_theme')).toBe('dark');
  act(() => change?.({matches:false}));
  expect(document.documentElement).toHaveClass('dark');
  fireEvent.click(screen.getByRole('button', {name:'Light mode'}));
  expect(document.documentElement).not.toHaveClass('dark');
});
it('resizes in both directions, clamps the range, persists and resets', () => {
  let view = mount(); fireEvent.click(screen.getByRole('button', {name:'Appearance'}));
  fireEvent.click(screen.getByRole('button', {name:'Smaller text'}));
  expect(document.documentElement.style.fontSize).toBe('90%');
  expect(screen.getByRole('button', {name:'Smaller text'})).toBeDisabled();
  for (let i=0;i<4;i++) fireEvent.click(screen.getByRole('button', {name:'Larger text'}));
  expect(document.documentElement.style.fontSize).toBe('150%');
  expect(screen.getByRole('button', {name:'Larger text'})).toBeDisabled();
  view.unmount(); view = mount();
  fireEvent.click(screen.getByRole('button', {name:'Appearance'}));
  expect(screen.getByText('150%')).toBeVisible();
  fireEvent.click(screen.getByRole('button', {name:'Reset'}));
  expect(document.documentElement.style.fontSize).toBe('100%');
  expect(localStorage.getItem('orca_text_size')).toBe('100');
});
it('rejects corrupt saved text sizes and restores saved theme', () => {
  localStorage.setItem('orca_text_size', '900'); localStorage.setItem('orca_theme', 'light');
  mount(); expect(document.documentElement.style.fontSize).toBe('100%');
  expect(document.documentElement).not.toHaveClass('dark');
});
it('closes appearance and language panels with Escape and returns focus', () => {
  render(<ThemeProvider><I18nProvider><AppearanceMenu/><LanguageMenu/></I18nProvider></ThemeProvider>);
  const appearance = screen.getByRole('button', {name:'Appearance'});
  fireEvent.click(appearance); fireEvent.keyDown(screen.getByRole('button', {name:'Dark mode'}), {key:'Escape'});
  expect(appearance).toHaveAttribute('aria-expanded','false'); expect(appearance).toHaveFocus();
  const language = screen.getByRole('button', {name:'Choose your language'});
  fireEvent.click(language); fireEvent.keyDown(language, {key:'Escape'});
  expect(language).toHaveAttribute('aria-expanded','false'); expect(language).toHaveFocus();
});
