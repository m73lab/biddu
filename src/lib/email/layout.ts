/**
 * HTML-encode a string to prevent XSS in email templates
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Biddú brand palette (matches the landing/web theme).
export const theme = {
  colors: {
    // Deeper amber for text/links on light backgrounds (contrast-safe).
    primary: "#b45309",
    // Brand gold used for buttons and accents.
    gold: "#e89b2d",
    ink: "#0b1220",
    secondary: "#e11d48",
    cream: "#faf6ee",
    background: "#f4efe4",
    surface: "#ffffff",
    text: {
      main: "#0b1220",
      muted: "#5b6472",
      light: "#8a93a5",
    },
    border: "#ece3d2",
    error: "#e11d48",
  },
  borderRadius: {
    sm: "4px",
    md: "10px",
    lg: "12px",
    xl: "16px",
  },
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://biddu.online";

interface LayoutProps {
  content: string;
  previewText?: string;
  title?: string;
  year?: string;
}

export function renderLayout({
  content,
  previewText,
  title = "Biddú",
  year = "{{YEAR}}",
}: LayoutProps) {
  return `
    <mjml>
      <mj-head>
        <mj-title>${title}</mj-title>
        <mj-preview>${previewText || title}</mj-preview>
        <mj-attributes>
          <mj-all font-family="${theme.fontFamily}" />
          <mj-text font-size="16px" color="${theme.colors.text.main}" line-height="1.6" />
          <mj-button
            background-color="${theme.colors.gold}"
            color="${theme.colors.ink}"
            font-size="16px"
            font-weight="700"
            border-radius="${theme.borderRadius.md}"
            padding="14px 28px"
            inner-padding="14px 28px"
          />
          <mj-section padding="0px" />
          <mj-class name="heading" font-size="24px" font-weight="800" color="${theme.colors.text.main}" />
          <mj-class name="subheading" font-size="18px" font-weight="700" color="${theme.colors.text.main}" />
          <mj-class name="muted" color="${theme.colors.text.muted}" font-size="14px" />
        </mj-attributes>
        <mj-style>
          .wordmark { text-decoration: none; font-size: 26px; font-weight: 800; color: ${theme.colors.gold}; letter-spacing: -0.5px; }
          .footer-link { color: ${theme.colors.text.muted}; text-decoration: underline; }
        </mj-style>
      </mj-head>
      <mj-body background-color="${theme.colors.background}" width="600px">

        <!-- Header (dark ink band with the gold wordmark) -->
        <mj-section background-color="${theme.colors.ink}" padding="28px 24px 26px">
          <mj-column>
            <mj-text align="center" padding="0">
              <a href="${APP_URL}" class="wordmark">Biddú</a>
            </mj-text>
            <mj-text align="center" color="${theme.colors.cream}" font-size="13px" padding-top="6px" letter-spacing="0.5px">
              SUBASTAS PRIVADAS · EN VIVO
            </mj-text>
          </mj-column>
        </mj-section>

        <!-- Main Content Card -->
        <mj-section padding="28px 16px 0">
          <mj-column background-color="${theme.colors.surface}" border-radius="${theme.borderRadius.xl}" padding="32px" border="1px solid ${theme.colors.border}">
            ${content}
          </mj-column>
        </mj-section>

        <!-- Footer -->
        <mj-section padding="28px 24px 44px">
          <mj-column>
            <mj-text align="center" color="${theme.colors.text.muted}" font-size="13px" padding="0 0 6px">
              © ${year} Biddú · Subastas privadas, en vivo
            </mj-text>
            <mj-text align="center" color="${theme.colors.text.light}" font-size="12px" padding-top="6px">
              <a href="${APP_URL}/privacy" class="footer-link">Política de Privacidad</a>
              &nbsp;&nbsp;•&nbsp;&nbsp;
              <a href="${APP_URL}/terms" class="footer-link">Términos de Servicio</a>
            </mj-text>
          </mj-column>
        </mj-section>

      </mj-body>
    </mjml>
  `;
}
