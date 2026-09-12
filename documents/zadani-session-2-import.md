# Session 2: Import konfigurace a validace

_Kompletní specifikace je v `zadani-larp-engine.md`. Ten je zdrojem pravdy._

## Kde jsme

Projekt je inicializovaný, datové schéma stojí. Engine ještě neexistuje — a v téhle session ho nezakládej.

## Co se staví teď

**Založení běhu, cesta od nahraného souboru k naplněné databázi, a kontrola, že to, co přišlo, dává smysl.**

Bez tohohle nemá engine na čem běžet a autor hry nemá jak zjistit, že se v tabulce upsal.

## Vstup

Autor hry stáhne Google Sheet přes _Soubor → Stáhnout → Microsoft Excel_. Vznikne **jeden `.xlsx` se všemi listy**. Ten se nahraje do aplikace.

**Jiný formát se nepodporuje.** Žádné nahrávání jednotlivých `.csv` — `.xlsx` drží všechny listy v jednom souboru a není důvod mít druhou cestu.

### Listy v souboru

| List                                        | Obsah                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Characters`                                | Registr postav: ID, jméno, příjmení, skupina, ID šablony, počáteční hodnoty škál pro kapitolu 1                    |
| `1_Questions`, `2_Questions`, `3_Questions` | Otázky, odpovědi, dopady na škály, zapínané bloky a příznaky, zdroj (`hráč` / `org`), příznak `párová`             |
| `1_Scales`, `2_Scales`, `3_Scales`          | Definice škál: rozsah platnosti (`postava` / `domácnost`), prahy a názvy pásem, strategie sloučení a rozdělení     |
| `1_Content`, `2_Content`, `3_Content`       | Bloky a jejich varianty: text, priorita, podmínka (§8.2). **Ukázka je v `Konfigurace_Struktura_-_2_Content.csv`.** |
| `Validations`                               | Konfigurace kontrol                                                                                                |

Konvence ID a formát sloupců jsou v §4.2 a §4.5. **Formát dopadu na škály:** čárkou oddělený seznam `S_<Postava>_<Skala><znaménko><číslo>`, například `S_Marie_Wealth_osobni+3, S_Marie_Regime-2`.

## Co má session dodat

1. **Parser `.xlsx`** přes SheetJS. Čte všechny listy, mapuje je na tabulky ze schématu.
2. **Jedna platná konfigurace na běh.** Žádné verzování, žádný diff (§6.5). Do prvního přepočtu jde nahrávat volně a opakovaně, poté už jen s potvrzením a důvodem do auditu.
3. **Archiv nahraných souborů.** Každý nahraný `.xlsx` a `.md` se odloží tak, jak přišel, jako příloha běhu. Nahrazuje to verzování a je to levnější i úplnější.
4. **Validace** (seznam níže) se zobrazeným výsledkem.
5. **Nahrání šablon** jako `.md` souborů, víc najednou nebo v zipu. Přiřazení šablony k postavě podle ID, s přehledem, komu šablona chybí.
6. **Obrazovka „Správa“** — nahrání souborů, archiv nahraných souborů ke stažení, výsledky validací.

### Založení běhu — dělá se tady

**Běh musí existovat dřív, než má kam přistát konfigurace**, takže vzniká v téhle session, ne dřív a ne později. V session 1 byla jen tabulka `runs` ve schématu, žádná obrazovka.

7. **Přihlášení**: jedno sdílené heslo a pole „Kdo jsi?“, uložené do prohlížeče (§3.1). Jméno se připojuje ke každému záznamu v auditu.
8. **Založení běhu**: ID se generuje automaticky ve tvaru `2026-09-12_A` z data a písmene, vedle něj volitelný popisný název k přepsání (§3.2).
9. **Seznam a přepínání běhů**: přepínač trvale v horní liště, **barevné odlišení běhu** (A modrá, B jantarová) z tématu (§3.3).
10. **Stavy běhu a kapitol** jen jako datový základ: běh `založen` / `aktivní` / `archivován`, kapitola `rozpracovaná` / `spočítaná` / `vydaná`. Přecházení mezi nimi se řeší v pozdějších sessions, teď stačí, že se stav zobrazuje.

**Každý dotaz do databáze už tady musí jít přes vrstvu vyžadující `runId`.** Je to první session, kde se s daty opravdu pracuje, takže se tu to pravidlo buď zavede, nebo se později dohání napříč celým projektem.

## Validace

Rozděl na **chyby** (blokují použití konfigurace) a **varování** (pustí dál, ale upozorní).

**Chyby:**

- Chybějící povinný list nebo sloupec
- Odkaz na neexistující postavu, škálu, skupinu nebo blok
- Odpověď bez otázky, otázka bez odpovědí
- Nesplnitelný formát dopadu na škály (překlep v ID, chybějící znaménko)
- Nespárovaná značka `{BLOK}` v šabloně
- Blok očekávaný z odpovědí a chybějící v šabloně, nebo naopak
- Domácnostní škála bez definované strategie sloučení a rozdělení
- Postava bez přiřazené šablony

**Varování:**

- Pravidlo, jehož podmínka nemůže nikdy nastat
- Dvě pravidla se stejnou prioritou a protichůdným efektem
- Textový blok, na který nevede žádná cesta
- Žádná odpověď v kapitole nesahá na jeden z dvojice účtů `_osobni` / `_spolecny` — skoro jistě překlep v ID škály
- Škála, se kterou nikdy nic nehýbe

**Každá hláška musí říct, kde je problém: list, řádek, sloupec, hodnota.** „Neplatný odkaz na škálu" je nepoužitelné. „List `2_Questions`, řádek 34, sloupec `Scale Impact`: škála `S_Marie_Welth_osobni` neexistuje, mysleli jste `S_Marie_Wealth_osobni`?" je použitelné. Autor hry opravuje v tabulce a musí tam ten řádek najít.

## UI téhle session

Je to první obrazovka projektu, takže s ní vzniká i kostra rozhraní. **Postav ji rovnou správně**, předělávat ji později je dražší než ji napsat teď.

- **MUI**, ne vlastní CSS. `AppRouterCacheProvider` z `@mui/material-nextjs`, jinak při načtení problískne nestylovaný obsah.
- **Styluj přes CSS Modules a data atributy, nikdy přes `sx` ani inline `style`** (§15.1). Platí to od první komponenty — přepisovat to později znamená projít celý projekt.
- **`theme.ts` s vlastní paletou** hned teď (§15.1): tlumené retro odstíny, menší základní písmo, globální `defaultProps: { size: 'small', margin: 'dense' }`, světlý i tmavý režim. Výchozí Material vzhled neodpovídá §6.4.
- **Kostra rozvržení** z §6.4: `AppBar` s přepínačem běhu a pěti sekcemi, `Drawer` pro levý panel. Ostatní sekce můžou být zatím prázdné, ale navigace musí stát.
- **Chyby validace zobraz jako seznam, který se dá procházet a filtrovat**, ne jako zed’ textu. Jich budou desítky a autor je prochází s tabulkou otevřenou vedle.

## Na co si dát pozor

- **Chybná konfigurace nikdy nesmí shodit aplikaci.** Parser sbírá všechny chyby a vrátí je najednou, nekončí na první. Autor chce opravit dvacet překlepů v jednom kole, ne dvacetkrát nahrávat soubor.
- **Import je idempotentní.** Dvojí nahrání téhož souboru nesmí nic zdvojit.
- **`run_id` je povinný argument datové vrstvy** i tady.
- Diakritika v ID a názvech listů musí projít bez poškození.
- Prázdné buňky, mezery navíc a slučované buňky jsou v exportu z Google Sheets běžné. Ošetři je tiše, ale zmíň v přehledu importu, co se ořezávalo.
- **Fill-down sloučených buněk.** Ve skutečném listu jsou `Character` a `Block ID` vyplněné jen na prvním řádku skupiny, další řádky mají prázdno. Parser musí hodnotu dopěstovat dolů.
- **Výrazy v `Conditions` v téhle session jen načti, ulož a zkontroluj syntaxi** pomocí `jsep` nebo `expr-eval`. Vyhodnocování je session 3. Kontrola syntaxe ale patří sem — v ukázkovém listu už je jedna chybějící závorka.
- **Parsování formátu dopadu na škály piš jako čistou funkci s testy.** Je to malá věc, kterou budeš volat všude, a její chyba se projeví jako špatná čísla v dokumentech.

## Co v téhle session nedělat

- Engine pravidel. Výrazy z `Conditions` jen načti, ulož a zkontroluj syntaxi — nevyhodnocuj je.
- Zadávání odpovědí, přepočet, generování dokumentů.
- Jakékoli napojení na Google API.

## Na konci

Nahraj dostupný list `2_Content` a ukaž, co validace našly. Zbytek listů zatím neexistuje — vyrob si k nim minimální fixtures podle §4.2 a čdej se jimi i v testech. **Očekávej, že najdou dost** — to je známka, že fungují, ne že je něco rozbité. Napiš, které chyby se opakují a jestli jde některé ošetřit tolerantněji už v parseru.
