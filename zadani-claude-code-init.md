# Inicializace projektu — zadání pro Claude Code

*Kompletní specifikace je v souboru `zadani-larp-engine.md`. Ten je zdrojem pravdy; tenhle dokument je jen startovní úkol.*

## Kontext

Stavíme interní webovou aplikaci pro organizátory LARPu. Zpracovává dotazníky vyplněné hráči na konci každé ze tří kapitol, přepočítává vnitřní stav postav a generuje materiály pro další kapitolu.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy hry. Uživatelé jsou 3–5 organizátorů. Deadline ~3 měsíce.

## Než začneš

1. Přečti si `zadani-larp-engine.md` celý.
2. Ptej se jen na to, co v něm chybí nebo si odporuje. Kde je rozhodnutí označené `[ROZHODNUTO]`, neotevírej ho znovu.
3. Napiš `CLAUDE.md` se shrnutím architektonických pravidel z bodů níže, ať je máme po ruce v každé další session.

## Technologie [ROZHODNUTO]

| Vrstva | Volba |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Databáze | Postgres (Neon), lokálně přes Docker nebo Neon dev větev |
| ORM | Drizzle |
| UI | Tailwind, vlastní jednoduché komponenty |
| Testy | Vitest, primárně na engine pravidel |
| Import tabulek | SheetJS (`xlsx`) |
| Zip | `jszip` nebo `archiver` |
| Hosting | Vercel |

Žádné Google API. Verze 1 komunikuje se světem **výhradně přes nahrané a stažené soubory**.

## Tři architektonická pravidla, která platí od prvního commitu

**1. Engine pravidel je čistá funkce.**

```ts
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Bez databáze, bez sítě, bez Reactu, bez importů z `app/`. Žije ve vlastním adresáři (např. `src/engine/`) a jde otestovat bez rozjetí aplikace. `trace[]` je zároveň podkladem pro vysvětlení „proč" v UI. Tohle je nejdůležitější pravidlo v celém projektu.

**2. `run_id` je v každé tabulce a v každém dotazu.**

Dva běhy hry běží současně a jejich data se nesmí potkat. Přístup k datům vede přes jedinou vrstvu, která **vyžaduje `runId` jako povinný argument** — dotaz bez něj nesmí jít napsat. Izolace drží strukturou kódu, ne kázní.

**3. Nic se nepřepisuje destruktivně.**

Každý přepočet se ukládá jako nová verze. Audit log je append-only a u každé změny je zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po, a které pravidlo změnu způsobilo.

## Úkol pro tuhle session

Založ projekt a navrhni datové schéma. **Zatím žádné UI a žádný engine** — chci nejdřív vidět datový model a prodiskutovat ho.

1. **Inicializace projektu**: Next.js + TypeScript + Tailwind + Drizzle + Vitest. `.gitignore`, `.nvmrc`, `README.md` s postupem lokálního spuštění.
2. **Schéma databáze** v Drizzle, pokrývající:
   - `runs` — běh hry. ID ve tvaru `2026-09-12_A`, popisný název, stav, verze konfigurace
   - `chapters` — kapitola v rámci běhu, stav `rozpracovaná` / `spočítaná` / `vydaná`, příznak `dotčená`
   - `characters` — postava v běhu: jméno, příjmení, skupina, ID šablony
   - `groups` — skupina, členové, vedoucí
   - `scales` — definice škál včetně prahů a názvů pásem (název pásma je vlastní pro každou škálu)
   - `character_scale_values` — hodnota škály postavy v kapitole, celé číslo 1–10
   - `flags` — příznaky událostí u postavy
   - `questions`, `answer_options` — otázky jsou **vlastní pro každou postavu**, žádná sdílená sada
   - `answers` — odpověď postavy v kapitole, příznak „doplněno orgem", uložený hod kostkou
   - `rules` — podmínka, efekt, priorita, váha, příznak vyloučení (negace)
   - `templates` — šablona dokumentu jako Markdown se značkami `{BLOK ID}` … `{/BLOK}` a `{PROMENNA}`
   - `computations` — verze přepočtu: běh, kapitola, verze, kdo, důvod, výsledek, trace
   - `audit_log` — append-only
   - `config_versions` — verze importované konfigurace, vázaná na běh při jeho založení
3. **TypeScript typy pro engine** — vstupní a výstupní tvary funkce `evaluate`, včetně tvaru záznamu v `trace[]`.
4. **Migrace** a seed skript s ukázkovými daty (postava Marie Balážová, skupina „Srdce party", škály Wealth / Regime / Control).

## Na co si dát pozor

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích.** Ořez se loguje — je to signál špatně nastavených vah.
- **Pásma škál** mají prahy i názvy definované v datech, nikdy v kódu. Výchozí rozdělení 1–3 / 4–5 / 6–8 / 9–10, ale počet i hranice jsou per škála.
- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem. Přepočet nelze spustit, dokud něco chybí.
- **Náhoda se hodí jednou a uloží.** Přepočet hod neopakuje, použije uloženou hodnotu. Přehodit lze jen ruční akcí do auditu.
- **Podmínky pravidel neparsuj z textu.** Ukládej je strukturovaně (subjekt, operátor, hodnota, spojka, skupina). Vlastní jazyk na výrazy nepiš.
- Postavy se nemodelují nad rámec škál, příznaků a členství. Charakterizace žije v pevném textu šablony.

## Co udělat na konci

Shrň schéma v přehledu vztahů a napiš, kde sis musel domyslet rozhodnutí, které v zadání nebylo. Pak počkej na moji zpětnou vazbu — engine budeme stavět až v další session.
