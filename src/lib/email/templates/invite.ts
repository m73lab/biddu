import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      ¡Te Invitaron! 🎯
    </mj-text>
    <mj-text>
      <strong>{{SENDER_NAME}}</strong> te ha invitado a unirte a la subasta:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="16px 0">
      "{{AUCTION_NAME}}"
    </mj-text>
    <mj-text>
      Has sido invitado como <strong>{{ROLE}}</strong>. Haz clic en el botón de abajo para aceptar la invitación y comenzar a pujar.
    </mj-text>
    <mj-button href="{{INVITE_URL}}">
      Aceptar Invitación
    </mj-button>
    <mj-text font-size="12px" color="${theme.colors.text.light}" padding-top="16px">
      Esta invitación expirará en 7 días. Si aún no tienes una cuenta, se te pedirá crear una.
    </mj-text>
`;

export const inviteTemplate = renderLayout({
  title: "¡Te Invitaron!",
  previewText: "Has sido invitado a una subasta en SubastaYa",
  content,
});

export function getInviteTemplateData(data: {
  senderName: string;
  auctionName: string;
  role: string;
  token: string;
  appUrl: string;
}) {
  const roleMap: Record<string, string> = {
    OWNER: "Dueño",
    ADMIN: "Administrador",
    CREATOR: "Creador",
    BIDDER: "Postor",
  };
  const roleDisplay = roleMap[data.role] || data.role;
  return {
    template: inviteTemplate,
    replacements: {
      "{{SENDER_NAME}}": escapeHtml(data.senderName || "Alguien"),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{ROLE}}": escapeHtml(roleDisplay),
      "{{INVITE_URL}}": `${data.appUrl}/invite/${encodeURIComponent(data.token)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
