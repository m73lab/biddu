import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Verifica tu Correo Electrónico
    </mj-text>
    <mj-text>
      Hola {{NAME}},
    </mj-text>
    <mj-text>
      ¡Gracias por crear una cuenta en Biddu! Por favor verifica tu correo electrónico haciendo clic en el botón de abajo.
    </mj-text>
    <mj-button href="{{VERIFICATION_URL}}">
      Verificar Correo
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}">
      Este enlace expirará en 24 horas.
    </mj-text>
    <mj-divider border-color="${theme.colors.border}" padding="20px 0" />
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      Si no creaste una cuenta en Biddu, puedes ignorar este correo de forma segura.
    </mj-text>
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      Si tienes problemas para hacer clic en el botón, copia y pega esta URL en tu navegador:
    </mj-text>
    <mj-text font-size="11px" color="${theme.colors.primary}" word-break="break-all">
      {{VERIFICATION_URL}}
    </mj-text>
`;

export const emailVerificationTemplate = renderLayout({
  title: "Verifica tu Correo Electrónico",
  previewText: "Verifica tu correo electrónico de Biddu",
  content,
});

export function getEmailVerificationTemplateData(data: {
  name: string;
  verificationUrl: string;
}) {
  return {
    template: emailVerificationTemplate,
    replacements: {
      "{{NAME}}": escapeHtml(data.name || "ahí"),
      "{{VERIFICATION_URL}}": data.verificationUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
