import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      Bienvenido a SubastaYa, {{NAME}}! 🎉
    </mj-text>
    <mj-text>
      ¡Gracias por unirte a SubastaYa, tu plataforma de subastas privadas. Estamos emocionados de tenerte con nosotros!
    </mj-text>
    <mj-text>
      Con SubastaYa puedes:
    </mj-text>
    <mj-text padding-left="20px">
      • Crear y gestionar subastas privadas<br/>
      • Invitar a amigos y colegas a pujar<br/>
      • Seguir tus pujas en tiempo real<br/>
      • Personalizar la configuración de tus subastas
    </mj-text>
    <mj-text>
      ¿Listo para comenzar? Haz clic en el botón de abajo para explorar tu panel.
    </mj-text>
    <mj-button href="{{APP_URL}}/dashboard">
      Ir al Panel
    </mj-button>
`;

export const welcomeTemplate = renderLayout({
  title: "Bienvenido a SubastaYa",
  previewText: "Bienvenido a SubastaYa - Tu Plataforma de Subastas Privadas",
  content,
});

export function getWelcomeTemplateData(data: { name: string; appUrl: string }) {
  return {
    template: welcomeTemplate,
    replacements: {
      "{{NAME}}": escapeHtml(data.name || "ahí"),
      "{{APP_URL}}": data.appUrl,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
