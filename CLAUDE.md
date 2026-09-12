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

## Tři vrstvy logiky — pravidlo píš až jako poslední

Většina hry se bez pravidel obejde. Než se sáhne po pravidle, patří zkusit
levnější vrstvu:

| Vrstva | Kde je | Co umí |
|---|---|---|
| 1. Dopad na škály | sloupec `Scale Impact` v `N_Questions` | odpověď posune čísla |
| 2. Bloky a příznaky | sloupce `Blocks` a `Flags` u odpovědi | odpověď rovnou zapne blok v šabloně a nastaví příznak |
| 3. Pravidla | listy `N_Rules` a `N_Conditions` | složené podmínky, priority, negace, vznik domácnosti |

Vrstva 2 pokrývá „odpověď → text + příznak" **bez jediného pravidla** a je
nejlevnější na autorskou práci i na ladění. Vrstva 3 je pro to, co jinak nejde.

V databázi všechny tři vrstvy ústí do jedné tabulky `effects`: u vrstev 1 a 2 je
vlastníkem efektu `answer_option_id`, u vrstvy 3 `rule_id`. Engine je zpracovává
stejným kódem, takže přidání vrstvy 2 do importu není nová větev v enginu.

Dva listy na pravidla (`N_Rules` + `N_Conditions`) proto, že pravidlo má
**proměnný počet podmínek**. Podmínky se ukládají strukturovaně
(subjekt, operátor, hodnota, spojka, skupina) a **nikdy se neparsují z textu.**

## Domácnosti a sdílené škály (§4.4)

- **Škála má v definici rozsah platnosti:** `postava` (`Regime`, `Control`) nebo
  `domacnost` (`Wealth`, `Bony`, firemní byt, auto).
- **Sdílená hodnota se nikdy nekopíruje mezi postavami.** Má vlastního
  vlastníka: hodnoty škál `postava` leží v `character_scale_values`, hodnoty
  škál `domacnost` v `household_scale_values`.
- **Každá postava je vždy v nějaké domácnosti.** Svobodná postava je domácnost
  o jednom členovi — při založení běhu vznikne jedna na každou postavu. Tím
  v enginu **odpadá větev pro „postavu bez domácnosti"**; nezaváděj ji.
- **Postava smí být nejvýše v jedné domácnosti**; vynucuje to unikát na
  `household_memberships`, ne jen validace.
- **Efekty členů na sdílenou škálu se sčítají** — oba do společného účtu
  vydělávají. Události, které postihnou domácnost jako celek (vykradli vás,
  dostali jste byt), musí mít na pravidle `applies_once_per_household`.
- **Vznik i zánik domácnosti je efekt pravidla**, ne ruční operace:
  `domacnost_slouceni` / `domacnost_rozdeleni`.
- **Cíl efektu umí být odvozený z odpovědi** (§7.3). Efekt nese
  `related_character_id` (jmenovitě) nebo `related_from_answer` (postava, na
  kterou odkazuje vybraná volba odpovědi). Používá se pro partnera při sňatku,
  pro to, kdo se stal vedoucím skupiny, i pro členství. Druhá cesta je ta, kvůli
  které nemusí autor psát pravidlo pro každou kombinaci 23 postav.
- Strategie slévání při sňatku (`soucet` / `prumer` / `vyssi`) a dělení při
  rozvodu (`kopie` / `polovina`) jsou **v definici škály**, ne v kódu.
  Výchozí je součet s ořezem na 10, resp. každý si odnáší aktuální hodnotu.
- **Sdílené škály jsou největší riziko pro princip „žádný black box".**
  Mariiny peníze se změní kvůli Mirkově odpovědi. Proto `TraceContribution`
  u sdílené škály **vždy nese `characterId` zdroje** a UI musí říct
  „−3 Wealth, zdroj: odpověď Mirka Pokorného na Q_Mirek2_1". Bez toho je to
  přesně ten black box, který §2 zakazuje.

## Organizátorské a párové otázky (§6.7)

- Otázka má **zdroj**: `hrac` (výchozí) nebo `org`. Organizátorská se
  **netiskne do dotazníku pro hráče**, jinak se chová úplně stejně —
  stejné typy, stejné dopady, stejná pravidla. **Je to jen jiný zdroj vstupu,
  ne jiný mechanismus; engine mezi nimi nerozlišuje.**
- V UI jsou v **jednom proudu** s ostatními otázkami postavy, na svém místě
  podle pořadí, jen s decentní značkou „zadává org". **Ne oddělená sekce a ne
  druhý ukazatel postupu** — je jich málo, zvláštní sekce by rozbila plynulý
  průchod dotazníkem.
- **Párová otázka** (sňatek) se zadává **jen jednou**. V datech existuje
  **jedna odpověď**, ne dvě zrcadlené: řádek v `answers` patří té postavě,
  u které byla zadaná, a druhá ji vidí provázanou přes
  `answer_options.referenced_character_id`. **Nezavádět oboustranné potvrzení
  ani hlášení nesouladu** — nesoulad nemůže vzniknout, když je odpověď jedna.
- Zůstává validace: postava smí být cílem nejvýše jednoho sňatku v kapitole
  a nejvýše v jedné domácnosti.
- `scale_direct` nastavuje hodnotu **absolutně** a aplikuje se **na začátku
  hodnotové fáze, před všemi posuny**. Každé absolutní nastavení je v trace
  zvlášť viditelné.

## Pořadí vyhodnocení je dvoufázové (§7.3)

```
1. sběr odpovědí
2. vyloučení (negace) — má přednost před přiřazením
3. STRUKTURÁLNÍ fáze — domácnosti, sňatky, členství a vedení skupin
4. HODNOTOVÁ fáze — nejprve absolutní nastavení z org otázek, pak škály a příznaky
5. pásma
6. detekce zbylých konfliktů
```

**Fáze 3 musí proběhnout celá před fází 4.** Sdílená škála potřebuje vědět, kdo
do domácnosti patří, dřív než se do ní začnou sčítat příspěvky. Kdyby se sňatek
vyhodnotil až mezi změnami škál, výsledek by závisel na pořadí pravidel — a to je
přesně ten nedeterminismus, kterému se vyhýbáme.

Rozdělení efektů do fází je v datech (`STRUCTURAL_EFFECT_KINDS`,
`VALUE_EFFECT_KINDS` v `src/engine/types.ts`), aby ho implementace `evaluate`
nešla omylem obejít.

## Soukromý i společný účet (§4.4)

Manželé mohou mít obojí. Model to zvládá **bez rozšíření**: jsou to **dvě
samostatné škály s různým rozsahem platnosti**, ne jedna přepínaná do sdíleného
režimu.

| Škála | Rozsah |
|---|---|
| `Wealth_osobni` | `postava` |
| `Wealth_spolecny` | `domacnost` |

- Konvence pojmenování `_osobni` / `_spolecny`, aby se v tabulce nedaly splést.
- **Který účet efekt zasáhne, určuje ID škály v dopadu odpovědi.** Engine nic
  nedomýšlí. Převod mezi účty je jeden efekt nad dvěma škálami
  (`Wealth_osobni−2, Wealth_spolecny+2`) — žádná zvláštní mašinérie.
- **Vznik společného účtu při sňatku se nepočítá automaticky.** Kolik kdo do
  společného vložil, je **otázka v dotazníku**, ne dopočítaná hodnota — hráči si
  to rozehrávají sami. Proto má škála strategii `otazka` = nedopočítávat.
  Totéž u rozdělení při rozvodu: buď otázka, nebo rozhodnutí orga,
  **nikdy tiché dopočítání**.
- Svobodná postava společný účet technicky má (domácnost o jednom členovi), ale
  v dokumentu se neobjeví — zobrazení řídí příznak `Spolecny_ucet` a blok
  v šabloně, ne existence hodnoty.

## Co se vědomě nemodeluje

- **Obecná tabulka vztahů.** Strukturně existují jen tři vazby: členství ve
  skupině, vedení skupiny a domácnost. Kde vztah mechanicky rozhoduje, je
  zachycený jako odpověď odkazující na ID jiné postavy — to jsou ta data.
  Všechno ostatní je text v šabloně.
- **Vášně, obavy, ambice.** Jsou to bloky šablony, ne tabulka. Mění se každou
  kapitolu tím, že se vybere jiný blok. Když má některá ovlivnit pozdější
  kapitolu, přidá se k ní příznak nebo škála — **text sám se do enginu nikdy
  nevrací.**
- Obecné pravidlo: **text, který se jen tiskne, není datový model; co má
  ovlivnit budoucnost, je škála nebo příznak.**
- **Pásma nejsou per postava.** Definice škály včetně pásem je per běh a škálu;
  dvě postavy nemohou mít u téže škály jiná pásma.

## Doménová pravidla, na která se snadno zapomene

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích.** Ořez se loguje do
  auditu a hlásí v trace — je to signál špatně nastavených vah, ne detail.
  U sdílené škály to platí dvojnásob: přispívá do ní víc lidí, takže se hranice
  dosáhne snáz.
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
  fixní a **dvoufázové** — viz „Pořadí vyhodnocení je dvoufázové (§7.3)" výše.
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
- Dokumentace (`.md`) česky. **Komentáře v kódu anglicky** — viz globální
  `~/.claude/CLAUDE.md`: co nejstručněji, jen k nezjevným věcem, a vysvětlují
  **proč**, ne co kód dělá.

## Konvence ID ze zdrojové tabulky

| Typ | Vzor | Příklad |
|---|---|---|
| Běh | `<datum>_<písmeno>` | `2026-09-12_A` |
| Otázka | `Q_<Postava><Kapitola>_<Poradi>` | `Q_Marie1_1` |
| Odpověď | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel` |
| Škála | `S_<Postava>_<Skala>` | `S_Marie_Wealth` |

Dopad na škály ve zdrojové tabulce: `S_Marie_Wealth+3, S_Marie_Regime-2`.
Speciální hodnota odpovědi `_OTHER_` = volný text doplněný orgem.

Listy konfigurace: `N_Questions` (otázky, odpovědi, `Zdroj`, `Scale Impact`,
`Blocks`, `Flags`), `N_Scales` (škály, pásma, rozsah platnosti, strategie
slévání), `N_Content`, `N_Rules`, `N_Conditions`, `Validations`, `Characters`.

`N_Rules`: `RuleID`, `Popis`, `Efekt`, `Priorita`, `Váha`, `Vyloučení`,
`JednouZaDomácnost`. `N_Conditions`: `RuleID`, `Subjekt`, `Operátor`, `Hodnota`,
`Spojka`, `Skupina` — **jedna podmínka na řádek.**

Škála se v databázi ukládá **rozložená**: `S_Marie_Wealth` = postava `Marie`
+ škála `Wealth`. Definice škály včetně pásem je per běh a škálu, ne per postavu.

## Postup práce

- Migrace se **negenerují ručně**: `npm run db:generate` ze schématu. Schéma
  v `src/db/schema/` je jediný zdroj pravdy o struktuře databáze.
- Co Drizzle neumí vyjádřit, patří do `db/sql/` jako **idempotentní** skript
  a pouští se `npm run db:sql` po migracích.
- **Unikát, na který míří cizí klíč, musí být `unique()`, ne `uniqueIndex()`.**
  Drizzle generuje `CREATE UNIQUE INDEX` až za `ALTER TABLE ADD CONSTRAINT
  ... FOREIGN KEY`, takže FK na `(run_id, id)` by v migraci neměl na co ukázat
  a migrace spadne. `uniqueIndex()` zůstává jen pro **částečné** unikáty
  s `.where()`, které constraint neumí (aktivní verze konfigurace, vydaný přepočet,
  aktivní šablona).
- Testy pokrývají primárně engine. Zbytek se testuje ručně. Výjimka:
  `src/db/schema.test.ts` hlídá architektonické pravidlo 2.
- Než začneš stavět další vrstvu, ověř `npm run typecheck` a `npm test`.
