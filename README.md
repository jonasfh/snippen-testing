# Snippen Testing

Test-oppsett for integrasjons- og ende-til-ende-testing av Snippen-økosystemet (`snippen-booking` og `snippen-sms-service`).

Repositoryet inneholder en **Fake SMS Provider** og et interaktivt **Web Dashboard** som erstatter eksterne SMS-leverandører under lokal utvikling og automatiserte integrasjonstester. Dette gjør det mulig å verifisere hele meldingsflyten uten å sende reelle SMS eller være avhengig av eksterne tredjepartstjenester.

## Arkitektur & Kommunikasjonsflyt

```text
┌─────────────────┐
│ snippen-booking │ (WordPress + MariaDB: port 8080)
└────────┬────────┘
         │ HTTP (/wp-json/snippen/v1/sms/...)
         ▼
┌─────────────────────┐
│ snippen-sms-service │ (Python gateway daemon)
└──────────┬──────────┘
           │ SMS API (POST /messages/outbound) & Polling (GET /messages?direction=inbound)
           ▼
┌─────────────────────┐
│  Fake SMS Provider  │ <─── Web Frontend Dashboard (GET / på port 3000)
│  (snippen-testing)  │ <─── E2E Test Suite (npm run test:e2e)
└─────────────────────┘
```

- **Utgående SMS**: `snippen-booking` legger meldinger i utboksen. `snippen-sms-service` henter utgående meldinger og sender dem til Fake Provider (`POST /messages/outbound`). Status rapporteres tilbake til Booking som `sent`.
- **Innkommende SMS**: Meldinger injiseres i Fake Provider via Web Dashboard eller API (`POST /messages/inbound`). `snippen-sms-service` poller innkommende meldinger, slår opp leietaker/booking-kontekst, og synkroniserer meldingen inn i `snippen-booking` (`POST /wp-json/snippen/v1/sms/inbox`).
- **Web Frontend Dashboard**: Gir sanntidsoversikt over meldingsstrømmen, hendelseslogger og et interaktivt simulatorskjema for manuell testing.
- **Inspeksjon & Nullstilling**: Testsuiter og utviklere kan hente lagrede meldinger og logger, samt nullstille tilstand mellom tester (`DELETE /messages`).

---

## Krav

- Node.js >= 20.0.0
- npm
- Docker / Docker Compose

---

## Hurtigstart

### Kjøre full stack med Docker Compose

Start hele stacken (`fake-sms-provider`, `snippen-booking` og `snippen-sms-service`):

```bash
docker compose up --build -d
```

Når containerne er oppe og sunne (`healthy`):

- **Web Frontend Dashboard**: Åpne `http://localhost:3000` i nettleseren.
- **Snippen Booking**: Tilgjengelig på `http://localhost:8080`.
- **Logger**: Følg sanntidslogger med `docker compose logs -f`.

Stopp hele stacken:

```bash
docker compose down
```

### Kjøre Fake SMS Provider lokalt

Installer avhengigheter og start HTTP-tjenesten:

```bash
npm install
npm start
```

For utvikling med automatisk omstart ved filendringer:

```bash
npm run dev
```

### Utvikling i Dev Container

Repositoryet inneholder en ferdig Dev Container-konfigurasjon (`.devcontainer/devcontainer.json`) for VS Code og GitHub Codespaces.

1. Åpne prosjektmappen i VS Code.
2. Trykk `F1` og velg **Dev Containers: Reopen in Container**.
3. VS Code bygger og starter containeren med alle nødvendige verktøy (Node.js, npm, Git, ESLint, Prettier og Docker CLI).

---

## Web Frontend Dashboard

Når Fake SMS Provider kjører, kan du åpne `http://localhost:3000` for å få tilgang til Web Dashboardet:

1. **Meldingsfeed**: Se alle innkommende og utgående meldinger i sanntid med avsender, mottaker, innhold, status og tidsstempel.
2. **SMS-simulator**: Send en simulert innkommende SMS fra et gitt telefonnummer med forhåndsdefinerte hurtigmaler.
3. **Hendelseslogg**: Følg med på serverhendelser, innkommende forespørsler og webhook-kall.
4. **Tilstandsstyring**: Nullstill alle meldinger med ett klikk for å klargjøre systemet til nye tester.

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

### 1. Dashboard & Helse

- **Dashboard UI**: `GET /` (returnerer HTML)
- **Helseendepunkt**: `GET /health` (`200 OK` med `status`, `uptime`, `timestamp`)

### 2. Sende utgående SMS (Fake Provider Send API)

Brukt av `snippen-sms-service` for å levere en SMS:

- **Endepunkt**: `POST /messages/outbound` (alias: `POST /sms/send`, `POST /messages`)
- **Body**:

```json
{
  "to": "+4799887766",
  "text": "Din adgangskode til Snippen er 4821"
}
```

### 3. Simulere innkommende SMS (Injisering)

Brukt for å simulere at en leietaker svarer eller sender en melding:

- **Endepunkt**: `POST /messages/inbound` (alias: `POST /simulate/inbound`)
- **Body**:

```json
{
  "from": "+4799887766",
  "text": "Hei, er det mulig å få to ekstra bord?"
}
```

### 4. Inspisere og hente meldinger

- **Alle meldinger**: `GET /messages` (støtter filtere: `?direction=inbound|outbound`, `?to=...`, `?from=...`)
- **Enkeltmelding etter ID**: `GET /messages/:id`

### 5. Hendelseslogger

- **Hente logger**: `GET /api/logs` (eller `GET /logs`)
- **Tømme logger**: `DELETE /logs`

### 6. Nullstille tilstand (Reset)

Slett alle lagrede meldinger i minnet:

- **Endepunkt**: `DELETE /messages`

---

## Testing & Kvalitetssikring

### Enhetstester & Rutetester

Kjør de lokale enhets- og API-testene:

```bash
npm test
```

### Ende-til-ende (E2E) integrasjonstester

Når Docker Compose-stacken kjører (`docker compose up -d`), kan hele meldingsflyten verifiseres med:

```bash
npm run test:e2e
```

Kjør alle tester:

```bash
npm run test:all
```

### Linting og formatering

```bash
npm run lint
npm run format
npm run format:check
```
