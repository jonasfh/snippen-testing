# Snippen Testing

Test-oppsett for integrasjons- og ende-til-ende-testing av Snippen-økosystemet (`snippen-booking`, `snippen-sms-service` og `snippen-doorman-service`).

Repositoryet inneholder en **Fake SMS Provider** og et interaktivt **Web Dashboard** som erstatter eksterne SMS-leverandører under lokal utvikling og automatiserte integrasjonstester. Dette gjør det mulig å verifisere hele meldingsflyten og adgangskontrollen uten å sende reelle SMS eller være avhengig av eksterne tredjepartstjenester.

> 📖 **Detaljert testguide**: For en grundig gjennomgang av webadresser, innloggingsdetaljer og manuelle testscenarier, se **[TESTING.md](TESTING.md)**.

---

## Arkitektur & Kommunikasjonsflyt

```text
┌─────────────────┐
│ snippen-booking │ (WordPress + MariaDB: port 8080)
└────┬───────┬────┘
     │       │ REST (/wp-json/snippen/v1/door/...)
     │       ▼
     │ ┌─────────────────────────┐
     │ │ snippen-doorman-service │ (Python daemon: auto PIN & synkronisering)
     │ └─────────────────────────┘
     │ REST (/wp-json/snippen/v1/sms/...)
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

- **Adgangskontroll & Dørkoder**: `snippen-doorman-service` poller aktive reservasjoner fra `snippen-booking` (`GET /wp-json/snippen/v1/door/bookings`). Dersom en reservasjon mangler dørkode, genereres en 6-sifret sikker PIN som lagres lokalt i SQLite og patches tilbake til WordPress (`PATCH /wp-json/snippen/v1/door/bookings/:id/code`).
- **Utgående SMS**: `snippen-booking` legger meldinger i utboksen (inkludert tildelt dørkode for bekreftelser/påminnelser). `snippen-sms-service` henter utgående meldinger og sender dem til Fake Provider (`POST /messages/outbound`). Status rapporteres tilbake til Booking som `sent`.
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

### Host-first utvikling (`./dev`)

For utvikling direkte fra host-maskinen med live bind-mounts av alle fire repos (`docker-compose.yml` + `docker-compose.dev.yml`) og verktøycontainere (`compose.tools.yml`):

```bash
# Fullstack-orkestrering (alle tjenester med live kildekode)
./dev up                 # Start stack (Booking UI: http://localhost:8081, Fake SMS: http://localhost:3000, BLE Web Config: http://localhost:8082)
./dev down               # Stopp og fjern containere
./dev ps                 # Vis containerstatus
./dev logs [service]     # Følg logger
./dev restart [service]  # Restart stack eller enkelttjeneste

# Testing og linting (kjører i ephemere testing-tools-container)
./dev test               # Kjør enhetstester (npm test)
./dev e2e                # Kjør fullstack E2E-tester (npm run test:e2e)
./dev e2e:doorman        # Kjør doorman E2E-tester (npm run test:e2e:doorman)
./dev lint               # Kjør ESLint + Prettier-sjekk
./dev lint:fix           # Formater med Prettier
./dev shell              # Åpne interaktivt bash-skall i testing-tools
```

`compose.tools.yml` definerer også verktøycontainere (`booking-tools`, `sms-tools`, `doorman-tools`) som brukes av `./dev` i de tilhørende repoene.

### Kjøre full stack med Docker Compose

Start hele stacken (`fake-sms-provider`, `snippen-booking`, `snippen-sms-service` og `snippen-doorman-service`):

```bash
docker compose up --build -d
```

Når containerne er oppe og sunne (`healthy`):

- **Web Frontend Dashboard**: Åpne [http://localhost:3000](http://localhost:3000) i nettleseren.
- **Snippen Booking Admin**: Åpne [http://localhost:8080/wp-admin/](http://localhost:8080/wp-admin/) (`admin` / `admin`).
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

Repositoryet inneholder en ferdig Dev Container-konfigurasjon (`.devcontainer/devcontainer.json`) for VS Code og GitHub Codespaces med automatisk port-videresending av port `3000` og `8080`.

---

## Web Frontend Dashboard

Når Fake SMS Provider kjører, gir [http://localhost:3000](http://localhost:3000) tilgang til:

1. **Meldingsfeed**: Se alle innkommende og utgående meldinger i sanntid med avsender, mottaker, innhold, status og tidsstempel.
2. **SMS-simulator**: Send en simulert innkommende SMS fra et gitt telefonnummer med forhåndsdefinerte hurtigmaler.
3. **Hendelseslogg**: Følg med på serverhendelser, innkommende forespørsler og webhook-kall.
4. **Tilstandsstyring**: Nullstill alle meldinger med ett klikk, eller **pause/gjenoppta** utgående SMS (`503 Service Unavailable`) direkte fra headeren ved testing av alternative SMS-leverandører eller fallback-mekanismer.

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

## API-oversikt

| Metode & Sti              | Beskrivelse                                                      |
| :------------------------ | :--------------------------------------------------------------- |
| `GET /`                   | Web Frontend Dashboard (HTML)                                    |
| `GET /health`             | Helseendepunkt (`200 OK`, inkluderer `paused`-flagg)             |
| `GET /api/status`         | Hente aktiv/pauset-tilstand for Fake SMS Provider                |
| `POST /api/status`        | Sette pause-tilstand (`{ "paused": true \| false }`)             |
| `POST /api/pause`         | Pause utgående SMS (`503 Service Unavailable`)                   |
| `POST /api/resume`        | Gjenoppta utgående SMS                                           |
| `POST /messages/outbound` | Sende utgående SMS fra SMS-tjenesten (`503` når pauset)          |
| `POST /messages/inbound`  | Simulere innkommende SMS fra leietaker                           |
| `GET /messages`           | Hente alle meldinger (støtter filter: `direction`, `to`, `from`) |
| `GET /messages/:id`       | Hente enkeltmelding etter ID                                     |
| `DELETE /messages`        | Nullstille alle meldinger i minnet                               |
| `GET /api/logs`           | Hente nylige server- og webhook-hendelser                        |
| `DELETE /logs`            | Tømme hendelsesloggen                                            |

---

## Testing

For fullstendig veiledning og manuelle testscenarier, se **[TESTING.md](TESTING.md)**.

```bash
# Kjør lokale enhets- og rutetester
npm test

# Kjør automatiserte E2E-integrasjonstester mot Docker Compose-stacken
npm run test:e2e

# Kjør kun Doorman Service E2E-integrasjonstester
npm run test:e2e:doorman

# Kjør alle tester
npm run test:all

# Linting og kodeformatering
npm run lint
npm run format:check
```
