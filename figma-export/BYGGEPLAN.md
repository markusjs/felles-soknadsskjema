# Prototype → Figma: byggeplan

Underlag for å bygge prototypen som ekte Figma-frames (auto layout, komponenter,
variabler). Tokens ligger i `figma-tokens.json` ved siden av denne fila.

**Forutsetning:** Figma-connectoren med skrivetilgang må være autorisert *før*
sesjonen startes — verktøyregisteret låses ved oppstart, så en server som
autoriseres underveis blir ikke tilgjengelig i den sesjonen.

## Rekkefølge

1. **Variabler** — opprett collections fra `figma-tokens.json`: `color`, `font`,
   `space`, `radius`, `shadow`.
2. **Kjernekomponenter** — bygg med variabler bundet, ikke hardkodede verdier.
3. **Skjermer** — sett sammen seksjon for seksjon av komponentene.

## Tokens (utledet fra prototypens inline CSS)

| Gruppe | Verdier |
|---|---|
| Handling | `#0A4FB8` primær · `#083D8F` hover · `#F2F7FF` lys flate |
| Merkevare | `#46000A` bordeaux (steg-titler) · `#AF0018` rød · `#F9CCD2` · `#FCF8F5` |
| Tekst | `#1A1A1A` · `#5C5C5C` · `#767676` · `#FFFFFF` |
| Kant/flate | `#D4D4D4` · `#E6E6E6` · `#F5F5F5` |
| Tilbakemelding | `#166600` suksess · `#AF0018` feil |
| Typografi | Graphik (sans), Produkt / Source Serif 4 (serif) · vekt 400/500/600 |
| Skriftstørrelser | 28 steg-tittel · 20/18/16 · **15 og 14 brødtekst** · 13/12 hjelpetekst |
| Radius | 8 standard · 999 pill · 4 små · 16 modal |
| Spacing | 4·6·8·10·12·14·16·18·20·24·32·40 (16 og 12 dominerer) |
| Skygge | `0 4px 32px rgba(0,0,0,0.12)` — kun på modaler |

## Komponenter å bygge først

Fra søknadsskjemaets CSS-klasser:

- **Knapp** — `btn-primary` / `btn-secondary`, varianter: default / hover / disabled
- **Stepper** — `stepper-node` + `stepper-label`, tilstander: kommende / aktiv / fullført
- **Input** — `input-wrap`, varianter: default / fokus / **error** (kant `#AF0018`,
  flate `#FCF8F5`) + `error-msg` under
- **Radio** — `radio-option` med `radio-circle`, valgt / ikke valgt
- **Betalingsvalg** — `payment-option-group` + `payment-radio` + `payment-expand`
  (utvidbart panel, valgt/lukket/åpen)
- **Sammendrag-trekkspill** — `summary-accordion-header` / `-body` / `-chevron`
- **Tooltip** — `tooltip-box` / `s0-tooltip`
- **Chip / badge** — pill-radius, f.eks. `tag-location` (blå flate, hvit tekst)
- **OTP-input** — `otp-input`, sifferfelt
- **Konfliktbanner** — `conflict-banner` + `conflict-row`
- **Kvitteringsblokk** — `receipt-paid-check` / `-title` / `-sub` (grønn)

## Skjermer i første runde

### 1. Søknadsskjema — `sok-skjema.html`
Hovedflyten. Stegene ligger som `id="stepN"` i markupen:

| Steg | Innhold |
|---|---|
| step0 | Programsøk, prioritetsliste, emnekort (`s0-*`-klassene) |
| step1 | «Har du studert ved Kristiania før?» |
| step1b | Opprett søknad — ny bruker / logg inn med Feide |
| step2 | Bekreftelseskode (OTP) |
| step3 | Opplysninger — readonly-visning vs. redigerbare felt, språk, adresse |
| step3b | Adresse (forts.) |
| step4 | Oppstart — `opp-date-option` |
| step4b | Oppstart (forts.) |
| step5 | Sammendrag, betaling (program + nettemner), send |
| kvittering | «Takk for din søknad!» + «Hva skjer nå?» |

Bygg hvert steg som egen frame. Feiltilstander og valgte tilstander skal med
som egne varianter, ikke bare default.

### 2. Studieplanlegger + handlekurv — `index.html`, `handlekurv.html`
`handlekurv.html` er «Søknader (4)» — kortliste med `card-row`, `checkout-grid`,
`rabattkode-row`, `delete-btn`.

### 3. Studietilbud / søk — `utdanning.html`
«Alle studier» med filterpanel og resultatliste. Filtrene finnes i to visninger
(desktop-panel og mobil) — sjekk hvilken som skal bygges.

### 4. Studieside som mal — én fil fra `studier/`
Velg én representativ (24 finnes). `enkeltemner/` har 270 sider på egen mal —
vurder om den også trengs som egen mal.

## Notater

- Prototypen er statisk HTML uten CSS-variabler; alle verdiene over er trukket
  ut av inline `<style>`-blokkene i de fire hovedsidene.
- `index_files/` og `studietilbud _ Kristiania_files/` er bundlet CSS/JS fra det
  ekte Kristiania-nettstedet — ikke prototypens egen styling. Ignorer disse.
- Kjør prototypen lokalt med launch-konfigurasjonen «Kristiania Prototype»
  (port 3000) for å se tilstander som bare finnes i JS (modaler, tabs).
