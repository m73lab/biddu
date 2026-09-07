import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      ¡Te Superaron! ⚡
    </mj-text>
    <mj-text>
      Alguien ha pujado más por un lote que estabas ganando:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
      en la subasta: <strong>{{AUCTION_NAME}}</strong>
    </mj-text>
    <mj-text font-size="16px" padding="16px 0">
      Nueva puja más alta: <strong style="color: #dc2626;">{{CURRENCY_SYMBOL}}{{NEW_AMOUNT}}</strong>
    </mj-text>
    <mj-text>
      ¡No lo dejes escapar — haz una puja más alta ahora!
    </mj-text>
    <mj-button href="{{ITEM_URL}}">
      Hacer Nueva Puja
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      ¿No quieres recibir estas notificaciones? Puedes desactivarlas en tu configuración de usuario.
    </mj-text>
`;

export const outbidTemplate = renderLayout({
  title: "¡Te Superaron!",
  previewText: "Te superaron en una puja",
  content,
});

export function getOutbidTemplateData(data: {
  itemName: string;
  auctionName: string;
  auctionId: string;
  itemId: string;
  newAmount: number;
  currencySymbol: string;
  normalizedAmount?: number;
  appUrl: string;
}) {
  return {
    template: outbidTemplate,
    replacements: {
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{CURRENCY_SYMBOL}}": escapeHtml(data.currencySymbol),
      "{{NEW_AMOUNT}}": `${data.newAmount.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${
        typeof data.normalizedAmount === "number"
          ? ` (normalizado: ${data.normalizedAmount})`
          : ""
      }`,
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(data.auctionId)}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
