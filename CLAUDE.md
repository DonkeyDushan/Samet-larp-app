# CLAUDE.md

Interní webová aplikace pro organizátory LARPu: zpracuje dotazníky z konce
kapitoly, přepočítá stav postav a vygeneruje materiály pro další kapitolu.

**Zdroj pravdy o zadání je `documents/zadani-larp-engine.md`.** Sekce označené
`[ROZHODNUTO]` se neotevírají znovu. Tenhle soubor je jen shrnutí pravidel,
která platí v každé session.

Rozsah: **23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy**, ~3 otázky na
postavu a kapitolu, jediná role (organizátor), deadline ~3 měsíce. Objem dat je
malý — **optimalizuj na srozumitelnost, ne na výkon.**

## Kde si zadání odporuje samo se sebou

Zadání vznikalo postupně a několik míst zůstalo z dřívějšího návrhu. **Platí vždy
konkrétní revidovaná sekce, ne souhrnná tabulka ani starší session dokument.**

| Zastaralé místo | Co říká | Co platí |
|---|---|---|
| §15.2, týden 10 | naplňování dokumentů = „mazání bloků v Markdownu" | **§8.2 + §8.4:** značky jsou **nepárové**, text variant se do šablony **vkládá** z `N_Content` |
| §7.1 | podmínky pravidel se zapisují strukturovaně do listu `N_Conditions` | **§4.5:** podmínky jsou **výrazy v jedné buňce**, parsuje je knihovna |
| §10.3 | šablony se nahrávají „jednou za kapitolu" | **§6.5:** celý běh včetně šablon všech tří kapitol je připravený a nahraný **předem** |
| §7.3 | uvnitř fází se jede „podle priority sestupně" | **§7.6:** **nižší číslo je silnější**; odpověď má 0, pravidlo bez priority 100 |
| §13 | pole „Kdo jsi?" je nepovinné | **§3.1:** bez jména audit nefunguje; middleware bez něj nepustí dál |
| §4.2, §4.5, §6.6, §6.8, §7.5 | ID otázky `Q_Marie1_1`, odpovědi `A_Marie1_1_Karel` | **ID se vždy dělí `_` mezi každou částí:** `Q_Marie_1_1`, `A_Marie_1_1_Karel` |
| `zadani-session-3-engine.md` | šest fází přepočtu | **§7.3:** **osm fází** — přibyly ankety a výběr variant bloků |
| starší CLAUDE.md, schéma | `Wealth_osobni` / `Wealth_spolecny` jsou dvě nezávislé škály, engine nic nedomýšlí | **§4.4 + §7.6:** škála `smerovana`, `S_Marie_Wealth` bez přípony je platný zápis a engine ho **směruje** |

§8.2, §4.5 i §7.6 ten obrat samy pojmenovávají. Když na některé ze zastaralých
míst narazíš, **neřiď se jím.**

## Kód zatím zaostává za zadáním

Stav k 2026-09-13. Tyhle rozdíly jsou **dluh k dorovnání, ne rozhodnutí** —
kód se srovná podle zadání, ne naopak. Až bude položka hotová, smaž ji odsud.

- `scaleScope` v `src/db/schema/enums.ts` zná jen `postava` a `domacnost`; rozsah
  `smerovana` a příznak otázky `Soukrome` chybí.
- Ankety (`Anketa`, `VITEZ`, `HLASY`…), sloupec `Condition` u otázek a typy bloků
  `Historie` / `Questions` nejsou implementované.
- `src/engine/constants/priorities.ts` počítá s tím, že výchozí priorita
  pravidla je rovna prioritě odpovědi (0); podle §7.6 je výchozí 100.
- `src/engine/constants/identifiers.ts` generuje ID domácností ze jmen členů
  (`H_2_Marie_Mirek`); §7.6 to zakazuje.
- `src/import/constants/answer-effect-kinds.ts` nemá `KONEC_CLENSTVI` ani
  `PRIJMENI` a počítá s `ODCHOD`, který §7.6 ruší.
- Schéma nese enumy `conditionSubject` / `conditionOperator` pro strukturované
  podmínky, které §4.5 zrušil.
- Fixtures v `documents/` mají list `1_Content`, bloky v `N_Content` s kapitolou
  `N` v ID (`B_Marie_2_Historie_1` v `2_Content`) a typy mimo `Historie` /
  `Questions` (`Prace`, `Rezim`).
- `src/import/validate/check-content.ts` pouští podmínky listu `N_Content` na
  odpovědi až do kapitoly N; podle §8.2 smějí sahat jen do kapitoly N−1.

## Tři architektonická pravidla

### 1. Engine pravidel je čistá funkce

```ts
evaluate(stav, odpovědi, konfigurace) → { novýStav, trace[], konflikty[] }
```

Žije v `src/engine/`. **Bez databáze, bez sítě, bez Reactu, bez `async`, bez
importů z ostatních vrstev.** Musí jít otestovat na desítkách scénářů bez
rozjetí aplikace. ESLint to hlídá (`no-restricted-imports` v
`eslint.config.mjs`) — když to pravidlo začne překážet, není chyba v ESLintu.
Ve chvíli, kdy engine potřebuje `await`, je návrh špatně.

Volající kód načte data z databáze, zavolá `evaluate` a výsledek uloží.

- **`trace[]` je hlavní výstup vedle nového stavu**, ne doplněk. Nese **data
  s popisky, ne hotovou větu** — formulace je věc UI a musí jít změnit bez
  přepočítávání. Trace vzniká **i pro změny, které se vzájemně vyruší** — „nic
  se nezměnilo" je taky odpověď, kterou org může potřebovat vysvětlit.
- **`konflikty[]`** vrací všechno, co engine nesmí rozhodnout sám: dvě pravidla
  se stejnou prioritou a protichůdným efektem, shodu hlasů v anketě,
  nedopočítanou hodnotu (`nedopocitano`), sňatek do obsazené domácnosti.
  **Nezaokrouhluj a neodhaduj** — kde není jasné, co se má stát, vrať konflikt.
- **Neznámý identifikátor ve výrazu je chyba, ne nepravda.** Tiché vyhodnocení
  překlepu na `false` je nejhorší možné chování.
- **Engine vadná data neopravuje.** Chybějící odpověď, blok bez `DEFAULT`,
  neznámé ID — to patří do validace importu. Engine na ně spadne nahlas.
- **Engine nikdy negeneruje náhodu.** Uložené hody dostane na vstupu a vrátí
  seznam hodů, které potřebuje a ještě nemá.

**Tohle je nejdůležitější pravidlo v celém projektu** (§15).

### 2. `run_id` je v každé tabulce a v každém dotazu

Dva běhy hry běží současně a jejich data se **nesmí potkat** (§3.3).

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

V UI platí navíc: přepínač běhu trvale v hlavičce na každé obrazovce,
**odlišná barva rozhraní pro každý běh** (A modrá, B jantarová), potvrzovací
dialogy u zásadních akcí vždy jmenují běh („Uzamknout kapitolu 2 běhu
**2026-09-12_B**?"), název běhu je v názvu každého exportu.

**Běh je v cestě URL** (`/beh/<runId>/<sekce>`), ne v cookie: dvě záložky smějí
držet dva různé běhy a sdílená cookie by jednu z nich tiše přepnula. Písmeno
běhu začíná s každým datem zahájení znovu od `A`; A/B/C jsou běhy téhož data
(`nextRunLetter`).

**Jméno z „Kdo jsi?" čte server z cookie** (`readAuthor` v
`src/core/services/auth-cookies.ts`); formuláře ho neposílají. Middleware
bez hesla i bez jména nepustí na žádnou stránku, takže audit nikdy není anonymní.

### 3. Nic se nepřepisuje destruktivně

- Každý přepočet je **nový řádek** v `computations`, nikdy update. Dry-run jde
  pustit stokrát.
- Stav postav je snapshot na kapitolu s vazbou na verzi přepočtu
  (`computation_id`). Nepřepisuje se.
- Každý nahraný `.xlsx` i `.md` se odloží **tak, jak přišel**, do archivu běhu.
- Všechny cizí klíče jsou `on delete restrict`. **Archivovaný běh se nikdy nemaže**
  a zůstává navždy prohlížitelný včetně odpovědí, stavů a trace.
- `audit_log` je **append-only** a vynucuje to databázový trigger
  (`db/sql/001_audit_append_only.sql`), ne jen konvence. U každé změny je
  zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po
  a které pravidlo změnu způsobilo.

Mazat smí jen dvě místa: seed skript (jen svůj lokální běh) a import konfigurace
**před prvním přepočtem**, který odebere entity, jež nový soubor už neobsahuje
(`RunScope.delete`).

## Konfigurace se nastaví jednou a pak se nemění (§6.5)

**Verzování konfigurace je zamítnuté.** Žádná tabulka verzí, žádná aktivace
verze, žádný diff dvou importů. Běh má **jednu platnou konfiguraci** (otázky,
škály, bloky, šablony pro všechny tři kapitoly), připravenou celou předem.

| Kdy | Nahrání konfigurace |
|---|---|
| Před prvním přepočtem | volně a opakovaně, bez ptaní — fáze ladění, ještě nic nevzniklo; entity, které nový soubor už neobsahuje, se smažou (když na ně navazují zadané odpovědi, import odmítne) |
| Po prvním přepočtu | konfigurace je zmrazená; nahrání je **nouzová cesta** pro opravu chyby (překlep v bloku, vadná podmínka) a nesmí odebrat nic, co autor napsal (odvozené efekty odpovědí ano) |

Nouzová oprava v rozjetém běhu:

1. vyžaduje **potvrzení a důvod**, obojí do auditu,
2. označí už spočítané kapitoly jako **`dotčené`** — stejný mechanismus jako
   oprava odpovědi (kaskáda), sama nic nepřepočítá,
3. původní soubor zůstává v archivu běhu.

Auditovatelnost místo verzí nese **archiv nahraných souborů** (`uploaded_files`,
každý přepočet na něj odkazuje `config_upload_id`) — po hře jde přesně dohledat,
z čeho se počítalo.

## Technologie [ROZHODNUTO]

| Vrstva | Volba |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Databáze | Postgres (Neon), lokálně `scripts/pg.sh` nebo Docker |
| ORM | Drizzle |
| UI | MUI (Material UI) s vlastním tématem; styly v theme `components`, jinak CSS Modules přes data atributy, bez `sx` a inline stylů |
| Testy | Vitest, primárně na engine pravidel a import |
| Import tabulek | SheetJS (`xlsx`) |
| Výrazy v podmínkách | `jsep` |
| Zip | `jszip` |
| Hosting | Vercel, `git push` = nasazeno |

**Žádné Google API.** Verze 1 komunikuje se světem výhradně přes nahrané
a stažené soubory: `.xlsx` a `.md` dovnitř, `.zip` ven. Napojení na Google je
fáze 2 a **nikdy nenahradí** souborovou cestu — ta zůstává navždy funkční jako
záložní režim.

PDF se negeneruje — tiskne se z Google Docs. Round-trip přes Markdown je
ověřený na reálném dokumentu (§8.5), formátování se zachovává.

## MUI (§15.1)

- **Nastavení v App Routeru:** `AppRouterCacheProvider` z `@mui/material-nextjs`,
  jinak problikne nestylovaný obsah. MUI komponenty patří do `'use client'`
  stromu, server komponenty zůstávají na načítání dat.
- **Vlastní téma, ne výchozí Material** (`src/theme/theme.ts`, `createTheme`):
  - `palette` — tlumené, mírně vybledlé odstíny; patří sem i barvy běhů A a B,
  - `typography` — menší základní písmo než výchozí MUI,
  - `components` — globálně `defaultProps: { size: 'small', margin: 'dense' }`
    pro pole a tlačítka, jinak je aplikace o třetinu rozvolněnější,
  - `colorSchemes` pro světlý a tmavý režim.
- **Uprav téma, ne jednotlivé komponenty.** První volba je vždy `components`
  v theme (`defaultProps`, `styleOverrides`, `variants`). Když mají všechna
  tlačítka vypadat jinak, změní se téma, ne tlačítka.
- **Pravidla stylování** — výkonnostní požadavek, ne preference vzhledu
  (`sx`, `styled()` i inline `style` alokují a přepočítávají styly při každém
  renderu):
  - **CSS Modules** — jeden `.module.css` na komponentu, v jejím adresáři,
  - **žádný `sx`** — nikde, ani na komponentách MUI,
  - **žádný `styled()` s dynamickými props**,
  - **žádné inline `style` objekty** — jediná výjimka je geometrie virtualizace
    (`transform`, `height`, `top`, `left`, `width`),
  - **stavové styly přes data atributy** (`data-selected={isSelected}`,
    CSS cílí `[data-selected="true"]`), ne podmíněná pole tříd,
  - `Typography` z MUI je v pořádku; **`Box`, `Stack`, `Grid` ne** ve stromech,
    které se často překreslují (seznamy, karty, tooltipy, menu).

  Pravidla platí **globálně**, ne jen v horkých cestách — hranice se během
  vývoje posouvá a rozhodovat to u každé komponenty je víc práce.
- **`DataGrid` jen v sekci Výstupy.** Jinde `Table` nebo `List`; zadávání
  odpovědí je záměrně formulářové, ne mřížkové.
- **Indikátor vyplněnosti barvou i tvarem:** ikony `RadioButtonUnchecked` /
  `Adjust` / `CheckCircle`.

## Čtyři vrstvy logiky — pravidlo píš až jako poslední

Většina hry se bez pravidel obejde. Než sáhneš po vyšší vrstvě, zkus nižší:

| Vrstva | Kde je | Co umí |
|---|---|---|
| 1. Dopad na škály | sloupec `Scale Impact` v `N_Questions` | odpověď posune škály |
| 2. Příznaky a efekty | sloupce `Flags` a `Effects` v `N_Questions` | odpověď nastaví příznak, vyvolá sňatek, změní vedení skupiny |
| 3. Varianty bloků | sloupce `Priority` a `Conditions` v `N_Content` | **která varianta textu se použije** a **které otázky se položí v další kapitole** |
| 4. Pravidla | list `N_Rules` *(nepovinný)* | logika, která nepatří k jedné odpovědi ani k jednomu bloku |

**Vrstva 4 nemusí v první verzi vzniknout vůbec** (§4.5). Reálný list ukazuje,
že většinu rozhodování nese vrstva 3 přímo u textu, kterého se týká. `N_Rules`
zakládej až ve chvíli, kdy narazíš na něco, co se jinam nevejde — do té doby je
to prázdná struktura navíc. **Fixtures list `N_Rules` ani `N_Conditions` nemají.**

**Sloupec `Blocks` u odpovědi je zrušený** (§7.6). Vyhodnocuje se vždy každý
blok a o výsledku rozhodují podmínky jeho variant, takže by neměl žádný účinek.
U odpovědi zůstávají `Scale Impact`, `Flags` a `Effects`.

V databázi vrstvy 1, 2 a 4 ústí do jedné tabulky `effects`: u vrstev 1 a 2 je
vlastníkem efektu `answer_option_id`, u vrstvy 4 `rule_id`. Engine je zpracovává
stejným kódem. Vrstva 3 žije v `content_blocks` + `block_variations`.

## Podmínky jsou výrazy, ne strukturované sloupce (§4.5)

Autor hry píše podmínky **jako výraz v jedné buňce**:

```
A_Marie_2_1_Mirek AND !(S_Marie_Wealth <= 3 OR F_Svatba)
```

**Parser nepiš. Vlastní gramatiku nepiš nikdy.** Používá se `jsep`
(`src/engine/expression/`, import jen hlásí syntaktické chyby přes
`src/import/expression.ts`); nad jeho stromem se napíše vyhodnocení. Definice
jazyka je v `src/engine/constants/expressionLanguage.ts`, aby engine i import
četly totéž.

| Prvek | Zápis | Význam |
|---|---|---|
| Odpověď | `A_Marie_1_1_Karel` | postava odpověděla takto |
| Negace | `!A_Marie_1_1_Karel` | neodpověděla |
| Spojky | `AND`, `OR` | `AND` váže silněji |
| Závorky | `( )` | priorita vyhodnocení |
| Škála | `S_Marie_Wealth >= 7` | operátory `=`, `!=`, `>`, `<`, `>=`, `<=`; bez přípony **směrovaná** (§4.4) |
| Příznak | `F_Svatba` | příznak je nastaven |
| Náhoda | `RANDOM(50)` | hod 1–100, platí při hodnotě **≤ 50**; hod se ukládá (§7.4) |
| Anketa | `VITEZ(VOLBA_VEDENI) = Karel` | výsledek hlasování napříč postavami (§4.7) |
| Výchozí | `DEFAULT` | vždy pravdivé, stojí poslední |

Dvě věci, na které `jsep` sám nestačí: `AND`/`OR` se musí zaregistrovat jako
binární operátory a autorovo jednoduché `=` se před parsováním přepíše na `==`
(pozor na `<=`, `>=`, `!=`). Podmínka se ukládá **jako text** (`condition_expr`)
plus seznam nalezených referencí — formulace zůstává autorova a validace může
citovat, co napsal.

**Každý výskyt `RANDOM` má vlastní hod** (§7.6). Klíč hodu je
`(postava, kapitola, varianta nebo pravidlo, pořadí výskytu ve výrazu)`.
`RANDOM(50) AND RANDOM(50)` musí dát 25 %, ne 50 %.

**Kdy se podmínky čtou** (§7.6):

- **podmínky pravidel** nad **stavem na začátku kapitoly** a nad odpověďmi,
- **podmínky variant bloků** nad **hotovým stavem po fázi 6** — musí vidět
  hodnotu, kterou org nastavil v téže kapitole, jinak by popisovaly loňský svět.

## Ankety — hlasování napříč postavami (§4.7)

Otázky jsou per postava, takže volba vedení spolku je 23 samostatných otázek.
K sobě je váže sloupec **`Anketa`** v `N_Questions` (např. `VOLBA_VEDENI`).
Prázdný sloupec = běžná otázka.

- **Anketa se nepozná z tvaru ID**, jen ze sloupce. Přejmenování otázky nesmí
  tiše rozbít hlasování.
- Funkce v podmínkách:

  | Zápis | Vrací |
  |---|---|
  | `VITEZ(VOLBA_VEDENI)` | ID hodnoty s nejvíc hlasy |
  | `VITEZOVE(VOLBA_VEDENI, 2)` | seznam prvních N; testuje se `obsahuje Karel` |
  | `HLASY(VOLBA_VEDENI, Karel)` | počet hlasů pro Karla |
  | `HLASY_CELKEM(VOLBA_VEDENI)` | počet odevzdaných hlasů |

- Ankety se vyhodnocují **jako fáze 2, hned po sběru odpovědí**. Závisí jen na
  odpovědích, takže kruhová závislost vzniknout nemůže.
- **Shoda hlasů je konflikt**, engine ji neřeší abecedou ani pořadím řádků. Org
  určí vítěze ručně, nebo opraví odpověď — obojí do auditu.
- Do vedení skupiny se výsledek propíše strukturálním efektem
  `VEDENI(Spolek, VITEZ(VOLBA_VEDENI))`.
- **Trace nese celé sčítání se jmenovitým seznamem hlasujících**
  („Karel 3 (Marie, Karel, Vojtěch), Marie 2 (Naďa, Luboš) → vítěz Karel") —
  bez něj nejde dohledat překlep při přepisu z papíru.
- Validace: anketa s nezodpovězenou otázkou nespustí přepočet; odpověď na
  neexistující postavu; `VITEZ`/`HLASY` s neexistující anketou; anketa s jedinou
  otázkou (skoro jistě překlep).

## Bloky a jejich varianty (§8.2)

**Varianty textu žijí v tabulce, šablona obsahuje jen značku.**

Struktura listu `N_Content`:

| Sloupec | Význam |
|---|---|
| `Character` | které postavy se blok týká — **vyplněno jen na prvním řádku skupiny** |
| `Block ID` | `B_<Postava>_<Kapitola>_<Typ>_<Pořadí>` — **jen na prvním řádku** |
| `Variation ID` | identifikátor varianty, `V_Marie_1_Historie_1_A` |
| `Variation Description` | poznámka autora, do výstupu nejde |
| `Variation Text` | text do dokumentu; **smí být prázdný** — varianta „nic se nestalo"; u typu `Questions` **musí** být prázdný |
| `Priority` | pořadí vyhodnocení, nižší číslo dřív |
| `Conditions` | výraz podle §4.5 |

**Vyhodnocení:** varianty se procházejí **vzestupně podle `Priority`** a použije
se **první, jejíž podmínka platí**. `DEFAULT` je vždy pravdivá, takže stojí
poslední a zaručuje, že blok vždy něco vrátí. **Mezi variantami nevznikají
konflikty** — priorita rozhoduje úplně.

### Dva typy bloků, typ plyne z ID

| Typ | Co vybraná varianta dělá |
|---|---|
| `Historie` | její `Variation Text` se vloží do dokumentu místo značky `{BLOK <Block ID>}` |
| `Questions` | **přepínač** — rozhoduje, které otázky se položí v další kapitole (§6.8) |

**Jiné typy nejsou.** Samostatný sloupec `Type` neexistuje: typ nese
**předposlední segment ID** (`B_Marie_1_Historie_1`, `B_Marie_1_Questions_2`).
Protože na tvaru ID závisí chování, **nesmí se dohadovat**: ID mimo tvar
i neznámý typ jsou **chyba importu** s návrhem („`Historei` — mysleli jste
`Historie`?"), nikdy tiché zařazení mezi `Historie`.

### `N_Content` se počítá z odpovědí předchozí kapitoly

**List `N_Content` nese materiál pro kapitolu N, ale vyhodnocuje se
z odpovědí kapitoly N−1.** Proto **`1_Content` neexistuje** — do první kapitoly
vstupují hráči s ručně připravenými materiály.

**Číslo kapitoly v ID bloku i varianty je kapitola, ze které se blok odvozuje**,
ne číslo listu. V `2_Content` jsou tedy `B_Marie_1_…` / `V_Marie_1_…`,
v `3_Content` `B_Marie_2_…` / `V_Marie_2_…`. Totéž platí pro Variation ID
ve sloupci `Condition` otázek: `2_Questions` odkazuje na `V_Marie_1_Questions_1_A`.

```
odpovědi kapitoly 1 → vyhodnocení 2_Content ┬→ texty do dokumentů kapitoly 2
                                            └→ výběr otázek v 2_Questions
```

Validace: dvě varianty téhož bloku se **stejnou prioritou** (výsledek by
závisel na pořadí řádků), blok **bez varianty `DEFAULT`**, blok typu
`Questions` s vyplněným textem.

## Podmíněné otázky od druhé kapitoly (§6.8)

V kapitole 1 má každá postava pevnou sadu otázek. Od kapitoly 2 má `N_Questions`
sloupec **`Condition`**:

| Hodnota | Význam |
|---|---|
| `NONE` | otázka se položí vždy |
| Variation ID bloku typu `Questions` (v `2_Questions` např. `V_Marie_1_Questions_1_A`) | otázka se položí, **jen když byla vybrána tahle varianta** |

- **Podmínka je jedno Variation ID, ne výraz.** Rozhodnutí padlo při
  vyhodnocení bloku, kde jsou plné výrazy; druhý výraz by tutéž logiku
  zdvojil a rozešel.
- Z bloku vyhrává vždy právě jedna varianta, takže otázky navázané na různé
  varianty téhož bloku se **vzájemně vylučují** — bez jediného pravidla navíc.
- **Není to podmíněná podotázka.** Ta zůstává zakázaná (§6.1). Tady se celá sada
  pro **příští** kapitolu sestaví předem a hráč dostane hotový plochý papír.
- Validace: odkaz na neexistující Variation ID; odkaz na variantu bloku typu
  `Historie`; varianta typu `Questions`, na kterou neodkazuje žádná otázka;
  **postava, která by v kapitole nedostala ani jednu otázku.**

## Značky v šabloně jsou nepárové (§8.4)

| Značka | Význam |
|---|---|
| `{BLOK <Block ID>}` | nahradí se textem vybrané varianty z `N_Content` (jen blok typu `Historie`) |
| `{JMENO}`, `{PRIJMENI}`, `{VEK}`, `{SKUPINA}` | proměnná ze stavu postavy |
| `{PRIJMENI_PARTNER}` | příjmení druhého člena domácnosti; **mimo domácnost je to chyba, ne prázdný řetězec** |

- **`{/BLOK}` neexistuje.** Text nese tabulka, ne šablona, takže není co uzavírat.
  Zavírací značka v šabloně je chyba validace.
- **Žádná značka nesmí přežít do výsledného dokumentu.** Zbylá značka = chyba.
- Blok v šabloně bez záznamu v `N_Content`, blok typu `Historie`, na který nevede
  žádná značka, a `{BLOK}` odkazující na blok typu `Questions` jsou chyby
  validace (§11).
- Text mimo značky je pevná část šablony a aplikace se ho nedotkne. Sem patří
  charakterizace postavy, která se nemění (§4.6).
- Prázdný `Variation Text` znamená, že značka zmizí beze stopy.

## Škály, domácnosti a účty (§4.4)

### Tři rozsahy platnosti

| Rozsah | Vlastník hodnoty | Příklad |
|---|---|---|
| `postava` | postava (`character_scale_values`) | `Regime`, `Control` |
| `domacnost` | domácnost (`household_scale_values`); všichni členové čtou a mění tutéž | firemní byt, auto |
| `smerovana` | **dvojice účtů** `_osobni` (postava) + `_spolecny` (domácnost); engine vybere, kam změna jde | `Wealth`, `Bony` |

- **Sdílená hodnota se nikdy nekopíruje mezi postavami.** Má vlastního vlastníka.
- **Každá postava je vždy v nějaké domácnosti.** Svobodná postava je domácnost
  o jednom členovi — při založení běhu vznikne jedna na každou postavu. Tím
  v enginu **odpadá větev pro „postavu bez domácnosti"**; nezaváděj ji.
- **Postava smí být nejvýše v jedné domácnosti**; vynucuje to unikát na
  `household_memberships`, ne jen validace.
- Konvence pojmenování `_osobni` / `_spolecny`, aby se v tabulce nedaly splést.

### Směrování příspěvků — jádro celé sekce

Autor píše dopad **logickým jménem bez přípony** (`S_Marie_Wealth+3`) a engine
rozhodne, kam přistane:

| Situace | Cílový účet |
|---|---|
| postava je v manželství (domácnost s dalším členem) | `_spolecny` |
| postava je svobodná | `_osobni` |
| otázka nese příznak **`Soukrome`** | **vždy `_osobni`**, i u vdané postavy |
| explicitní přípona (`S_Marie_Wealth_osobni+3`) | **má přednost** před směrováním |

- Díky tomu **autor nepíše dvě varianty odpovědi** pro vdanou a svobodnou
  postavu — kvůli tomu mechanismus existuje.
- **Stejné směrování platí v podmínkách.** `S_Marie_Wealth >= 7` je „účet, do
  kterého Mariiny peníze tečou"; konkrétní účet se píše s příponou.
- **Rodinný stav se čte po strukturální fázi** (fáze 4). Kdo se v téhle kapitole
  oženil, tomu už příspěvky z téže kapitoly jdou na společný účet; kdo se
  rozvedl, tomu na osobní.
- **Absolutní nastavení (`scale_direct`) musí vždy jmenovat konkrétní účet.**
  Směrované jméno bez přípony je **chyba validace** — org nesmí nevědomky
  zapsat hodnotu jinam, než myslel.
- **Osobní účet manželům nezaniká.** Sňatek jen změní, kam standardně
  přitékají peníze.
- Převod mezi účty je jeden efekt nad dvěma explicitními škálami
  (`S_Marie_Wealth_osobni-2, S_Marie_Wealth_spolecny+2`).

### Jak se sdílená hodnota mění

- **Příspěvky členů se sčítají** — oba do společného účtu vydělávají.
  Události, které postihnou domácnost jako celek (vykradli vás, dostali jste
  byt), musí mít na pravidle `applies_once_per_household`.
- **Vznik a zánik domácnosti je efekt odpovědi** (`SNATEK`, `ROZVOD`), ne ruční
  operace nad databází.
- **Sňatek:** osobní účty obou zůstávají. **Kolik kdo vloží do společného, je
  otázka v dotazníku**, ne dopočítaná hodnota. **Rozvod nebo úmrtí:** co si kdo
  odnese ze společného, je otázka nebo rozhodnutí orga. **Nikdy tiché
  dopočítání.**
- U nefinančních domácnostních škál (byt, auto) je strategie slévání
  (`soucet` / `prumer` / `vyssi` / `otazka`) a dělení (`kopie` / `polovina` /
  `otazka`) **v definici škály**, ne v kódu. Sloučení i rozdělení jde do trace
  a auditu **s oběma původními hodnotami**.
- **Nedopočítaná hodnota** — strategie `otazka` bez odpovědi, která hodnotu
  nastaví, nebo neceločíselný průměr — vrací konflikt **`nedopocitano`**.
- **Sňatek s postavou, která už v domácnosti je**, vrací strukturální konflikt
  a nic nemění. Org opraví odpověď, nebo nejdřív zadá rozvod.
- **ID domácnosti je neprůhledné** (`H_<běh>_<pořadí>`), členy drží vazební
  tabulka. ID ze jmen (`H_2_Marie_Mirek`) přestane sedět při rozvodu. Čitelný
  popis se skládá až při zobrazení z aktuálního členství.
- **Cíl efektu umí být odvozený z odpovědi** (§7.3): efekt nese
  `related_character_id` (jmenovitě) nebo `related_from_answer` (postava, na
  kterou odkazuje vybraná volba). Druhá cesta je ta, kvůli které nemusí autor
  psát pravidlo pro každou kombinaci 23 postav.

### Transparentnost — sdílené a směrované škály jsou největší riziko black boxu

Mariiny peníze se změní kvůli Mirkově odpovědi a ze zápisu `S_Marie_Wealth+3`
není vidět, kam to spadlo. Proto:

1. Trace u směrované škály **vždy nese cílový účet a důvod směrování**
   („+3 Wealth → společný účet, Marie je v manželství s Mirkem Pokorným").
2. `TraceContribution` u sdílené škály **vždy nese `characterId` zdroje**
   („−3 Wealth_spolecny, zdroj: odpověď Mirka Pokorného na Q_Mirek_2_1").
3. V detailu postavy je u sdílené škály značka „společný účet s Mirkem
   Pokorným" a odkaz na druhou postavu.
4. Svobodná postava společný účet technicky má, ale zobrazení v dokumentu řídí
   blok v šabloně, ne existence hodnoty.

### Validace účtů

- Směrovaná škála musí mít definované **obě** hodnoty, `_osobni` i `_spolecny`.
- Když v kapitole žádná odpověď nesahá na jeden z dvojice účtů, je to skoro
  jistě překlep v ID škály — **varování**.
- Domácnostní škála bez strategie sloučení a rozdělení je chyba.

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
  U provázané odpovědi je vidět, u které postavy byla zadaná.
- Zůstává validace: postava smí být cílem nejvýše jednoho sňatku v kapitole
  a nejvýše v jedné domácnosti.
- `scale_direct` nastavuje hodnotu **absolutně**, vždy na **explicitní účet**,
  a aplikuje se **na začátku hodnotové fáze, před všemi posuny**. Každé
  absolutní nastavení je v trace zvlášť viditelné.
- Sběr odpovědí probíhá **ve dvou vlnách** (papíry od hráčů, pak porada orgů).
  Aplikace kvůli tomu nepotřebuje nic zvláštního.

## Pořadí vyhodnocení je fixní (§7.3)

```
1. sběr odpovědí
2. vyhodnocení anket — výsledky jsou k dispozici všem dalším fázím
3. vyloučení (negace) — má přednost před přiřazením
4. STRUKTURÁLNÍ fáze — domácnosti, sňatky, členství a vedení skupin
5. HODNOTOVÁ fáze — nejprve absolutní nastavení z org otázek, pak posuny škál
   a příznaky; tady se směrované škály rozhodují podle rodinného stavu z fáze 4
6. pásma
7. výběr variant bloků — Historie: text do dokumentu, Questions: otázky další kapitoly
8. detekce zbylých konfliktů
```

**Fáze 4 musí proběhnout celá před fází 5.** Sdílená škála potřebuje vědět, kdo
do domácnosti patří, dřív než se do ní začnou sčítat příspěvky. Kdyby se sňatek
vyhodnotil až mezi změnami škál, výsledek by závisel na pořadí pravidel — a to je
přesně ten nedeterminismus, kterému se vyhýbáme.

Rozdělení efektů do fází je v datech (`STRUCTURAL_EFFECT_KINDS`,
`VALUE_EFFECT_KINDS` v `src/engine/constants/effectPhases.ts`), aby ho
implementace `evaluate` nešla omylem obejít.

### Priorita: nižší číslo je silnější (§7.6)

| Priorita | Co |
|---|---|
| `0` | **přímé dopady odpovědi** — nejsilnější |
| `1`… | pravidla s explicitní prioritou |
| `100` | výchozí priorita pravidla bez uvedené hodnoty |

**Pravidlo odpověď nepřebije.** Odpověď je fakt zadaný člověkem, pravidlo
odvozenina. Kde má odvozenina fakt potlačit, zapíše se jako **vyloučení**, které
má absolutní přednost. U variant bloků platí totéž: nižší `Priority` dřív.

### Co je protichůdný efekt (§7.6)

| Typ efektu | Protichůdné je |
|---|---|
| příznak | `true` proti `false` |
| absolutní nastavení | dvě různé hodnoty na tutéž škálu |
| domácnost | dva sňatky, nebo sňatek proti rozvodu |
| vedení skupiny | dva různí vedoucí |
| **posun škály** | **nikdy** — posuny se sčítají |

Protichůdné efekty **se stejnou prioritou** jsou konflikt pro orga. **Ořez na
1–10 se dělá jednou, až po sečtení všech posunů** — jinak by výsledek závisel
na pořadí, v jakém se posuny aplikovaly.

### Vokabulář efektů (§7.6)

Efekt ve sloupci `Effects` je funkce s argumenty. **Jiné neexistují:**

| Zápis | Význam | Fáze |
|---|---|---|
| `SNATEK(<postava>)` | vznik domácnosti s uvedenou postavou | strukturální |
| `ROZVOD()` | zánik domácnosti, které je postava členem | strukturální |
| `VEDENI(<skupina>, <postava>)` | uvedená postava vede skupinu | strukturální |
| `CLENSTVI(<skupina>)` | postava vstupuje do skupiny | strukturální |
| `KONEC_CLENSTVI(<skupina>)` | postava skupinu opouští | strukturální |
| `PRIJMENI(<text>)` | změna příjmení postavy | hodnotová |

- **Skupina je povinný argument** u `VEDENI`, `CLENSTVI` i `KONEC_CLENSTVI`
  a import ji musí uložit. **`ODCHOD` bez argumentu je zrušený.**
- **Příjmení se sňatkem nemění automaticky** — v prostředí hry si ho bere jen
  někdo. Mění se jen efektem `PRIJMENI`, typicky z organizátorské otázky.

## Import konfigurace a validace (§10.2, §11)

Kód je v `src/import/`, čisté funkce bez databáze (zápis je oddělený
v `src/import/persist/`) — celá cesta od souboru k hlášením jde otestovat na
fixtures v `documents/`. Převod na vstup enginu je `src/import/to-engine-config.ts`.

- **Jeden `.xlsx` se všemi listy, žádný jiný formát** (Google Sheet →
  *Stáhnout → Microsoft Excel*). Nahrávání jednotlivých `.csv` je **zamítnuté**
  (§10.2) — druhá cesta, kterou by bylo nutné udržovat.
- **Chybná konfigurace nikdy nesmí shodit aplikaci.** Parser sbírá všechny chyby
  a vrátí je najednou, nekončí na první. Autor chce opravit dvacet překlepů
  v jednom kole.
- **Každá hláška musí říct, kde je problém: list, řádek, sloupec, hodnota.**
  „Neplatný odkaz na škálu" je nepoužitelné. „List `2_Questions`, řádek 34,
  sloupec `Scale Impact`: škála `S_Marie_Welth` neexistuje, mysleli jste
  `S_Marie_Wealth`?" je použitelné.
- **Chyby blokují** použití konfigurace, **varování pustí dál**.
- **Import je idempotentní.** Opakované nahrání nesmí nic zdvojit — konfigurace
  běhu je vždy jen jedna.
- **Po prvním přepočtu je import nouzová cesta** s potvrzením, důvodem
  a označením `dotčené` (viz „Konfigurace se nastaví jednou" výše). Soubor
  se v každém případě odloží do archivu běhu.
- **Fill-down sloučených buněk.** `Character` a `Block ID` jsou vyplněné jen na
  prvním řádku skupiny; parser musí hodnotu dopěstovat dolů. Prázdný řádek
  skupinu ukončuje.
- Prázdné buňky, mezery navíc a nezlomitelné mezery ošetři tiše, ale **spočítej
  je a zmiň v přehledu importu.**
- **Diakritika v ID, názvech listů a exportech musí projít bez poškození.**

**Co se ošetřuje tolerantně** (a hlásí jako varování, ne chyba) — vždycky proto,
že jde o zvyk autora, který by jinak blokoval desítky řádků:

| Jev | Řešení |
|---|---|
| `Věra` ve sloupci `Character` místo ID `Vera` | dohledá se podle jména bez diakritiky; nejednoznačné jméno se **nehádá** |
| `Slouceni`/`Rozdeleni` vyplněné i u škál s rozsahem `postava` | tiše se zahodí (DB tam stejně vyžaduje `NULL`) |
| `kazdy_si_odnasi` | mapuje se na `kopie` |
| `,` i `;` jako oddělovač v `Scale Impact` | beru oba |

**Tolerantní naopak nebýt** u překlepu v ID škály, chybějící šablony, hodnoty
mimo rozsah, domácnostní škály bez strategií, odkazu na neexistující blok,
variantu nebo odpověď, nespárované závorky, **ID bloku mimo tvar nebo s
neznámým typem** a **směrovaného jména v `scale_direct`**. Tam tolerance znamená
špatná čísla v dokumentu — místo toho nabídni „mysleli jste …?".

**Parsování formátu dopadu na škály je čistá funkce s testy**
(`src/import/scale-impact.ts`). Je to malá věc volaná všude a její chyba se
projeví jako špatná čísla v dokumentech.

Výrazy v `Conditions` se v importu **jen načtou, uloží a zkontrolují syntakticky
a referenčně** — vyhodnocuje je až engine.

## Co se vědomě nemodeluje

- **Obecná tabulka vztahů.** Strukturně existují jen tři vazby: členství ve
  skupině, vedení skupiny a domácnost. Kde vztah mechanicky rozhoduje, je
  zachycený jako odpověď odkazující na ID jiné postavy — to jsou ta data.
  Všechno ostatní je text v šabloně.
- **Vášně, obavy, ambice.** Jsou to bloky šablony, ne tabulka. Mění se každou
  kapitolu tím, že se vybere jiná varianta. Když má některá ovlivnit pozdější
  kapitolu, přidá se k ní příznak nebo škála — **text sám se do enginu nikdy
  nevrací.**
- **Podmíněné podotázky uvnitř dotazníku.** Autoři je vědomě vyškrtli, dotazník
  je plochý. (Výběr sady otázek pro další kapitolu podle §6.8 je něco jiného.)
- Obecné pravidlo: **text, který se jen tiskne, není datový model; co má
  ovlivnit budoucnost, je škála nebo příznak.**
- **Pásma nejsou per postava.** Definice škály včetně pásem je per běh a škálu;
  dvě postavy nemohou mít u téže škály jiná pásma.

## Doménová pravidla, na která se snadno zapomene

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích**, jednou po sečtení
  posunů. Ořez se loguje do auditu a hlásí v trace — je to signál špatně
  nastavených vah, ne detail. U sdílené škály to platí dvojnásob: přispívá do
  ní víc lidí, takže se hranice dosáhne snáz.
- **Pásma škál mají prahy i názvy v datech, nikdy v kódu.** Výchozí rozdělení
  1–3 / 4–5 / 6–8 / 9–10, ale počet i hranice jsou per škála a názvy jsou
  vlastní pro každou škálu.
- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem.
  Když hráč nedodá papír, org dotazník **vyklikne ručně** a odpověď se v auditu
  označí „doplněno orgem". Přepočet **nelze spustit**, dokud něco chybí;
  aplikace vypíše seznam chybějících. Žádné tiché doplňování na pozadí. Nikdy.
- **Otázky jsou vlastní pro každou postavu.** Žádná sdílená sada, ~3 otázky na
  postavu a kapitolu. Volby odpovědí, které jmenují jinou postavu, odkazují na
  **ID postavy z registru**, ne na volný text — po sňatku se jinak provázání
  rozpadne.
- **Náhoda se hodí jednou a uloží.** Každý výskyt `RANDOM` ve výrazu má vlastní
  hod uložený jako běžná data. Přepočet hod **neopakuje**. Přehodit nebo
  přepsat lze jen ruční akcí orga, která jde do auditu včetně staré hodnoty.
  Žádné seedování není potřeba.
- **Vyloučení (negace) má vždy přednost před přiřazením.**
- **Dvě pravidla se stejnou prioritou a protichůdným výsledkem engine neřeší** —
  vyhodí konflikt do UI a nechá rozhodnout orga. (Mezi **variantami bloku** ale
  konflikt vzniknout nemůže, tam rozhoduje priorita úplně.)
- **Postavy se nemodelují nad rámec škál, příznaků a členství.** Charakterizace
  („závislý na piku") žije v pevném textu šablony, kterého se engine nedotkne.
- **Jméno postavy nikdy natvrdo v textech** — ani v textech variant. Všude
  `{JMENO}` / `{PRIJMENI}` / `{PRIJMENI_PARTNER}`, rozvine se až při naplnění
  dokumentu. Totéž platí pro názvy skupin a funkcí.
- **Kaskáda:** změna odpovědi ve vydané kapitole (nebo nouzová oprava
  konfigurace) označí dotčené kapitoly jako `dotčené`. Aplikace **sama nic
  nepřepočítá** — vynutí si rozhodnutí orga (přepočítat / ponechat jak je). Při
  „ponechat" si zapíše, že se výpočet a vydaný stav rozcházejí, a proč. Během
  hry je zdrojem pravdy **papír v rukou hráče**, ne databáze.
- **Uzamčení kapitoly není nikdy nevratné.** Stav `vydana` je měkká pojistka
  proti překlepu; editace vyžaduje potvrzení a důvod, obojí do auditu.
- **„Běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací.
- **Přihlášení je jedno sdílené heslo** (povinné, aplikace je na veřejném
  internetu) plus pole „Kdo jsi?". Žádné účty ani role (§3.1).
- **Zálohování je tlačítko „Zazálohovat"** — konzistentní snapshot ke stažení,
  po každé vydané kapitole. Na Drive patří snapshoty, nikdy živá databáze (§18.5).

## Rozvržení aplikace (§6.4)

**Klasická webová aplikace, ne mřížka.** Org přepisuje jeden papírový dotazník
po druhém, takže na obrazovce má být právě ta postava, jejíž papír drží v ruce.
Mřížka byla zvažována a zamítnuta — při 23 postavách nic neušetří.

- **Horní lišta:** přepínač běhu (barevně odlišený), kapitoly 1/2/3 se stavem,
  **pět sekcí — Postavy · Skupiny · Přepočet · Výstupy · Správa**, vpravo jméno
  z pole „Kdo jsi?".
- **Levý panel:** seznam postav se jménem, skupinou a indikátorem vyplněnosti
  (**barva plus tvar**, ne jen barva), nahoře souhrn „Vyplněno 14 / 23",
  hledání a filtr „jen nevyplněné". Panel si drží pozici při přepínání.
- **Výstupy** mají dvě záložky nad jedním přepočtem: _Přehled_ (tabulka škál
  a pásem) a _Dokumenty_. **Správa** drží nahrání `.xlsx` a šablon, archiv
  nahraných souborů, výsledky validací a audit log.
- **Hlavní plocha:** dotazník postavy, pod ním aktuální stav škál (u sdílených
  značka, s kým jsou sdílené). **Automatické ukládání** po každé změně
  s viditelným potvrzením — žádné tlačítko „Uložit". Tlačítko **„Hotovo a další
  nevyplněná"** je hlavní cesta procházení, má klávesovou zkratku.
- **Vzhled:** nástroj pro práci pod časovým tlakem. Hustá čitelná sazba, stav
  vždy viditelný bez rolování, použitelné na notebooku i tabletu, ve světlém
  i tmavém režimu. Lehká **retro stylizace** (socialistické Československo) je
  vítaná, ale **nese ji barva a typografie** — tlumené vybledlé odstíny —
  **ne textury, ozdobné rámečky ani grafika napodobující starý papír.**
  Čitelnost má přednost před stylizací.

## Jazyk a pojmenování

- UI a data jsou **česky**, včetně diakritiky v exportech.
- Tabulky, sloupce a identifikátory v kódu jsou **anglicky** (`character_scale_values`).
- Hodnoty doménových stavů jsou **česky bez diakritiky** (`rozpracovana`,
  `spocitana`, `vydana`, `smerovana`, `domacnost`, `nedopocitano`) — aby se
  v SQL literálech nemíchala diakritika.
- Dokumentace (`.md`) česky. **Komentáře v kódu anglicky** — viz globální
  `~/.claude/CLAUDE.md`: co nejstručněji, jen k nezjevným věcem, a vysvětlují
  **proč**, ne co kód dělá.

## Konvence ID ze zdrojové tabulky

| Typ | Vzor | Příklad |
|---|---|---|
| Běh | `<datum>_<písmeno>` | `2026-09-12_A` |
| Otázka | `Q_<Postava>_<Kapitola>_<Poradi>` | `Q_Marie_1_1` |
| Odpověď | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel` |
| Škála | `S_<Postava>_<Skala>` | `S_Marie_Wealth`, `S_Marie_Wealth_osobni` |
| Příznak | `F_<Nazev>` | `F_Svatba` |
| Blok | `B_<Postava>_<Kapitola>_<Typ>_<Poradi>` — kapitola, **ze které** se odvozuje | `B_Marie_1_Historie_1` (v listu `2_Content`) |
| Varianta | `V_<BlockID bez B_>_<Pismeno>` | `V_Marie_1_Historie_1_A` |
| Domácnost | `H_<běh>_<pořadí>` — **neprůhledné, bez jmen** | — |
| Anketa | libovolné, ze sloupce `Anketa` | `VOLBA_VEDENI` |

**Části ID se vždy oddělují `_`**, i mezi postavou a kapitolou (`Q_Marie_1_1`,
ne `Q_Marie1_1`). ID musí jít rozložit jednotně napříč všemi typy.

Dopad na škály: čárkou (nebo středníkem) oddělený seznam
`S_Marie_Wealth+3, S_Marie_Regime-2`. Prázdná buňka = žádný dopad.
U `scale_direct` se píše `S_Marie_Wealth_osobni=VALUE` (vždy s příponou) —
číslo přijde z odpovědi. Speciální hodnota odpovědi `_OTHER_` = volný text
doplněný orgem.

Listy konfigurace: `Characters`, `N_Questions` (otázky, odpovědi, `Zdroj`,
`Parova`, `Soukrome`, `Anketa`, `Condition` od kapitoly 2, `Scale Impact`,
`Flags`, `Effects`), `N_Scales` (škály, pásma, rozsah platnosti, strategie
slévání), `2_Content` a `3_Content` (**`1_Content` neexistuje**), `Validations`,
volitelně `N_Rules`.

Škála se v databázi ukládá **rozložená**: `S_Marie_Wealth_osobni` = postava
`Marie` + škála `Wealth_osobni`. Definice škály včetně pásem je per běh
a škálu, ne per postavu. **Příznaky se nikde nedeklarují** — vznikají tím, že je
nějaká odpověď nastaví.

## Výstupy

Jeden zip na kapitolu (§10.4): dokumenty postav a skupin, highlighty, dotazník
pro další kapitolu, `vysledky.xlsx` a `beh.json`. Název běhu je součástí názvu
souboru. U každého dokumentu navíc tlačítko **„Kopírovat do schránky"** — org
pak jen přepíná záložky a mačká Ctrl+V (§10.5).

Typy dokumentů (§8.6): dokument postavy, dokument skupiny, highlight událostí,
sada otázek pro další kapitolu (sestavená podle §6.8). Engine k nim umí
vygenerovat **tag pro orga** („nastala událost X → vytáhni dokument č. 42") —
strojově čitelný signál pro fyzické materiály připravené mimo systém.

## Postup práce

- Migrace se **negenerují ručně**: `npm run db:generate` ze schématu. Schéma
  v `src/db/schema/` je jediný zdroj pravdy o struktuře databáze.
- Co Drizzle neumí vyjádřit, patří do `db/sql/` jako **idempotentní** skript
  a pouští se `npm run db:sql` po migracích.
- **Unikát, na který míří cizí klíč, musí být `unique()`, ne `uniqueIndex()`.**
  Drizzle generuje `CREATE UNIQUE INDEX` až za `ALTER TABLE ADD CONSTRAINT
  ... FOREIGN KEY`, takže FK na `(run_id, id)` by v migraci neměl na co ukázat
  a migrace spadne. `uniqueIndex()` zůstává jen pro **částečné** unikáty
  s `.where()`, které constraint neumí (např. jeden vydaný přepočet na kapitolu).
- Testy pokrývají primárně **engine a import**. Zbytek se testuje ručně. Výjimka:
  `src/db/schema.test.ts` hlídá architektonické pravidlo 2.
- Fixtures pro import jsou v `documents/`: `fixture-platny.xlsx` musí projít,
  `fixture-vadny.xlsx` musí být odmítnutý se všemi chybami najednou. Pro testy
  enginu je nad nimi `src/testing/fixture-run.ts`.
- **Lokální Postgres:** `scripts/pg.sh start` (bez Dockeru a bez roota).
  Node je přes nvm, v novém shellu je potřeba `source ~/.nvm/nvm.sh`.
- Než začneš stavět další vrstvu, ověř `npm run typecheck` a `npm test`.

## Rozsah MVP (§14)

Do prvního běhu musí být, **bez jakéhokoli napojení na Google**:

1. Import konfigurace z `.xlsx` + validace
2. Nahrání šablon jako Markdown
3. Rozvržení aplikace a zadávání odpovědí
4. Engine: podmínky, efekty, priority, negace, váhy, ankety
5. Trace „proč" u každé změny
6. JSON mezivýstup → editace → zip s `.md` + „Kopírovat do schránky"

Fáze 2 (jen když zbude čas): napojení na Google, vizualizace vazeb, pokročilé
kontroly, porovnání dvou běhů. **Google vrstva je poslední, ne první** — je to
jediná část, kterou lze při skluzu vypustit a hra se přesto odehraje.
