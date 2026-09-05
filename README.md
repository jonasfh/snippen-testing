# Snippen Testing

Test-oppsett for integrasjons- og ende-til-ende-testing av Snippen-økosystemet (`snippen-booking` og `snippen-sms-service`).

Repositoryet inneholder en **Fake SMS Provider** og et interaktivt **Web Dashboard** som erstatter eksterne SMS-leverandører under lokal utvikling og automatiserte integrasjonstester. Dette gjør det mulig å verifisere hele meldingsflyten uten å sende reelle SMS eller være avhengig av eksterne tredjepartstjenester.

> 📖 **Detaljert testguide**: For en grundig gjennomgang av webadresser, innloggingsdetaljer og manuelle testscenarier, se **[TESTING.md](TESTING.md)**.

---

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

## API-oversikt

| Metode & Sti              | Beskrivelse                                                      |
| :------------------------ | :--------------------------------------------------------------- |
| `GET /`                   | Web Frontend Dashboard (HTML)                                    |
| `GET /health`             | Helseendepunkt (`200 OK`)                                        |
| `POST /messages/outbound` | Sende utgående SMS fra SMS-tjenesten                             |
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

# Kjør alle tester
npm run test:all

# Linting og kodeformatering
npm run lint
npm run format:check
```
