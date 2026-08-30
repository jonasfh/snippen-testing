# Snippen Testing

Test-oppsett for integrasjons- og ende-til-ende-testing av Snippen-økosystemet (`snippen-booking` og `snippen-sms-service`).

Repositoryet inneholder en **Fake SMS Provider** som erstatter eksterne SMS-leverandører under lokal utvikling og automatiserte integrasjonstester. Dette gjør det mulig å verifisere hele meldingsflyten uten å sende reelle SMS eller være avhengig av eksterne tredjepartstjenester.

## Arkitektur

```text
┌─────────────────┐
│ snippen-booking │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────────┐
│ snippen-sms-service │
└──────────┬──────────┘
           │ SMS API / Webhook
           ▼
┌─────────────────────┐
│  Fake SMS Provider  │  <─── Test suite (injiser/inspiser/nullstill)
└─────────────────────┘
```

- **Utgående SMS**: `snippen-sms-service` sender SMS til fake provider via HTTP. Meldingen lagres i minnet og tildeles en unik ID.
- **Innkommende SMS**: Tester kan simulere innkommende SMS fra en leietaker. Fake provider lagrer meldingen og kaller webhook-endepunktet til `snippen-sms-service`.
- **Inspeksjon & Nullstilling**: Testsuiter kan hente lagrede meldinger filtrert på retning/avsender/mottaker, eller nullstille all tilstand mellom tester.

---

## Krav

- Node.js >= 20.0.0
- npm
- Docker / Docker Compose

---

## Hurtigstart

### Kjøre lokalt

Installer avhengigheter og start HTTP-tjenesten:

```bash
npm install
npm start
```

For utvikling med automatisk omstart ved filendringer:

```bash
npm run dev
```

### Kjøre med Docker Compose

Start Fake SMS Provider som en container-tjeneste:

```bash
docker compose up -d
```

Sjekk logger:

```bash
docker compose logs -f
```

Stopp tjenesten:

```bash
docker compose down
```

### Utvikling i Dev Container

Repositoryet inneholder en ferdig Dev Container-konfigurasjon (`.devcontainer/devcontainer.json`) for VS Code og GitHub Codespaces.

1. Åpne prosjektmappen i VS Code.
2. Trykk `F1` og velg **Dev Containers: Reopen in Container**.
3. VS Code bygger og starter containeren med alle nødvendige verktøy (Node.js, npm, Git, ESLint, Prettier og Docker CLI).

---

## Konfigurasjon

Tjenesten konfigureres via miljøvariabler:

| Variabel                  | Beskrivelse                                    | Standardverdi                       |
| ------------------------- | ---------------------------------------------- | ----------------------------------- |
| `PORT`                    | Porten HTTP-serveren lytter på                 | `3000`                              |
| `HOST`                    | Vertsadresse å binde serveren til              | `0.0.0.0`                           |
| `NODE_ENV`                | Kjøremiljø (`development`/`production`/`test`) | `development`                       |
| `SMS_SERVICE_WEBHOOK_URL` | Webhook-URL for levering av innkommende SMS    | `http://127.0.0.1:3001/webhook/sms` |

---

## API-dokumentasjon

### 1. Helseendepunkt

Sjekk om tjenesten kjører.

- **Endepunkt**: `GET /health`
- **Respons** (`200 OK`):

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-08-30T18:30:00.000Z"
}
```

### 2. Sende utgående SMS (Fake Provider Send API)

Brukt av `snippen-sms-service` for å sende en SMS til en mottaker.

- **Endepunkt**: `POST /messages/outbound` (alias: `POST /sms/send`, `POST /messages`)
- **Body**:

```json
{
  "to": "+4799887766",
  "text": "Din adgangskode til Snippen er 4821"
}
```

- **Respons** (`201 Created`):

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "direction": "outbound",
  "to": "+4799887766",
  "from": "Snippen",
  "text": "Din adgangskode til Snippen er 4821",
  "status": "sent",
  "createdAt": "2026-08-30T18:31:00.000Z",
  "metadata": {}
}
```

### 3. Simulere innkommende SMS (Injisering)

Brukt av automatiserte integrasjonstester for å simulere at en leietaker sender en SMS. Tjenesten lagrer meldingen og videresender den via webhook til `snippen-sms-service`.

- **Endepunkt**: `POST /messages/inbound` (alias: `POST /simulate/inbound`)
- **Body**:

```json
{
  "from": "+4799887766",
  "text": "Hei, er det mulig å få to ekstra bord?"
}
```

- **Respons** (`201 Created`):

```json
{
  "message": {
    "id": "e3b0c442-98fc-1c14-9afbf4c8996fb924",
    "direction": "inbound",
    "from": "+4799887766",
    "to": null,
    "text": "Hei, er det mulig å få to ekstra bord?",
    "status": "received",
    "createdAt": "2026-08-30T18:32:00.000Z",
    "metadata": {}
  },
  "webhook": {
    "url": "http://127.0.0.1:3001/webhook/sms",
    "delivered": true,
    "status": 200,
    "error": null
  }
}
```

### 4. Inspisere meldinger

Hent alle lagrede meldinger med støtte for filtrering.

- **Endepunkt**: `GET /messages`
- **Filter-parametere** (valgfritt):
  - `direction`: `inbound` eller `outbound`
  - `to`: Mottakertelefonnummer
  - `from`: Avsendertelefonnummer

Eksempel:

```bash
# Hent alle utgående meldinger
curl "http://localhost:3000/messages?direction=outbound"

# Hent meldinger til et spesifikt nummer
curl "http://localhost:3000/messages?to=%2B4799887766"
```

- **Respons** (`200 OK`):

```json
{
  "messages": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "direction": "outbound",
      "to": "+4799887766",
      "from": "Snippen",
      "text": "Din adgangskode til Snippen er 4821",
      "status": "sent",
      "createdAt": "2026-08-30T18:31:00.000Z",
      "metadata": {}
    }
  ],
  "count": 1
}
```

### 5. Hente enkeltmelding etter ID

- **Endepunkt**: `GET /messages/:id`
- **Respons** (`200 OK`):

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "direction": "outbound",
  "to": "+4799887766",
  "from": "Snippen",
  "text": "Din adgangskode til Snippen er 4821",
  "status": "sent",
  "createdAt": "2026-08-30T18:31:00.000Z",
  "metadata": {}
}
```

Dersom meldingen ikke finnes: `404 Not Found` med `{"error": "Message not found"}`.

### 6. Nullstille tilstand (Reset)

Slett alle lagrede meldinger i minnet for å klargjøre provideren før eller etter en test.

- **Endepunkt**: `DELETE /messages`
- **Respons** (`200 OK`):

```json
{
  "message": "All messages cleared",
  "count": 5
}
```

---

## Testing & Kvalitetssikring

Kjør automatiserte tester med Node.js innebygde test-runner:

```bash
npm test
```

For kontinuerlig testkjøring:

```bash
npm run test:watch
```

Kjør linting og formatering:

```bash
npm run lint
npm run format
npm run format:check
```

---

## Docker

Bygg og kjør applikasjonen i en frittstående Docker-container:

```bash
docker build -t snippen-testing .
docker run -p 3000:3000 snippen-testing
```
