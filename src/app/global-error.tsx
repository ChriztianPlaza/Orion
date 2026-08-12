"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            Orion could not start
          </h1>
          <p style={{ marginTop: "12px", color: "rgba(255,255,255,0.45)", fontSize: "15px" }}>
            An unexpected error occurred while loading the application.
          </p>
          {error.digest && (
            <p style={{ marginTop: "8px", color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "10px 22px",
              borderRadius: "999px",
              border: 0,
              background: "#fff",
              color: "#000",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
