import Link from "next/link";

const PAGE_BG = "#f5f2ec";
const CARD_BG = "#fffdf9";
const CARD_BORDER = "#d9e2dc";
const TEXT = "#193129";
const MUTED = "#64746d";
const PRIMARY = "#247052";

export default function Custom404Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: PAGE_BG,
        color: TEXT,
        fontFamily: "Segoe UI, system-ui, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "40rem",
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: "1rem",
          background: CARD_BG,
          padding: "1.5rem",
          boxShadow: "0 12px 28px rgba(18, 35, 27, 0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: PRIMARY,
          }}
        >
          404
        </p>

        <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem", lineHeight: 1.2 }}>
          Page not found
        </h1>
        <p style={{ margin: "0.5rem 0 0", color: MUTED }}>
          The page you requested does not exist or has moved.
        </p>

        <div
          lang="ar"
          dir="rtl"
          style={{
            marginTop: "1.25rem",
            paddingTop: "1.25rem",
            borderTop: `1px solid ${CARD_BORDER}`,
            textAlign: "right",
            fontFamily: "Tahoma, Arial, sans-serif",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.35 }}>الصفحة غير موجودة</h2>
          <p style={{ margin: "0.5rem 0 0", color: MUTED }}>
            الصفحة المطلوبة غير موجودة أو تم نقلها.
          </p>
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "2.75rem",
              padding: "0 1rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontWeight: 600,
              color: "#ffffff",
              background: PRIMARY,
            }}
          >
            Go home
          </Link>

          <Link
            href="/"
            lang="ar"
            dir="rtl"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "2.75rem",
              padding: "0 1rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontWeight: 600,
              color: TEXT,
              background: "#ffffff",
              border: `1px solid ${CARD_BORDER}`,
              fontFamily: "Tahoma, Arial, sans-serif",
            }}
          >
            العودة للرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
