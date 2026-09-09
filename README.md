# Biddu 🇨🇱

Plataforma de subastas gratuita y de código abierto, adaptada al contexto chileno y latinoamericano: español, pesos chilenos ($ CLP), RUT opcional, hora de Chile y notificaciones en español.

Fork comunitario de [Auktiva](https://github.com/thomsa/auktiva) (MIT, por Tamas Lorincz). Licencia: MIT (ver `LICENSE`).

## Qué incluye

- Subastas privadas o abiertas, con roles (owner/admin/creador/pujador)
- Pujas en tiempo real (Soketi), pujas anónimas, anti-snipe
- Lotes con fotos, importación CSV, edición masiva
- Registro de pago y entrega **offline** (sin pasarelas ni comisiones)
- Invitaciones por correo, notificaciones in-app y por email
- Contacto con el ganador (email o WhatsApp)
- RUT y teléfono opcionales, CLP sin decimales

## Autoalojo rápido

```bash
cp .env.example .env   # configura AUTH_SECRET, URLs y SMTP
docker compose up -d --build
```

Requiere Docker. Variables clave en `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `MAIL_FROM`, `CRON_SECRET`.

## Desarrollo

```bash
npm install
npm run dev
```

Stack: Next.js (Pages Router) + Prisma + SQLite + next-intl + Soketi.

## Estructura cloud vs open

Este repo es el núcleo 100% open-source, sin límites. La operación de la nube (cuotas, retención, scheduler, landing comercial) vive en un despliegue privado separado.
