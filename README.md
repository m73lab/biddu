# Biddu 🇨🇱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Docker ready](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](https://github.com/m73lab/biddu/pulls)

Plataforma de subastas **gratuita y de código abierto**, adaptada al contexto chileno y latinoamericano: español e inglés, pesos chilenos ($ CLP) sin decimales, RUT opcional, hora de Chile y notificaciones en español.

Perfecta para remates, recaudación de fondos, clubes deportivos, bomberos, pymes en liquidación y eventos comunitarios. **Sin procesamiento de pagos**: todas las transacciones se liquidan offline entre los participantes, la plataforma solo lleva el registro.

> Fork comunitario de [Auktiva](https://github.com/thomsa/auktiva) (MIT, por Tamas Lorincz), con foco en Latinoamérica y autoalojo simple.

## Características

### Gestión de subastas

- **Subastas ilimitadas**: privadas (solo invitados), por enlace o abiertas
- **Roles por miembro**: Dueño (control total), Admin (gestiona miembros y lotes), Creador (sus propios lotes), Postor (puja)
- **Tiempos flexibles**: cierre global o por lote, con fechas individuales
- **Anti-sniping**: el cierre se extiende si alguien puja al final

### Pujas en tiempo real

- **WebSocket auto-alojado** (Soketi) o Pusher, con modo sin realtime
- **Pujas anónimas**: visibles, anónimas o a elección del postor
- **Multi-moneda** con CLP incluido, formato es-CL (`$1.500.000`)
- **Topes configurables**: puja inicial, incremento mínimo y máxima anti-bromas por lote

### Lotes

- Galerías de imágenes (local o S3) y descripciones enriquecidas
- **Importación por CSV** + edición masiva
- Cierres individuales por lote dentro de la misma subasta

### Personas y notificaciones

- Registro con email/contraseña, Google y Microsoft (OAuth opcional)
- Verificación de email, RUT chileno y WhatsApp opcionales
- **Notificaciones in-app** (superación de puja, premios, nuevos lotes, invitaciones)
- **Correos en español** (Brevo, SMTP o Amazon SES) con reintentos y cola
- Contacto con el ganador por email o WhatsApp
- Registro offline de pago y entrega: pendiente, pagado, entregado

### Operación

- **Autoalojo con Docker** en minutos (SQLite por defecto, sin dependencias externas obligatorias)
- Backups y logs en volúmenes persistentes, healthcheck incluido
- Rate limiting, reCAPTCHA opcional, modo mantenimiento
- Interfaz bilingüe (es/en), modo claro/oscuro y navegación móvil dedicada

## Inicio rápido (Docker, recomendado)

```bash
cp .env.example .env
# Edita .env: genera AUTH_SECRET (ver abajo) y ajusta URLs y correo
docker compose up -d --build
```

Genera los secretos así:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # CRON_SECRET
```

| Servicio | Puerto | Descripción |
|---|---|---|
| `biddu` | 3000 | Aplicación Next.js |
| `biddu-caddy` | 80 / 443 | Reverse proxy con HTTPS local |
| `soketi` | 6001 | WebSocket realtime (opcional) |

Datos persistentes en volúmenes Docker: base SQLite (`biddu-data`), uploads (`biddu-uploads`) y logs (`biddu-logs`). Las migraciones Prisma se aplican solas al arrancar (servicio `migrate`, antes de la app), así que un volumen nuevo queda operativo sin pasos manuales.

### Primera entrada (sin credenciales por defecto)

Un despliegue nuevo **no trae usuarios ni contraseñas**. Al abrir la app redirige a `/setup`, donde creas la cuenta administradora (queda verificada y como admin del despliegue). Funciona con o sin correo configurado; después el asistente se desactiva solo.

Para despliegues automatizados puedes sembrar el admin por variables en `.env`:

```bash
INITIAL_ADMIN_EMAIL="admin@tu-dominio.cl"
# INITIAL_ADMIN_PASSWORD="..."  # opcional: si la omites se genera una
                                # y se muestra UNA vez en los logs
```

Sin proveedor de correo (`EMAIL_PROVIDER` vacío) el login sigue funcionando, pero la verificación por email, el reseteo de contraseña y las notificaciones no pueden enviarse: el registro y el login avisan de esto en pantalla en vez de prometer correos que nunca llegan.

## Configuración

Toda la configuración vive en `.env` (ver `.env.example`, que documenta cada opción). Lo esencial:

| Variable | Descripción |
|---|---|
| `AUTH_SECRET` | **Requerido.** Secreto de sesiones (generar con openssl) |
| `DATABASE_URL` | SQLite por defecto (`file:./data/biddu.db`); acepta Turso (`libsql://…`) o PostgreSQL |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (para enlaces de correos) |
| `EMAIL_PROVIDER` | `brevo`, `smtp`, `ses` o vacío (sin correos) |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Remitente de los correos |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (opcional; sin esto no se muestra el botón) |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | OAuth Microsoft (opcional) |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | reCAPTCHA en registro (opcional) |
| `NEXT_PUBLIC_REALTIME_DRIVER` | `soketi`, `pusher` o `disabled` |
| `STORAGE_PROVIDER` | `local` o `s3` (+ credenciales `S3_*`) |
| `ALLOW_OPEN_AUCTIONS` | `true` permite subastas abiertas; en nube se usa `false` |
| `CRON_SECRET` | Protege los endpoints de cron/reintentos de correo |
| `CADDY_DOMAIN` | Dominio/IP para el TLS local (default `192.168.1.16`) |

## Desarrollo local

Requisitos: Node.js 20+ (recomendado 22, ver `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:3000
```

Comandos útiles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run dev:realtime` | Dev + Soketi en Docker |
| `npm run build` / `npm start` | Build de producción / servirlo |
| `npm run lint` / `npm run format` | ESLint / Prettier (hay pre-commit con husky) |
| `npm run db:push` | Sincroniza el schema Prisma con la DB |
| `npm run db:studio` | Prisma Studio (explorar datos) |
| `npm run db:seed` | Datos de prueba (ver `prisma/seed*.ts`) |

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (Pages Router), React 19, Tailwind CSS 4 + DaisyUI 5 |
| i18n | next-intl (es/en), zona horaria America/Santiago |
| Auth | NextAuth.js (credenciales, Google, Microsoft) |
| DB | Prisma 7 + SQLite (Turso/PostgreSQL soportados) |
| Realtime | Soketi o Pusher (opcional) |
| Correo | MJML + Brevo / SMTP / SES, con cola y reintentos |
| Archivos | Local o S3-compatible |

Estructura del repositorio (resumen):

```
src/
  pages/         # Rutas (Pages Router) + API routes
  components/    # UI: auction, auth, item, landing, layout, ...
  lib/           # auth, email, prisma, realtime, storage, rate-limit
  contexts/      # App, notificaciones
  i18n/          # Configuración de idiomas
messages/        # Traducciones es/en por dominio
prisma/          # Schema + seeds + migraciones
public/          # Estáticos y uploads (volumen en Docker)
caddy/           # Caddyfile para TLS local
```

## Contribuir

¡PRs bienvenidos! Flujo: fork → rama (`feat/…`, `fix/…`, `docs/…`) → PR a `main` con descripción del problema y la solución. Usa [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`…) y corre `npm run lint` + `npm run format` antes de pushear.

## Licencia y origen

MIT — ver [`LICENSE`](LICENSE). Fork comunitario de [Auktiva](https://github.com/thomsa/auktiva) por Tamas Lorincz, adaptado al contexto chileno y latinoamericano.

> Este repo es el núcleo 100% open-source y sin límites, pensado para autoalojo. La operación de nube gestionada (cuotas, retención, scheduler) vive en un despliegue privado separado.
