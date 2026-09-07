import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      ¡Felicitaciones! 🎉
    </mj-text>
    <mj-text>
      ¡Has ganado un lote en la subasta:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
      en la subasta: <strong>{{AUCTION_NAME}}</strong>
    </mj-text>
    <mj-text font-size="16px" padding="16px 0">
      Puja ganadora: <strong style="color: #16a34a;">{{CURRENCY_SYMBOL}}{{WINNING_AMOUNT}}</strong>
    </mj-text>
    <mj-text>
      La subasta de este lote ha terminado y tú eres el ganador. Contacta al organizador de la subasta para los próximos pasos.
    </mj-text>
    <mj-button href="{{ITEM_URL}}">
      Ver Detalles del Lote
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      ¿No quieres recibir estas notificaciones? Puedes desactivarlas en tu configuración de usuario.
    </mj-text>
`;

export const itemWonTemplate = renderLayout({
  title: "¡Ganaste!",
  previewText: "¡Felicitaciones! Has ganado un lote",
  content,
});

export function getItemWonTemplateData(data: {
  itemName: string;
  auctionName: string;
  auctionId: string;
  itemId: string;
  winningAmount: number;
  currencySymbol: string;
  normalizedAmount?: number;
  appUrl: string;
}) {
  return {
    template: itemWonTemplate,
    replacements: {
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{CURRENCY_SYMBOL}}": escapeHtml(data.currencySymbol),
      "{{WINNING_AMOUNT}}": `${data.winningAmount.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${
        typeof data.normalizedAmount === "number"
          ? ` (normalizado: ${data.normalizedAmount})`
          : ""
      }`,
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(data.auctionId)}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
