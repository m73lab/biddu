import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      La Cuenta Ya Existe
    </mj-text>
    <mj-text>
      Hola {{NAME}},
    </mj-text>
    <mj-text>
      Alguien (¡esperamos que tú!) intentó crear una nueva cuenta en SubastaYa usando este correo electrónico. Sin embargo, ya tienes una cuenta con nosotros.
    </mj-text>
    <mj-text>
      Si fuiste tú, puedes iniciar sesión en tu cuenta existente:
    </mj-text>
    <mj-button href="{{LOGIN_URL}}">
      Iniciar Sesión
    </mj-button>
    <mj-text>
      ¿Olvidaste tu contraseña? No te preocupes — puedes restablecerla aquí:
    </mj-text>
    <mj-button href="{{RESET_URL}}" background-color="${theme.colors.text.light}">
      Restablecer Contraseña
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}" padding-top="16px">
      Si no intentaste crear una cuenta, puedes ignorar este correo de forma segura. Tu cuenta está protegida.
    </mj-text>
`;

export const accountExistsTemplate = renderLayout({
  title: "La Cuenta Ya Existe",
  previewText: "Ya tienes una cuenta en SubastaYa",
  content,
});

export function getAccountExistsTemplateData(data: {
  name: string;
  appUrl: string;
}) {
  return {
    template: accountExistsTemplate,
    replacements: {
      "{{NAME}}": escapeHtml(data.name || "ahí"),
      "{{LOGIN_URL}}": `${data.appUrl}/login`,
      "{{RESET_URL}}": `${data.appUrl}/forgot-password`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
