# Sametový LARP — engine mezikapitolových událostí

Interní nástroj organizátorů. Zpracovává dotazníky vyplněné hráči na konci každé
ze tří kapitol, deterministicky přepočítává vnitřní stav postav a generuje
materiály pro další kapitolu.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy hry, 3–5 uživatelů.

Kompletní zadání je v [zadani-larp-engine.md](zadani-larp-engine.md) — **to je zdroj
pravdy**. Architektonická pravidla, která platí v každé session, jsou v
[CLAUDE.md](CLAUDE.md).

## Stav projektu

Hotové je datové schéma (24 tabulek, migrace aplikovaná a odzkoušená) a typy
enginu. Engine, import `.xlsx` ani rozhraní ještě nestojí — viz harmonogram
v §15.1 zadání.

## Co je potřeba mít

- **Node.js 22** (viz `.nvmrc`). Přes nvm: `nvm install`.
- **Postgres pro lokální vývoj** — jedna ze tří cest:
  - **nainstalovaný Postgres bez Dockeru** (`sudo pacman -S postgresql`) a cluster
    pod tvým uživatelem, viz `scripts/pg.sh` níže. Nepotřebuje root ani systemd
    službu, celý cluster je v `~/.local/share/samet-larp/`.
  - **Docker** a `docker compose up -d` podle `docker-compose.yml`.
  - **dev větev na [Neonu](https://neon.tech)** — pak stačí `DATABASE_URL` v `.env`.

Všechny tři varianty poslouchají na portu **5433**, takže `.env` platí pro kteroukoli.

## Lokální spuštění

```bash
# 1) závislosti
nvm install                 # Node podle .nvmrc
npm install

# 2) prostředí
cp .env.example .env

# 3) databáze — varianta bez Dockeru
npm run pg init             # založí cluster, spustí ho a vyrobí databázi samet_larp
#    nebo varianta s Dockerem
docker compose up -d

# 4) schéma a data
npm run db:migrate          # aplikuje migrace z drizzle/
npm run db:sql              # doplní SQL, které Drizzle neumí (append-only audit)
npm run db:seed             # ukázková data: běh 2026-09-12_A, Marie Balážová

# 5) aplikace
npm run dev                 # http://localhost:3000
```

Cluster se pak ovládá `npm run pg start` / `stop` / `status`, a `npm run pg psql`
otevře konzoli nad `samet_larp`. Autentizace je `trust` na loopbacku — heslo
v `DATABASE_URL` server ignoruje.

Po každé změně schématu: `npm run db:generate` vyrobí novou migraci, `npm run
db:migrate` ji aplikuje. Při rychlém experimentování se schématem jde použít
`npm run db:setup` (= `db:push` + `db:sql`), která schéma nasype do databáze bez
migrace — ale do gitu patří vygenerovaná migrace, ne pushnuté schéma.

## Skripty

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | Next.js v dev režimu |
| `npm run build` / `start` | produkční build a jeho spuštění |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, včetně kontroly, že engine nesahá do DB a Reactu |
| `npm test` | Vitest — primárně engine pravidel |
| `npm run pg init` / `start` / `stop` / `status` / `psql` | lokální Postgres cluster bez Dockeru |
| `npm run db:generate` | vygeneruje SQL migraci z Drizzle schématu |
| `npm run db:migrate` | aplikuje migrace |
| `npm run db:push` | nasype schéma do DB bez migrace (jen pro vývoj) |
| `npm run db:sql` | pustí ruční SQL z `db/sql/` (idempotentní) |
| `npm run db:seed` | naplní ukázkový běh |
| `npm run db:studio` | Drizzle Studio nad databází |

## Struktura

```
src/
├── engine/          čistá funkce evaluate + typy. Bez DB, sítě a Reactu.
├── db/
│   ├── schema/      Drizzle schéma — jediný zdroj pravdy o struktuře DB
│   ├── client.ts    připojení; jediné místo vázané na poskytovatele Postgresu
│   ├── run-scope.ts přístup k datům, který vyžaduje runId
│   └── index.ts     veřejné rozhraní datové vrstvy (bez neomezeného spojení)
└── app/             Next.js App Router — rozhraní, zatím jen zástupná stránka

db/sql/              ruční SQL mimo Drizzle (append-only audit)
scripts/             seed, správa lokálního Postgresu, pomocné skripty
drizzle/             vygenerované migrace — patří do gitu
```

## Nasazení

Vercel propojený s GitHub repem, `git push` = nasazeno. Databáze Neon (Postgres).
V produkci je potřeba nastavit `DATABASE_URL` a `APP_PASSWORD`.

Verze 1 **nemá žádné napojení na Google** a komunikuje se světem výhradně přes
nahrané a stažené soubory: `.xlsx` a `.md` dovnitř, `.zip` s `.md` dokumenty ven.
