"use client";

import * as React from "react";

/**
 * Records a template view once per mount. Fire-and-forget: analytics must never
 * block or break the page, and we deliberately store nothing beyond the
 * template id and (when signed in) the user id.
 */
export function TrackTemplateView({ slug }: { slug: string }) {
  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/templates/${encodeURIComponent(slug)}/view`, {
        method: "POST",
        signal: controller.signal,
        keepalive: true,
      }).catch(() => {});
    }, 1200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  return null;
}
