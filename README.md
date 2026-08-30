# Snippen Testing

Test-oppsett for integrasjons- og ende-til-ende-testing av Snippen-økosystemet (`snippen-booking` og `snippen-sms-service`).

## Krav

- Node.js >= 20.0.0
- npm
- Docker (for containerisert kjøring og testing)

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

### Konfigurasjon

Tjenesten konfigureres via miljøvariabler:

| Variabel   | Beskrivelse                             | Standardverdi |
| ---------- | --------------------------------------- | ------------- |
| `PORT`     | Porten HTTP-serveren lytter på          | `3000`        |
| `HOST`     | Vertsadresse å binde serveren til       | `0.0.0.0`     |
| `NODE_ENV` | Kjøremiljø (`development`/`production`) | `development` |

### Helseendepunkt

Når serveren kjører, kan helsestatus sjekkes via:

```bash
curl http://localhost:3000/health
```

Respons (`200 OK`):

```json
{
  "status": "ok",
  "uptime": 1.23,
  "timestamp": "2026-08-30T18:25:29.229Z"
}
```

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
```

## Docker

Bygg og kjør applikasjonen i en Docker-container:

```bash
docker build -t snippen-testing .
docker run -p 3000:3000 snippen-testing
```
