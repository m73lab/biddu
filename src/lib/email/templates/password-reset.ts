import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Restablecer Contraseña
    </mj-text>
    <mj-text>
      Hola {{NAME}},
    </mj-text>
    <mj-text>
      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Biddu. Haz clic en el botón de abajo para crear una nueva contraseña.
    </mj-text>
    <mj-button href="{{RESET_URL}}">
      Restablecer Contraseña
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}">
      Este enlace expirará en 10 minutos por razones de seguridad.
    </mj-text>
    <mj-divider border-color="${theme.colors.border}" padding="20px 0" />
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo de forma segura. Tu contraseña permanecerá sin cambios.
    </mj-text>
    <mj-text font-size="12px" color="${theme.colors.text.muted}">
      Si tienes problemas para hacer clic en el botón, copia y pega esta URL en tu navegador:
    </mj-text>
    <mj-text font-size="11px" color="${theme.colors.primary}" word-break="break-all">
      {{RESET_URL}}
    </mj-text>
`;

export const passwordResetTemplate = renderLayout({
  title: "Restablecer Contraseña",
  previewText: "Restablece tu contraseña de Biddu",
  content,
});

export function getPasswordResetTemplateData(data: {
  name: string;
  resetUrl: string;
}) {
  return {
    template: passwordResetTemplate,
    replacements: {
      "{{NAME}}": escapeHtml(data.name || "ahí"),
      "{{RESET_URL}}": data.resetUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
