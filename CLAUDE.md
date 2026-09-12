# CLAUDE.md

Interní webová aplikace pro organizátory LARPu: zpracuje dotazníky z konce
kapitoly, přepočítá stav postav a vygeneruje materiály pro další kapitolu.

**Zdroj pravdy o zadání je `zadani-larp-engine.md`.** Sekce označené
`[ROZHODNUTO]` se neotevírají znovu. Tenhle soubor je jen shrnutí pravidel,
která platí v každé session.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy, 3–5 uživatelů,
deadline ~3 měsíce. Objem dat je malý — **optimalizuj na srozumitelnost, ne na výkon.**

## Tři architektonická pravidla

### 1. Engine pravidel je čistá funkce

```ts
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Žije v `src/engine/`. **Bez databáze, bez sítě, bez Reactu, bez importů z `app/`.**
Musí jít otestovat na desítkách scénářů bez rozjetí aplikace. ESLint to hlídá
(`no-restricted-imports` v `eslint.config.mjs`) — když to pravidlo začne
překážet, není chyba v ESLintu.

`trace[]` je zároveň podkladem pro vysvětlení „proč" v UI. Nese **data
s popisky, ne hotovou větu** — formulace je věc UI a musí jít změnit bez
přepočítávání. Kdyby engine sahal do databáze, ztratíš testovatelnost i trace.

**Tohle je nejdůležitější pravidlo v celém projektu.**

### 2. `run_id` je v každé tabulce a v každém dotazu

Dva běhy hry běží současně a jejich data se **nesmí potkat**.

- Každá tabulka s herními daty nese `run_id` (kontroluje test `src/db/schema.test.ts`).
- Každý odkaz uvnitř běhu je **složený cizí klíč** `(run_id, id)`. Databáze sama
  odmítne odpověď z běhu A navázanou na otázku z běhu B.
- Aplikační kód se k datům dostává **výhradně přes `forRun(runId)`**
  (`src/db/run-scope.ts`). Neomezené spojení `unscopedDb` není v
  `src/db/index.ts` exportované; smí ho importovat jen skripty (seed, záloha,
  migrace) a je to v diffu vidět.
- Chybí-li dotaz, který `RunScope` neumí, přidej metodu **do `RunScope`**,
  ne obcházení v aplikaci.

Izolace drží **strukturou kódu, ne kázní.**

V UI platí navíc: přepínač běhu trvale v hlavičce, **odlišná barva rozhraní pro
každý běh** (A modrá, B jantarová), potvrzovací dialogy vždy jmenují běh,
název běhu je v názvu každého exportu.

### 3. Nic se nepřepisuje destruktivně

- Každý přepočet je **nový řádek** v `computations`, nikdy update. Dry-run jde
  pustit stokrát.
- Stav postav je snapshot na kapitolu s vazbou na verzi přepočtu
  (`computation_id`). Nepřepisuje se.
- Nová šablona nebo konfigurace = nová verze, stará zůstává.
- Všechny cizí klíče jsou `on delete restrict`. **Archivovaný běh se nikdy nemaže.**
- `audit_log` je **append-only** a vynucuje to databázový trigger
  (`db/sql/001_audit_append_only.sql`), ne jen konvence. U každé změny je
  zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po
  a které pravidlo změnu způsobilo.

Jediné místo, které smí mazat, je seed skript — a jen svůj vlastní lokální běh.

## Technologie [ROZHODNUTO]

| Vrstva | Volba |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Databáze | Postgres (Neon), lokálně Docker |
| ORM | Drizzle |
| UI | Tailwind, vlastní jednoduché komponenty |
| Testy | Vitest, primárně na engine pravidel |
| Import tabulek | SheetJS (`xlsx`) |
| Zip | `jszip` |
| Hosting | Vercel |

**Žádné Google API.** Verze 1 komunikuje se světem výhradně přes nahrané
a stažené soubory: `.xlsx` a `.md` dovnitř, `.zip` ven. Napojení na Google je
fáze 2 a **nikdy nenahradí** souborovou cestu.

PDF se negeneruje — tiskne se z Google Docs.

## Doménová pravidla, na která se snadno zapomene

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích.** Ořez se loguje do
  auditu a hlásí v trace — je to signál špatně nastavených vah, ne detail.
- **Pásma škál mají prahy i názvy v datech, nikdy v kódu.** Výchozí rozdělení
  1–3 / 4–5 / 6–8 / 9–10, ale počet i hranice jsou per škála a názvy jsou
  vlastní pro každou škálu.
- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem.
  Přepočet **nelze spustit**, dokud něco chybí; aplikace vypíše seznam
  chybějících. Žádné tiché doplňování na pozadí. Nikdy.
- **Otázky jsou vlastní pro každou postavu.** Žádná sdílená sada, ~3 otázky na
  postavu a kapitolu. Volby odpovědí, které jmenují jinou postavu, odkazují na
  **ID postavy z registru**, ne na volný text — po sňatku se jinak provázání rozpadne.
- **Náhoda se hodí jednou a uloží.** Přepočet hod **neopakuje**, použije uloženou
  hodnotu. Přehodit nebo přepsat lze jen ruční akcí orga, která jde do auditu
  včetně staré hodnoty. Engine nikdy negeneruje náhodu sám — dostane ji na vstupu.
- **Podmínky pravidel neparsuj z textu.** Ukládej strukturovaně
  (subjekt, operátor, hodnota, spojka, skupina). **Vlastní jazyk na výrazy nepiš
  nikdy.** Kdyby to bylo neúnosně kostrbaté, teprve pak malá knihovna (`expr-eval`).
- **Vyloučení (negace) má vždy přednost před přiřazením.** Pořadí vyhodnocení je
  fixní: sběr odpovědí → vyloučení → efekty podle priority sestupně → pásma →
  detekce zbylých konfliktů.
- **Dvě pravidla se stejnou prioritou a protichůdným výsledkem engine neřeší** —
  vyhodí konflikt do UI a nechá rozhodnout orga.
- **Postavy se nemodelují nad rámec škál, příznaků a členství.** Charakterizace
  („závislý na piku") žije v pevném textu šablony, kterého se engine nedotkne.
- **Šablony se plní mazáním, ne vkládáním.** Šablona obsahuje všechny varianty
  odstavců; aplikace maže ty, které engine nevybral. Značky jsou párové
  `{BLOK <ID>}` … `{/BLOK}` plus `{PROMENNA}`. **Vnořené bloky nepodporovat.
  Žádná značka nesmí přežít do výsledného dokumentu** — zbylá značka je chyba.
- **Jméno postavy nikdy natvrdo v textech.** Sňatek mění příjmení; všude
  `{JMENO}` / `{PRIJMENI}`, rozvine se až při naplnění dokumentu. Totéž platí
  pro názvy skupin a funkcí.
- **Kaskáda:** změna odpovědi ve vydané kapitole označí následující kapitoly jako
  `dotčené`. Aplikace **sama nic nepřepočítá** — vynutí si rozhodnutí orga
  (přepočítat / ponechat jak je). Během hry je zdrojem pravdy **papír v rukou
  hráče**, ne databáze.
- **Uzamčení kapitoly není nikdy nevratné.** Stav `vydaná` je měkká pojistka
  proti překlepu; editace vyžaduje potvrzení a důvod, obojí do auditu.
- **„Běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací.

## Jazyk a pojmenování

- UI a data jsou **česky**, včetně diakritiky v exportech.
- Tabulky, sloupce a identifikátory v kódu jsou **anglicky** (`character_scale_values`).
- Hodnoty doménových stavů jsou **česky bez diakritiky** (`rozpracovana`,
  `spocitana`, `vydana`, `prepocet`, `rucni_uprava`) — aby se v SQL literálech
  nemíchala diakritika.
- Komentáře a dokumentace česky. Komentář vysvětluje **proč**, ne co kód dělá.

## Konvence ID ze zdrojové tabulky

| Typ | Vzor | Příklad |
|---|---|---|
| Běh | `<datum>_<písmeno>` | `2026-09-12_A` |
| Otázka | `Q_<Postava><Kapitola>_<Poradi>` | `Q_Marie1_1` |
| Odpověď | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel` |
| Škála | `S_<Postava>_<Skala>` | `S_Marie_Wealth` |

Dopad na škály ve zdrojové tabulce: `S_Marie_Wealth+3, S_Marie_Regime-2`.
Speciální hodnota odpovědi `_OTHER_` = volný text doplněný orgem.

Škála se v databázi ukládá **rozložená**: `S_Marie_Wealth` = postava `Marie`
+ škála `Wealth`. Definice škály včetně pásem je per běh a škálu, ne per postavu.

## Postup práce

- Migrace se **negenerují ručně**: `npm run db:generate` ze schématu. Schéma
  v `src/db/schema/` je jediný zdroj pravdy o struktuře databáze.
- Co Drizzle neumí vyjádřit, patří do `db/sql/` jako **idempotentní** skript
  a pouští se `npm run db:sql` po migracích.
- Testy pokrývají primárně engine. Zbytek se testuje ručně. Výjimka:
  `src/db/schema.test.ts` hlídá architektonické pravidlo 2.
- Než začneš stavět další vrstvu, ověř `npm run typecheck` a `npm test`.
