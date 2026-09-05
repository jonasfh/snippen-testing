# Testguide for Snippen Testing

Denne guiden beskriver hvordan du tester integrasjonen og meldingsflyten i Snippen-økosystemet, både manuelt via nettleseren og automatisk via test-suitene.

---

## Tjenester og Nettlesertilgang

Når hele stacken kjører med Docker Compose (`docker compose up -d`), er følgende webgrensesnitt tilgjengelige:

| Tjeneste                     | URL i nettleseren                                                                                                              | Innlogging / Beskrivelse                                                           |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **Fake SMS Dashboard**       | [http://localhost:3000](http://localhost:3000)                                                                                 | Ingen innlogging nødvendig. Sanntidsvisning av meldinger, logger og SMS-simulator. |
| **Snippen Booking Admin**    | [http://localhost:8080/wp-admin/](http://localhost:8080/wp-admin/)                                                             | **Brukernavn:** `admin`<br>**Passord:** `admin`                                    |
| **Snippen Booking Oversikt** | [http://localhost:8080/wp-admin/admin.php?page=snippen-booking](http://localhost:8080/wp-admin/admin.php?page=snippen-booking) | Booking-liste og kommunikasjonshistorikk for hver booking.                         |
| **WordPress Forside**        | [http://localhost:8080/](http://localhost:8080/)                                                                               | Beboerinnlogging: `test.guest` / `demo123` (Telefon: `+4799887766`).               |

---

## Manuelle Testscenarier

### 1. Teste SMS-simulator og Innboks i Snippen Booking

Dette scenariet tester at en innkommende SMS fra en leietaker mottas i simulatoren, synkroniseres av SMS-tjenesten og knyttes til riktig booking i WordPress.

1. **Åpne Test Dashboardet**: Gå til [http://localhost:3000](http://localhost:3000).
2. **Send en innkommende SMS**:
   - I **SMS-simulator**-skjemaet på venstre side er avsender forhåndsutfylt med testbeboerens nummer: `+4799887766`.
   - Skriv en meldingstekst, eller klikk på en hurtigmal (f.eks. _"Takk for koden!"_ eller _"Kan vi få to ekstra bord?"_).
   - Klikk på **📤 Send innkommende SMS**.
3. **Observer flyten i Dashboardet**:
   - Meldingen dukker opp i meldingslisten merket **📥 INNKOMMENDE** med grønn status.
   - Hendelsesloggen viser at meldingen er registrert og at webhook-leveransen til `snippen-sms-service` er utført.
4. **Verifiser i Snippen Booking**:
   - Åpne [Snippen Booking Oversikt](http://localhost:8080/wp-admin/admin.php?page=snippen-booking).
   - Finn bookingen for **Ola Nordmann (E2E Test)** og åpne/utvid raden.
   - Under **Kommunikasjonshistorikk** vil du se at leietakerens SMS har blitt mottatt og automatisk knyttet til den aktuelle bookingen.

---

### 2. Teste Utgående SMS fra Snippen Booking til Dashboardet

Dette scenariet tester at en SMS generert av booking-pluginen sendes via SMS-tjenesten og fanges opp av Fake SMS Provider.

1. **Send eller trigg en SMS fra WordPress**:
   - Gå inn på [Snippen Booking Oversikt](http://localhost:8080/wp-admin/admin.php?page=snippen-booking).
   - Utfør en handling som genererer en SMS (eller opprett/bekreft en booking for testbrukeren med telefon `+4799887766`).
2. **Observer levering i Fake SMS Dashboard**:
   - I [Test Dashboard](http://localhost:3000) vil meldingen dukke opp under **Meldinger** merket **📤 UTGÅENDE** innen få sekunder.
   - `snippen-sms-service` rapporterer automatisk statusen tilbake til WordPress slik at meldingen markeres som levert/sendt i kommunikasjonshistorikken i WordPress.

---

## Automatiserte Tester

Repositoryet inneholder både raske enhets- og API-tester (uten eksterne avhengigheter) og en fullstendig ende-til-ende (E2E) integrasjonstestsuite.

### 1. Enhets- og rutetester

Kjøres lokalt med Node.js innebygde test-runner:

```bash
npm test
```

For kontinuerlig testkjøring under utvikling:

```bash
npm run test:watch
```

### 2. Ende-til-ende (E2E) integrasjonstester

E2E-testene verifiserer fullstendig meldingsflyt over hele stacken (`snippen-booking` + `snippen-sms-service` + `fake-sms-provider`).

1. Sørg for at Docker Compose-stacken kjører:

```bash
docker compose up -d
```

2. Kjør E2E-testsuiten:

```bash
npm run test:e2e
```

3. Kjør alle tester (både enhets- og E2E-tester):

```bash
npm run test:all
```

---

## Kodekvalitet og Linting

Før koden committes skal formatering og linting passere uten feil eller advarsler:

```bash
# Sjekk formatering med Prettier
npm run format:check

# Automatisk formatering
npm run format

# Kjør ESLint
npm run lint
```

---

## Docker Compose Hjelpekommandoer

| Handling                                 | Kommando                                                                                                                               |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Starte hele stacken**                  | `docker compose up --build -d`                                                                                                         |
| **Følge sanntidslogger**                 | `docker compose logs -f`                                                                                                               |
| **Logger for spesifikk tjeneste**        | `docker compose logs -f fake-sms-provider`<br>`docker compose logs -f snippen-sms-service`<br>`docker compose logs -f snippen-booking` |
| **Nullstille meldinger i Fake Provider** | `curl -X DELETE http://localhost:3000/messages` (eller via knappen i Dashboardet)                                                      |
| **Stoppe stacken**                       | `docker compose down`                                                                                                                  |
