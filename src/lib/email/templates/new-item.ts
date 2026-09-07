import { renderLayout, theme, escapeHtml } from "../layout";

const content = `
    <mj-text font-size="22px" font-weight="600" color="${theme.colors.text.main}">
      ¡Nuevo Lote Agregado! 🆕
    </mj-text>
    <mj-text>
      Se ha agregado un nuevo lote a una subasta de la que eres miembro:
    </mj-text>
    <mj-text font-size="18px" font-weight="600" color="${theme.colors.primary}" padding="8px 0">
      "{{ITEM_NAME}}"
    </mj-text>
    <mj-text font-size="14px" color="${theme.colors.text.muted}">
      en la subasta: <strong>{{AUCTION_NAME}}</strong>
    </mj-text>
    {{ITEM_IMAGE}}
    {{ITEM_DESCRIPTION}}
    <mj-text>
      No te lo pierdas — ¡revísalo y haz tu puja!
    </mj-text>
    <mj-button href="{{ITEM_URL}}">
      Ver Lote
    </mj-button>
    <mj-text align="center" font-size="11px" color="${theme.colors.text.light}" font-style="italic" padding-top="20px">
      ¿No quieres recibir estas notificaciones? Puedes desactivarlas en tu configuración de usuario.
    </mj-text>
`;

export const newItemTemplate = renderLayout({
  title: "Nuevo Lote Agregado",
  previewText: "Se ha agregado un nuevo lote a una subasta",
  content,
});

export function getNewItemTemplateData(data: {
  itemName: string;
  itemDescription: string | null;
  itemImageUrl: string | null;
  auctionName: string;
  auctionId: string;
  itemId: string;
  appUrl: string;
}) {
  const imageSection = data.itemImageUrl
    ? `<mj-image src="${data.itemImageUrl}" alt="${escapeHtml(data.itemName)}" width="400px" border-radius="8px" padding="16px 0" />`
    : "";

  const descriptionSection = data.itemDescription
    ? `<mj-text font-size="14px" color="${theme.colors.text.muted}" padding="8px 0">${escapeHtml(data.itemDescription)}</mj-text>`
    : "";

  return {
    template: newItemTemplate,
    replacements: {
      "{{ITEM_NAME}}": escapeHtml(data.itemName),
      "{{AUCTION_NAME}}": escapeHtml(data.auctionName),
      "{{ITEM_IMAGE}}": imageSection,
      "{{ITEM_DESCRIPTION}}": descriptionSection,
      "{{ITEM_URL}}": `${data.appUrl}/auctions/${encodeURIComponent(data.auctionId)}/items/${encodeURIComponent(data.itemId)}`,
      "{{YEAR}}": new Date().getFullYear().toString(),
    },
  };
}
