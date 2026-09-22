import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import React from "react";
import { ImageResponse } from "@vercel/og";
import { getPublicAuctionData } from "@/lib/services/auction.service";
import { createLogger } from "@/lib/logger";

const ogLogger = createLogger("og");

const W = 1200;
const H = 630;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://biddu.online";

let cachedFonts: { name: string; data: Buffer; weight: 400 | 700 }[] | null =
  null;

function loadFonts() {
  if (!cachedFonts) {
    cachedFonts = [
      {
        name: "Inter",
        data: fs.readFileSync(
          path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"),
        ),
        weight: 400 as const,
      },
      {
        name: "Inter",
        data: fs.readFileSync(
          path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"),
        ),
        weight: 700 as const,
      },
    ];
  }
  return cachedFonts;
}

function endsLabel(endDate: string | null): string | null {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return "Finalizada";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `Termina en ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `Termina en ${h} h`;
  return `Termina en ${Math.floor(h / 24)} d`;
}

function absoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${APP_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function card(
  data: {
    name: string;
    thumbnail: string | null;
    stats: string;
    ends: string | null;
    ended: boolean;
  },
  fonts: { name: string; data: Buffer; weight: 400 | 700 }[],
) {
  const { name, thumbnail, stats, ends, ended } = data;
  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: W,
          height: H,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 56,
          padding: "56px 64px",
          background: "#0b1220",
          color: "#faf6ee",
          fontFamily: "Inter",
        },
      },
      thumbnail
        ? React.createElement("img", {
            src: thumbnail,
            width: 400,
            height: 400,
            style: { borderRadius: 28, objectFit: "cover" },
          })
        : React.createElement(
            "div",
            {
              style: {
                width: 400,
                height: 400,
                borderRadius: 28,
                background: "#e89b2d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                fontWeight: 700,
                color: "#0b1220",
              },
            },
            "B",
          ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#e89b2d",
              marginBottom: 16,
            },
          },
          ended ? "REMATE FINALIZADO" : "REMATE EN VIVO · BIDDÚ",
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 620,
              marginBottom: 20,
            },
          },
          name,
        ),
        React.createElement(
          "div",
          { style: { fontSize: 34, color: "#c9c2b4", marginBottom: 28 } },
          stats,
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "row",
              gap: 16,
              alignItems: "center",
            },
          },
          ends
            ? React.createElement(
                "div",
                {
                  style: {
                    fontSize: 32,
                    fontWeight: 700,
                    background: ended ? "#3a4356" : "#e89b2d",
                    color: ended ? "#faf6ee" : "#0b1220",
                    borderRadius: 999,
                    padding: "10px 28px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  },
                },
                ends,
              )
            : null,
          React.createElement(
            "div",
            { style: { fontSize: 30, color: "#e89b2d", fontWeight: 700 } },
            "Puja en biddu.online",
          ),
        ),
      ),
    ),
    { width: W, height: H, fonts },
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Missing id" });
  }

  try {
    const auction = await getPublicAuctionData(id);
    if (!auction) {
      return res.status(404).json({ message: "Not found" });
    }
    const fonts = loadFonts();
    const ends = endsLabel(auction.endDate);
    const ended =
      !!auction.endDate && new Date(auction.endDate).getTime() <= Date.now();
    const stats = `${auction._count.items} ${auction._count.items === 1 ? "lote" : "lotes"} · ${auction._count.members} ${auction._count.members === 1 ? "miembro" : "miembros"}`;
    const thumb = absoluteUrl(auction.thumbnailUrl);

    const renderPng = async (thumbnail: string | null) => {
      const response = card(
        { name: auction.name, thumbnail, stats, ends, ended },
        fonts,
      );
      return Buffer.from(await response.arrayBuffer());
    };

    let buffer: Buffer;
    try {
      buffer = await renderPng(thumb);
    } catch {
      // Si la foto no carga, tarjeta sin imagen (nunca un 500 al scraper)
      buffer = await renderPng(null);
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    );
    res.setHeader("Content-Length", buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    ogLogger.error({ err, id }, "OG render failed");
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stack =
      err instanceof Error ? (err.stack || "").split("\n").slice(0, 5) : [];
    return res
      .status(500)
      .json({ message: "og_error", error: msg, stack });
  }
}
