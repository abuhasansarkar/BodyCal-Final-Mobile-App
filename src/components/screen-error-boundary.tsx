import React, { type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { ErrorState } from "@/components/ui/states";
import { Sentry } from "@/lib/sentry";

/**
 * Contains a failed screen instead of losing the app to it.
 *
 * A Convex `useQuery` throws on the render that observes a server error, and
 * without a boundary in between that reaches `FatalErrorBoundary` — which
 * replaces the *whole* app with "Something went wrong" and offers a restart. One
 * failed profile query should not look like a crash, and it should not cost the
 * user their place in the app.
 *
 * The dashboard already had a boundary of its own, written inline; Progress,
 * Profile and Foods had none, so every one of their queries failed all the way
 * to the top. This is that boundary, generalized, so a screen added later gets
 * the behaviour by wrapping rather than by remembering to hand-roll it.
 *
 * `retry` clears the failed state, which remounts the subtree and re-issues the
 * queries. That is the whole recovery: Convex reconnects and re-subscribes on
 * its own, so a transient failure needs nothing more.
 */

type FallbackRenderer = (retry: () => void) => ReactNode;

class Boundary extends React.Component<
  PropsWithChildren<{ fallback: FallbackRenderer; scope: string }>,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  /*
    Reported, not swallowed. A boundary that quietly renders a retry card turns a
    real bug into a user who taps Retry forever and a developer who never hears
    about it. `scope` names the screen; the scrubbers in `lib/sentry.ts` keep the
    payload free of nutrition, weights and identity.
  */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      tags: { screen: this.props.scope },
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  retry = () => this.setState({ failed: false });

  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

/**
 * Wraps a screen so a failed query renders a retryable card in place.
 *
 * `title` overrides the generic message where a screen has wording of its own —
 * the dashboard does. Everything else uses `errors.loadFailed`, which is already
 * translated into all eight launch languages.
 */
export function ScreenErrorBoundary({
  children,
  scope,
  title,
}: PropsWithChildren<{ scope: string; title?: string }>) {
  const { t } = useTranslation();

  return (
    <Boundary
      scope={scope}
      fallback={(retry) => (
        <AppScreen>
          <ErrorState onRetry={retry} title={title ?? t("errors.loadFailed")} />
        </AppScreen>
      )}
    >
      {children}
    </Boundary>
  );
}
