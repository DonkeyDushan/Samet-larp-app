# Sametový LARP — engine mezikapitolových událostí

Interní nástroj organizátorů. Zpracovává dotazníky vyplněné hráči na konci každé
ze tří kapitol, deterministicky přepočítává vnitřní stav postav a generuje
materiály pro další kapitolu.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy hry, 3–5 uživatelů.

Kompletní zadání je v [zadani-larp-engine.md](zadani-larp-engine.md) — **to je zdroj
pravdy**. Architektonická pravidla, která platí v každé session, jsou v
[CLAUDE.md](CLAUDE.md).

## Stav projektu

Hotové je datové schéma a typy enginu. Engine, import `.xlsx` ani rozhraní ještě
nestojí — viz harmonogram v §15.1 zadání.

## Co je potřeba mít

- **Node.js 22** (viz `.nvmrc`). Na CachyOS: `sudo pacman -S nodejs npm`,
  nebo přes [fnm](https://github.com/Schniz/fnm) / nvm.
- **Docker** pro lokální Postgres — nebo dev větev na [Neonu](https://neon.tech),
  pak Docker není potřeba.

## Lokální spuštění

```bash
# 1) závislosti
npm install

# 2) prostředí
cp .env.example .env        # DATABASE_URL míří na lokální Postgres z docker-compose

# 3) databáze
docker compose up -d        # Postgres na portu 5433
npm run db:generate         # vygeneruje migraci ze schématu do drizzle/
npm run db:migrate          # aplikuje migrace
npm run db:sql              # doplní SQL, které Drizzle neumí (append-only audit)
npm run db:seed             # ukázková data: běh 2026-09-12_A, Marie Balážová

# 4) aplikace
npm run dev                 # http://localhost:3000
```

Při vývoji schématu je rychlejší cesta `npm run db:setup` (= `db:push` + `db:sql`),
která schéma nasype do databáze bez generování migrace. Migraci vygeneruj, až
bude tvar schématu ustálený — do produkce jde jen `db:migrate`.

## Skripty

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | Next.js v dev režimu |
| `npm run build` / `start` | produkční build a jeho spuštění |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, včetně kontroly, že engine nesahá do DB a Reactu |
| `npm test` | Vitest — primárně engine pravidel |
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
scripts/             seed a pomocné skripty
drizzle/             vygenerované migrace (vzniknou po npm run db:generate)
```

## Nasazení

Vercel propojený s GitHub repem, `git push` = nasazeno. Databáze Neon (Postgres).
V produkci je potřeba nastavit `DATABASE_URL` a `APP_PASSWORD`.

Verze 1 **nemá žádné napojení na Google** a komunikuje se světem výhradně přes
nahrané a stažené soubory: `.xlsx` a `.md` dovnitř, `.zip` s `.md` dokumenty ven.
