/**
 * Client-side Pusher/Soketi configuration
 *
 * This module provides the client configuration for connecting to
 * either Soketi (self-hosted) or Pusher Channels (cloud).
 *
 * Note: The actual PusherJS instance is created in the React hook
 * to ensure proper lifecycle management.
 */

import type { RealtimeDriver } from "./config";

export interface ClientRealtimeConfig {
  driver: RealtimeDriver;
  key: string;
  cluster: string;
  wsHost?: string;
  wsPort?: number;
  wssPort?: number;
  forceTLS: boolean;
  enabledTransports: ("ws" | "wss")[];
  disableStats: boolean;
  authEndpoint: string;
}

/**
 * Get client-side Pusher configuration from environment variables
 *
 * These are NEXT_PUBLIC_ prefixed so they're available in the browser
 */
export function getClientConfig(): ClientRealtimeConfig {
  const driver = (process.env.NEXT_PUBLIC_REALTIME_DRIVER ||
    "disabled") as RealtimeDriver;

  if (driver === "disabled") {
    return {
      driver: "disabled",
      key: "",
      cluster: "",
      forceTLS: false,
      enabledTransports: [],
      disableStats: true,
      authEndpoint: "/api/pusher/auth",
    };
  }

  if (driver === "soketi") {
    // Default to the page's own host: self-hosted deployments rarely know
    // their LAN hostname/IP at build time (NEXT_PUBLIC_* is baked in), and
    // a wrong host fails silently in the browser. An explicit
    // NEXT_PUBLIC_SOKETI_HOST still wins when set (required for public
    // domains behind a TLS proxy).
    const host =
      process.env.NEXT_PUBLIC_SOKETI_HOST ||
      (typeof window !== "undefined" ? window.location.hostname : undefined) ||
      "127.0.0.1";
    const port = parseInt(process.env.NEXT_PUBLIC_SOKETI_PORT || "6001", 10);
    const useTLS = process.env.NEXT_PUBLIC_SOKETI_USE_TLS === "true";

    return {
      driver: "soketi",
      key: process.env.NEXT_PUBLIC_SOKETI_APP_KEY || "",
      cluster: "default",
      wsHost: host,
      wsPort: useTLS ? undefined : port,
      wssPort: useTLS ? port : undefined,
      forceTLS: useTLS,
      // Always enable both: pusher-js 8.x builds the default strategy by
      // testing the NON-TLS `ws` transport as the support gate. With
      // enabledTransports: ["wss"] alone, that gate is a no-op
      // (UnsupportedStrategy), isSupported() returns false, and connect()
      // silently goes to 'failed' without ever opening a socket. With both
      // enabled and forceTLS, the client still connects over wss (which
      // Caddy proxies), so forcing wss-only buys nothing but this bug.
      enabledTransports: ["ws", "wss"],
      disableStats: true,
      authEndpoint: "/api/pusher/auth",
    };
  }

  // Pusher Channels
  return {
    driver: "pusher",
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    forceTLS: true,
    enabledTransports: ["ws", "wss"],
    disableStats: true,
    authEndpoint: "/api/pusher/auth",
  };
}

/**
 * Check if realtime is enabled on the client
 */
export function isClientRealtimeEnabled(): boolean {
  const config = getClientConfig();
  return config.driver !== "disabled" && !!config.key;
}
