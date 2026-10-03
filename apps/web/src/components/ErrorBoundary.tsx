import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered after a crash; supplied by a function component so the text comes from the i18n system. */
  fallback: () => ReactNode;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    console.error(error);
  }
  override render() {
    return this.state.failed ? this.props.fallback() : this.props.children;
  }
}
