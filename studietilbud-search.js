/**
 * studietilbud-search.js
 * Vanilla JS søk og filtre for studietilbudsiden.
 * Leser data fra React-props og rendrer fungerende kort med søk/filtre.
 */
(function() {
  'use strict';

  /* ── Data ──
     Foretrekk den fulle katalogen i studietilbud-data.js (449 oppføringer,
     alle nivåer inkludert enkeltemner). Faller tilbake til React-propsene i
     siden hvis datafila ikke er lastet. */
  var catalogItems = window.STUDIETILBUD_ITEMS;
  if (!catalogItems || !catalogItems.length) {
    var props = (window.__reactProps || {})['8a1a76fd-json'];
    if (!props || !props.initialResult || !props.initialResult.items) return;
    catalogItems = props.initialResult.items;
  }

  /* ── Mapping: linkUrl → lokale studiesider ── */
  var localPages = {
    '/studier/bachelor/cybersikkerhet/': '/studier/Cybersikkerhet - Bachelor _ Kristiania',
    '/studier/bachelor/hr-organisasjonspsykologi-ledelse/': '/studier/HR organisasjonspsykologi og ledelse - Bachelor _ Kristiania',
    '/studier/bachelor/psykologi-og-psykisk-helse/': '/studier/Psykologi og psykisk helse - Bachelor _ Kristiania',
    '/studier/bachelor/rettsvitenskap/': '/studier/Rettsvitenskap - Bachelor _ Kristiania',
    '/studier/bachelor/digital-markedsforing-og-salgsledelse/': '/studier/Digital markedsføring og salgsledelse - Bachelor _ Kristiania',
    '/studier/bachelor/okonomi-og-administrasjon/': '/studier/Økonomi og administrasjon - Bachelor _ Kristiania',
    '/studier/bachelor/design/': '/studier/Design - Bachelor _ Kristiania',
    '/studier/bachelor/informasjonsteknologi-fullstack-utvikling/': '/studier/Informasjonsteknologi Fullstack - Bachelor _ Kristiania',
    '/studier/bachelor/medier-og-kommunikasjon/': '/studier/Medier og kommunikasjon - Bachelor _ Kristiania',
    '/studier/bachelor/film-tv-og-medier/': '/studier/Film TV og medier - Bachelor _ Kristiania',
    '/studier/bachelor/musikk/': '/studier/Musikk - Bachelor _ Kristiania',
    '/studier/bachelor/hr-og-personalledelse/': '/studier/HR og personalledelse - Bachelor _ Kristiania',
    '/studier/bachelor/computer-arts/': '/studier/Computer Arts - Bachelor _ Kristiania',
    '/studier/master/cyber-security/': '/studier/Cyber Security - Master _ Kristiania',
    '/studier/master/organisasjonspsykologi-og-ledelse/': '/studier/Organisasjonspsykologi og ledelse - Master _ Kristiania',
    '/studier/master/master-i-okonomi-og-ledelse/': '/studier/Økonomi og ledelse - Master _ Kristiania',
    '/studier/master/design/': '/studier/Design - Master _ Kristiania',
    '/studier/fagskole/grafisk-design--visuell-identitet-og-brukeropplevelse/': '/studier/Grafisk design - Fagskole _ Kristiania',
    '/studier/fagskole/film/': '/studier/Film - Fagskole _ Kristiania',
    '/studier/fagskole/interiordesign-og-romarkitektur/': '/studier/Interiørdesign - Fagskole _ Kristiania',
    '/studier/nettstudier/bachelor/administrasjon-og-ledelse/': '/studier/Administrasjon og ledelse - Bachelor (nettstudie)',
    '/studier/nettstudier/bachelor/bachelor-i-anvendt-psykologi/': '/studier/Anvendt psykologi - Bachelor (nettstudie) _ Kristiania',
    '/studier/fagskole/frontend-utvikling/': '/studier/Frontend-utvikling - Bli frontend-utvikler på 1 år',
    /* Enkeltemner med lokal side. Nøklene er linkUrl-ene fra katalogen, og må
       peke på samme variant som studieplanleggeren bruker (se emnekodene). */
    '/studier/nettstudier/enkeltemne/akademisk-lesing-og-skriving/': '/enkeltemner/Akademisk lesing og skriving – enkeltemne _ Kristiania nettstudier',
    '/studier/nettstudier/enkeltemne/bedriftsokonomi/': '/enkeltemner/Bedriftsøkonomi – enkeltemne _ Kristiania nettstudier',
    '/studier/nettstudier/enkeltemne/kreativitet-innovasjon-og-nyskapning/': '/enkeltemner/Kreativitet, innovasjon og nyskapning (nett) _ Høyskolen Kristiania',
    '/studier/nettstudier/enkeltemne/markedsforing/': '/enkeltemner/Markedsføring',
    '/studier/nettstudier/enkeltemne/organisasjon-og-ledelse/': '/enkeltemner/Organisasjon og ledelse – enkeltemne _ Kristiania nettstudier',
    '/studier/nettstudier/enkeltemne/samfunnsvitenskapelig-metode1/': '/enkeltemner/Samfunnsvitenskapelig metode',
    '/studier/nettstudier/enkeltemne/forhandlinger-og-pavirkning/': '/enkeltemner/Ta emnet Forhandling og påvirkning på nett',
    '/studier/nettstudier/enkeltemne/innforing-i-strategi/': '/enkeltemner/Ta emnet Innføring i strategi på nett',
    /* Katalogen har dublett-oppføringer av to av emnene (egen CMS-side med
       annen emnekode: 6324 og 6343). De vises som egne kort i søket, akkurat
       som på kristiania.no. Vi sender dem til samme lokale side, så ingen av
       kortene faller ut av prototypen. */
    '/studier/nettstudier/enkeltemne/bedriftsokonomi2/': '/enkeltemner/Bedriftsøkonomi – enkeltemne _ Kristiania nettstudier',
    '/studier/nettstudier/enkeltemne/samfunnsvitenskapelig-metode/': '/enkeltemner/Samfunnsvitenskapelig metode',
    /* 253 genererte enkeltemnesider (bygget fra kristiania.no, se enkeltemner/_felles). */
    '/studier/nettstudier/enkeltemne/3d-modellering-og-interiorprosjekter/': '/enkeltemner/3d-modellering-og-interiorprosjekter',
    '/studier/nettstudier/enkeltemne/advanced-financial-decision-making/': '/enkeltemner/advanced-financial-decision-making',
    '/studier/nettstudier/enkeltemne/akademiske-tekster-og-statistiske-metoder/': '/enkeltemner/akademiske-tekster-og-statistiske-metoder',
    '/studier/nettstudier/enkeltemne/alminnelig-forvaltningsrett/': '/enkeltemner/alminnelig-forvaltningsrett',
    '/studier/nettstudier/enkeltemne/anatomi/': '/enkeltemner/anatomi',
    '/studier/nettstudier/enkeltemne/anvendt-kunstig-intelligens-og-maskinlaring/': '/enkeltemner/anvendt-kunstig-intelligens-og-maskinlaring',
    '/studier/nettstudier/enkeltemne/arbeidsgiveransvaret/': '/enkeltemner/arbeidsgiveransvaret',
    '/studier/nettstudier/enkeltemne/arbeidslivspedagogikk/': '/enkeltemner/arbeidslivspedagogikk',
    '/studier/nettstudier/enkeltemne/arbeidsmiljo-og-psykologi/': '/enkeltemner/arbeidsmiljo-og-psykologi',
    '/studier/nettstudier/enkeltemne/arbeidsrett/': '/enkeltemner/arbeidsrett',
    '/studier/nettstudier/enkeltemne/arsregnskap-og-budsjett/': '/enkeltemner/arsregnskap-og-budsjett',
    '/studier/nettstudier/enkeltemne/arsregnskap-og-god-regnskapsskikk/': '/enkeltemner/arsregnskap-og-god-regnskapsskikk',
    '/studier/nettstudier/enkeltemne/arsregnskap-og-okonomistyring/': '/enkeltemner/arsregnskap-og-okonomistyring',
    '/studier/nettstudier/enkeltemne/arv-og-familierett/': '/enkeltemner/arv-og-familierett',
    '/studier/nettstudier/enkeltemne/avslutning-av-arbeidsforhold/': '/enkeltemner/avslutning-av-arbeidsforhold',
    '/studier/nettstudier/enkeltemne/bacheloroppgave-i-pedagogikk-og-spesialpedagogikk/': '/enkeltemner/bacheloroppgave-i-pedagogikk-og-spesialpedagogikk',
    '/studier/nettstudier/enkeltemne/bacheloroppgave/': '/enkeltemner/bacheloroppgave',
    '/studier/nettstudier/enkeltemne/bacheloroppgave2/': '/enkeltemner/bacheloroppgave2',
    '/studier/nettstudier/enkeltemne/barekraftig-drift-og-miljokrav/': '/enkeltemner/barekraftig-drift-og-miljokrav',
    '/studier/nettstudier/enkeltemne/barekraftig-markedsforing2/': '/enkeltemner/barekraftig-markedsforing2',
    '/studier/nettstudier/enkeltemne/big-data-analytics-for-business/': '/enkeltemner/big-data-analytics-for-business',
    '/studier/nettstudier/enkeltemne/biologi-kognisjon-og-motivasjon-i-et-laringsperspektiv/': '/enkeltemner/biologi-kognisjon-og-motivasjon-i-et-laringsperspektiv',
    '/studier/nettstudier/enkeltemne/business-analytics/': '/enkeltemner/business-analytics',
    '/studier/nettstudier/enkeltemne/business-consultancy-/': '/enkeltemner/business-consultancy-',
    '/studier/nettstudier/enkeltemne/business-negotiation/': '/enkeltemner/business-negotiation',
    '/studier/nettstudier/enkeltemne/bygg-og-brannforebygging/': '/enkeltemner/bygg-og-brannforebygging',
    '/studier/nettstudier/enkeltemne/co-creation/': '/enkeltemner/co-creation',
    '/studier/nettstudier/enkeltemne/data-og-teknologi-til-forretningsbruk/': '/enkeltemner/data-og-teknologi-til-forretningsbruk',
    '/studier/nettstudier/enkeltemne/databaser/': '/enkeltemner/databaser',
    '/studier/nettstudier/enkeltemne/delivering-successful-projects/': '/enkeltemner/delivering-successful-projects',
    '/studier/nettstudier/enkeltemne/delivering-successfull-projects-s/': '/enkeltemner/delivering-successfull-projects-s',
    '/studier/nettstudier/enkeltemne/developing-and-executing-strategy-s/': '/enkeltemner/developing-and-executing-strategy-s',
    '/studier/nettstudier/enkeltemne/developing-and-executing-strategy/': '/enkeltemner/developing-and-executing-strategy',
    '/studier/nettstudier/enkeltemne/digital-forretningsforstaelse/': '/enkeltemner/digital-forretningsforstaelse',
    '/studier/nettstudier/enkeltemne/digital-markedsforing/': '/enkeltemner/digital-markedsforing',
    '/studier/nettstudier/enkeltemne/digital-regnskapsforing/': '/enkeltemner/digital-regnskapsforing',
    '/studier/nettstudier/enkeltemne/digital-teknologi/': '/enkeltemner/digital-teknologi',
    '/studier/nettstudier/enkeltemne/digitalisering-og-forretningsanalyse/': '/enkeltemner/digitalisering-og-forretningsanalyse',
    '/studier/nettstudier/enkeltemne/digitalt-lederskap-og-selvledelse/': '/enkeltemner/digitalt-lederskap-og-selvledelse',
    '/studier/nettstudier/enkeltemne/docbr1-an-introduction-to-business-research/': '/enkeltemner/docbr1-an-introduction-to-business-research',
    '/studier/nettstudier/enkeltemne/docbr2-the-qualitative-researcher/': '/enkeltemner/docbr2-the-qualitative-researcher',
    '/studier/nettstudier/enkeltemne/docbr3-the-quantitative-researcher-/': '/enkeltemner/docbr3-the-quantitative-researcher-',
    '/studier/nettstudier/enkeltemne/economics-for-business/': '/enkeltemner/economics-for-business',
    '/studier/nettstudier/enkeltemne/eiendomsrett/': '/enkeltemner/eiendomsrett',
    '/studier/nettstudier/enkeltemne/endringsledelse4/': '/enkeltemner/endringsledelse4',
    '/studier/nettstudier/enkeltemne/energioptimalisering-og-barekraft/': '/enkeltemner/energioptimalisering-og-barekraft',
    '/studier/nettstudier/enkeltemne/entrepreneurship-and-creativity/': '/enkeltemner/entrepreneurship-and-creativity',
    '/studier/nettstudier/enkeltemne/epidemiologi-matvarekunnskap-og-barekraft/': '/enkeltemner/epidemiologi-matvarekunnskap-og-barekraft',
    '/studier/nettstudier/enkeltemne/ernaring-og-helse2/': '/enkeltemner/ernaring-og-helse2',
    '/studier/nettstudier/enkeltemne/ernaring-og-trening/': '/enkeltemner/ernaring-og-trening',
    '/studier/nettstudier/enkeltemne/ernaringskommunikasjon/': '/enkeltemner/ernaringskommunikasjon',
    '/studier/nettstudier/enkeltemne/erstatningsrett/': '/enkeltemner/erstatningsrett',
    '/studier/nettstudier/enkeltemne/et-individ--og-systemperspektiv-pa-ulike-larevansker/': '/enkeltemner/et-individ--og-systemperspektiv-pa-ulike-larevansker',
    '/studier/nettstudier/enkeltemne/etikk-samfunnsansvar-og-barekraft/': '/enkeltemner/etikk-samfunnsansvar-og-barekraft',
    '/studier/nettstudier/enkeltemne/evolusjon-og-atferd-hos-dyr-og-mennesker/': '/enkeltemner/evolusjon-og-atferd-hos-dyr-og-mennesker',
    '/studier/nettstudier/enkeltemne/fagskole-endringsledelse/': '/enkeltemner/fagskole-endringsledelse',
    '/studier/nettstudier/enkeltemne/fagskole-grunnleggende-regnskap/': '/enkeltemner/fagskole-grunnleggende-regnskap',
    '/studier/nettstudier/enkeltemne/fagskole-markedsforing/': '/enkeltemner/fagskole-markedsforing',
    '/studier/nettstudier/enkeltemne/fagskole-organisasjon-og-ledelse/': '/enkeltemner/fagskole-organisasjon-og-ledelse',
    '/studier/nettstudier/enkeltemne/fagskole-prosjektstyring/': '/enkeltemner/fagskole-prosjektstyring',
    '/studier/nettstudier/enkeltemne/financial-decision-making-s/': '/enkeltemner/financial-decision-making-s',
    '/studier/nettstudier/enkeltemne/financial-decision-making/': '/enkeltemner/financial-decision-making',
    '/studier/nettstudier/enkeltemne/financial-derivatives/': '/enkeltemner/financial-derivatives',
    '/studier/nettstudier/enkeltemne/finansregnskap-og-regnskapsteori/': '/enkeltemner/finansregnskap-og-regnskapsteori',
    '/studier/nettstudier/enkeltemne/finansregnskap/': '/enkeltemner/finansregnskap',
    '/studier/nettstudier/enkeltemne/flerkulturell-pedagogikk/': '/enkeltemner/flerkulturell-pedagogikk',
    '/studier/nettstudier/enkeltemne/flerspraklighet-og-laring/': '/enkeltemner/flerspraklighet-og-laring',
    '/studier/nettstudier/enkeltemne/forbrukeratferd/': '/enkeltemner/forbrukeratferd',
    '/studier/nettstudier/enkeltemne/foretaksrett-ii/': '/enkeltemner/foretaksrett-ii',
    '/studier/nettstudier/enkeltemne/foretaksrett/': '/enkeltemner/foretaksrett',
    '/studier/nettstudier/enkeltemne/forretningsjus/': '/enkeltemner/forretningsjus',
    '/studier/nettstudier/enkeltemne/forvaltning-drift-og-vedlikehold/': '/enkeltemner/forvaltning-drift-og-vedlikehold',
    '/studier/nettstudier/enkeltemne/forvaltningsrett/': '/enkeltemner/forvaltningsrett',
    '/studier/nettstudier/enkeltemne/foto/': '/enkeltemner/foto',
    '/studier/nettstudier/enkeltemne/fysiologi-1/': '/enkeltemner/fysiologi-1',
    '/studier/nettstudier/enkeltemne/fysiologi-2/': '/enkeltemner/fysiologi-2',
    '/studier/nettstudier/enkeltemne/fysiologi-og-sykdomslare/': '/enkeltemner/fysiologi-og-sykdomslare',
    '/studier/nettstudier/enkeltemne/global-purchasing--supply/': '/enkeltemner/global-purchasing--supply',
    '/studier/nettstudier/enkeltemne/global-strategy-analysis/': '/enkeltemner/global-strategy-analysis',
    '/studier/nettstudier/enkeltemne/green-and-sustainable-logistics-/': '/enkeltemner/green-and-sustainable-logistics-',
    '/studier/nettstudier/enkeltemne/grunnleggende-bruk-av-office-programmer2/': '/enkeltemner/grunnleggende-bruk-av-office-programmer2',
    '/studier/nettstudier/enkeltemne/grunnleggende-ernaring2/': '/enkeltemner/grunnleggende-ernaring2',
    '/studier/nettstudier/enkeltemne/helse-miljo-og-sikkerhet-hms/': '/enkeltemner/helse-miljo-og-sikkerhet-hms',
    '/studier/nettstudier/enkeltemne/helseforvaltning-og-samhandling-i-helsesektoren/': '/enkeltemner/helseforvaltning-og-samhandling-i-helsesektoren',
    '/studier/nettstudier/enkeltemne/helserett/': '/enkeltemner/helserett',
    '/studier/nettstudier/enkeltemne/hrm/': '/enkeltemner/hrm',
    '/studier/nettstudier/enkeltemne/idrettspsykologi-og-prestasjon/': '/enkeltemner/idrettspsykologi-og-prestasjon',
    '/studier/nettstudier/enkeltemne/individuell-arbeidsrett/': '/enkeltemner/individuell-arbeidsrett',
    '/studier/nettstudier/enkeltemne/individuell-arbeidsrett3/': '/enkeltemner/individuell-arbeidsrett3',
    '/studier/nettstudier/enkeltemne/informasjonssikkerhet/': '/enkeltemner/informasjonssikkerhet',
    '/studier/nettstudier/enkeltemne/innforing-i-helhetlig-logistikk/': '/enkeltemner/innforing-i-helhetlig-logistikk',
    '/studier/nettstudier/enkeltemne/innforing-i-kunstig-intelligens-og-maskinlaring/': '/enkeltemner/innforing-i-kunstig-intelligens-og-maskinlaring',
    '/studier/nettstudier/enkeltemne/innforing-i-pedagogikk/': '/enkeltemner/innforing-i-pedagogikk',
    '/studier/nettstudier/enkeltemne/innforing-i-psykologi-kognisjon-atferd-folelser-og-relasjon/': '/enkeltemner/innforing-i-psykologi-kognisjon-atferd-folelser-og-relasjon',
    '/studier/nettstudier/enkeltemne/innforing-i-psykologisk-forskningsmetode/': '/enkeltemner/innforing-i-psykologisk-forskningsmetode',
    '/studier/nettstudier/enkeltemne/innforing-i-regnskapssystem/': '/enkeltemner/innforing-i-regnskapssystem',
    '/studier/nettstudier/enkeltemne/innkjopsledelse/': '/enkeltemner/innkjopsledelse',
    '/studier/nettstudier/enkeltemne/innovasjon-og-barekraft/': '/enkeltemner/innovasjon-og-barekraft',
    '/studier/nettstudier/enkeltemne/innovasjon-og-smart-samarbeid/': '/enkeltemner/innovasjon-og-smart-samarbeid',
    '/studier/nettstudier/enkeltemne/interiordesign-og-boliginnredning/': '/enkeltemner/interiordesign-og-boliginnredning',
    '/studier/nettstudier/enkeltemne/internasjonal-hr/': '/enkeltemner/internasjonal-hr',
    '/studier/nettstudier/enkeltemne/internasjonal-politikk-og-implementering/': '/enkeltemner/internasjonal-politikk-og-implementering',
    '/studier/nettstudier/enkeltemne/internkommunikasjon-kultur-og-tillit/': '/enkeltemner/internkommunikasjon-kultur-og-tillit',
    '/studier/nettstudier/enkeltemne/internkommunikasjon-og-merkebygging/': '/enkeltemner/internkommunikasjon-og-merkebygging',
    '/studier/nettstudier/enkeltemne/introduction-to-front-end-development-with-ai/': '/enkeltemner/introduction-to-front-end-development-with-ai',
    '/studier/nettstudier/enkeltemne/introduksjon-til-frontend-utvikling-med-ki-javascript/': '/enkeltemner/introduksjon-til-frontend-utvikling-med-ki-javascript',
    '/studier/nettstudier/enkeltemne/introduksjon-til-innholdsmarkedsforing/': '/enkeltemner/introduksjon-til-innholdsmarkedsforing',
    '/studier/nettstudier/enkeltemne/introduksjon-til-programmering/': '/enkeltemner/introduksjon-til-programmering',
    '/studier/nettstudier/enkeltemne/introduksjon-til-sirkular-okonomi/': '/enkeltemner/introduksjon-til-sirkular-okonomi',
    '/studier/nettstudier/enkeltemne/investering-og-finansiering/': '/enkeltemner/investering-og-finansiering',
    '/studier/nettstudier/enkeltemne/journalistikk-1-innforing-i-journalistisk-metode/': '/enkeltemner/journalistikk-1-innforing-i-journalistisk-metode',
    '/studier/nettstudier/enkeltemne/journalistikk-2/': '/enkeltemner/journalistikk-2',
    '/studier/nettstudier/enkeltemne/juridisk-kontoradministrasjon-grunnleggende/': '/enkeltemner/juridisk-kontoradministrasjon-grunnleggende',
    '/studier/nettstudier/enkeltemne/juridisk-kontoradministrasjon-viderekommen/': '/enkeltemner/juridisk-kontoradministrasjon-viderekommen',
    '/studier/nettstudier/enkeltemne/juridisk-metode/': '/enkeltemner/juridisk-metode',
    '/studier/nettstudier/enkeltemne/juridiske-system-og-verktoy/': '/enkeltemner/juridiske-system-og-verktoy',
    '/studier/nettstudier/enkeltemne/kartlegging-av-lese-og-skrivevansker-og-matematikkvansker/': '/enkeltemner/kartlegging-av-lese-og-skrivevansker-og-matematikkvansker',
    '/studier/nettstudier/enkeltemne/key-account-management5/': '/enkeltemner/key-account-management5',
    '/studier/nettstudier/enkeltemne/kognitiv-psykologi-og-hjernen/': '/enkeltemner/kognitiv-psykologi-og-hjernen',
    '/studier/nettstudier/enkeltemne/kollektiv-arbeidsrett/': '/enkeltemner/kollektiv-arbeidsrett',
    '/studier/nettstudier/enkeltemne/kollektiv-arbeidsrett2/': '/enkeltemner/kollektiv-arbeidsrett2',
    '/studier/nettstudier/enkeltemne/kommunikasjon-og-samarbeid/': '/enkeltemner/kommunikasjon-og-samarbeid',
    '/studier/nettstudier/enkeltemne/kommunikasjon/': '/enkeltemner/kommunikasjon',
    '/studier/nettstudier/enkeltemne/kompetanseledelse/': '/enkeltemner/kompetanseledelse',
    '/studier/nettstudier/enkeltemne/kompetanseutvikling/': '/enkeltemner/kompetanseutvikling',
    '/studier/nettstudier/enkeltemne/kontraktsrett/': '/enkeltemner/kontraktsrett',
    '/studier/nettstudier/enkeltemne/kreativ-skriving/': '/enkeltemner/kreativ-skriving',
    '/studier/nettstudier/enkeltemne/kreativt-webprosjekt/': '/enkeltemner/kreativt-webprosjekt',
    '/studier/nettstudier/enkeltemne/kultur-og-kommunikasjon3/': '/enkeltemner/kultur-og-kommunikasjon3',
    '/studier/nettstudier/enkeltemne/kulturpsykologi-og-mental-helse-i-digitale-tider/': '/enkeltemner/kulturpsykologi-og-mental-helse-i-digitale-tider',
    '/studier/nettstudier/enkeltemne/kvalitativ-og-kvantitativ-metode/': '/enkeltemner/kvalitativ-og-kvantitativ-metode',
    '/studier/nettstudier/enkeltemne/kvalitet-og-internkontroll/': '/enkeltemner/kvalitet-og-internkontroll',
    '/studier/nettstudier/enkeltemne/kvantitativ-metode/': '/enkeltemner/kvantitativ-metode',
    '/studier/nettstudier/enkeltemne/laring-i-digitale-kontekster/': '/enkeltemner/laring-i-digitale-kontekster',
    '/studier/nettstudier/enkeltemne/laring-kreativitet-og-innovasjon2/': '/enkeltemner/laring-kreativitet-og-innovasjon2',
    '/studier/nettstudier/enkeltemne/leadership-theory-and-practice-s/': '/enkeltemner/leadership-theory-and-practice-s',
    '/studier/nettstudier/enkeltemne/leadership-theory-and-practice/': '/enkeltemner/leadership-theory-and-practice',
    '/studier/nettstudier/enkeltemne/ledelse-for-service/': '/enkeltemner/ledelse-for-service',
    '/studier/nettstudier/enkeltemne/ledelse-i-prosjekter/': '/enkeltemner/ledelse-i-prosjekter',
    '/studier/nettstudier/enkeltemne/ledelse-og-personaladministrasjon/': '/enkeltemner/ledelse-og-personaladministrasjon',
    '/studier/nettstudier/enkeltemne/lederen-og-ledelse-i-praksis/': '/enkeltemner/lederen-og-ledelse-i-praksis',
    '/studier/nettstudier/enkeltemne/lending-and-credit-risk-analys/': '/enkeltemner/lending-and-credit-risk-analys',
    '/studier/nettstudier/enkeltemne/lese--og-skrivevansker-og-mattematikkvansker/': '/enkeltemner/lese--og-skrivevansker-og-mattematikkvansker',
    '/studier/nettstudier/enkeltemne/likestilling--og-diskrimineringsrett/': '/enkeltemner/likestilling--og-diskrimineringsrett',
    '/studier/nettstudier/enkeltemne/logistics-operations-freight-transport-and-warehousing/': '/enkeltemner/logistics-operations-freight-transport-and-warehousing',
    '/studier/nettstudier/enkeltemne/lonnskjoring-i-praksis/': '/enkeltemner/lonnskjoring-i-praksis',
    '/studier/nettstudier/enkeltemne/lonnssystemer/': '/enkeltemner/lonnssystemer',
    '/studier/nettstudier/enkeltemne/lonnsteori-og-lonnssystem/': '/enkeltemner/lonnsteori-og-lonnssystem',
    '/studier/nettstudier/enkeltemne/lover-og-regler-innen-lonnsarbeid/': '/enkeltemner/lover-og-regler-innen-lonnsarbeid',
    '/studier/nettstudier/enkeltemne/makrookonomi/': '/enkeltemner/makrookonomi',
    '/studier/nettstudier/enkeltemne/managing-financial-risk/': '/enkeltemner/managing-financial-risk',
    '/studier/nettstudier/enkeltemne/mangfold-og-inkludering/': '/enkeltemner/mangfold-og-inkludering',
    '/studier/nettstudier/enkeltemne/mangfoldsledelse/': '/enkeltemner/mangfoldsledelse',
    '/studier/nettstudier/enkeltemne/marked-samfunn-og-globalisering/': '/enkeltemner/marked-samfunn-og-globalisering',
    '/studier/nettstudier/enkeltemne/markedskommunikasjon/': '/enkeltemner/markedskommunikasjon',
    '/studier/nettstudier/enkeltemne/masteroppgave/': '/enkeltemner/masteroppgave',
    '/studier/nettstudier/enkeltemne/matematikk-for-okonomer/': '/enkeltemner/matematikk-for-okonomer',
    '/studier/nettstudier/enkeltemne/medisinsk-historie-og-etikk/': '/enkeltemner/medisinsk-historie-og-etikk',
    '/studier/nettstudier/enkeltemne/mergers-acquisitions--restructuring-/': '/enkeltemner/mergers-acquisitions--restructuring-',
    '/studier/nettstudier/enkeltemne/merkevareledelse/': '/enkeltemner/merkevareledelse',
    '/studier/nettstudier/enkeltemne/microsoft-office-365-grunnleggende/': '/enkeltemner/microsoft-office-365-grunnleggende',
    '/studier/nettstudier/enkeltemne/mikrookonomi/': '/enkeltemner/mikrookonomi',
    '/studier/nettstudier/enkeltemne/miljopsykologi/': '/enkeltemner/miljopsykologi',
    '/studier/nettstudier/enkeltemne/miljorapportering/': '/enkeltemner/miljorapportering',
    '/studier/nettstudier/enkeltemne/mobile-movie-making/': '/enkeltemner/mobile-movie-making',
    '/studier/nettstudier/enkeltemne/network-analysis-/': '/enkeltemner/network-analysis-',
    '/studier/nettstudier/enkeltemne/nevroutviklingsforstyrrelser/': '/enkeltemner/nevroutviklingsforstyrrelser',
    '/studier/nettstudier/enkeltemne/objektorientert-programmering/': '/enkeltemner/objektorientert-programmering',
    '/studier/nettstudier/enkeltemne/offentlig-organisering-og-saksbehandlerrollen/': '/enkeltemner/offentlig-organisering-og-saksbehandlerrollen',
    '/studier/nettstudier/enkeltemne/offentlige-innkjop-og-kontrakter/': '/enkeltemner/offentlige-innkjop-og-kontrakter',
    '/studier/nettstudier/enkeltemne/okonomi/': '/enkeltemner/okonomi',
    '/studier/nettstudier/enkeltemne/okonomistyring/': '/enkeltemner/okonomistyring',
    '/studier/nettstudier/enkeltemne/onboarding-av-medarbeidere/': '/enkeltemner/onboarding-av-medarbeidere',
    '/studier/nettstudier/enkeltemne/operations-management/': '/enkeltemner/operations-management',
    '/studier/nettstudier/enkeltemne/operativ-personalledelse3/': '/enkeltemner/operativ-personalledelse3',
    '/studier/nettstudier/enkeltemne/organisasjonskultur/': '/enkeltemner/organisasjonskultur',
    '/studier/nettstudier/enkeltemne/pedagogisk-psykologi/': '/enkeltemner/pedagogisk-psykologi',
    '/studier/nettstudier/enkeltemne/pedagogisk-radgivning-og-veiledning/': '/enkeltemner/pedagogisk-radgivning-og-veiledning',
    '/studier/nettstudier/enkeltemne/pedagogisk-sosiologi/': '/enkeltemner/pedagogisk-sosiologi',
    '/studier/nettstudier/enkeltemne/people-work-and-organisations-s/': '/enkeltemner/people-work-and-organisations-s',
    '/studier/nettstudier/enkeltemne/people-work-and-organisations/': '/enkeltemner/people-work-and-organisations',
    '/studier/nettstudier/enkeltemne/performance-management-for-business/': '/enkeltemner/performance-management-for-business',
    '/studier/nettstudier/enkeltemne/personaladministrasjon/': '/enkeltemner/personaladministrasjon',
    '/studier/nettstudier/enkeltemne/personalforvaltning/': '/enkeltemner/personalforvaltning',
    '/studier/nettstudier/enkeltemne/personlighetspsykologi/': '/enkeltemner/personlighetspsykologi',
    '/studier/nettstudier/enkeltemne/personvern-og-datasikkerhet/': '/enkeltemner/personvern-og-datasikkerhet',
    '/studier/nettstudier/enkeltemne/personvernrett/': '/enkeltemner/personvernrett',
    '/studier/nettstudier/enkeltemne/politikk-og-pavirkning/': '/enkeltemner/politikk-og-pavirkning',
    '/studier/nettstudier/enkeltemne/positiv-psykologi-og-livskvalitet/': '/enkeltemner/positiv-psykologi-og-livskvalitet',
    '/studier/nettstudier/enkeltemne/pr-i-praksis/': '/enkeltemner/pr-i-praksis',
    '/studier/nettstudier/enkeltemne/prosjekt-og-prosesstyring/': '/enkeltemner/prosjekt-og-prosesstyring',
    '/studier/nettstudier/enkeltemne/prosjektledelse/': '/enkeltemner/prosjektledelse',
    '/studier/nettstudier/enkeltemne/prosjektokonomi/': '/enkeltemner/prosjektokonomi',
    '/studier/nettstudier/enkeltemne/psykiske-lidelser-og-psykisk-helsearbeid/': '/enkeltemner/psykiske-lidelser-og-psykisk-helsearbeid',
    '/studier/nettstudier/enkeltemne/publisering/': '/enkeltemner/publisering',
    '/studier/nettstudier/enkeltemne/quantitative-methods/': '/enkeltemner/quantitative-methods',
    '/studier/nettstudier/enkeltemne/regnskap-og-lovverk/': '/enkeltemner/regnskap-og-lovverk',
    '/studier/nettstudier/enkeltemne/regnskapsforeren-som-radgiver/': '/enkeltemner/regnskapsforeren-som-radgiver',
    '/studier/nettstudier/enkeltemne/regnskapsforeryrket-og-regnskapsorganisering/': '/enkeltemner/regnskapsforeryrket-og-regnskapsorganisering',
    '/studier/nettstudier/enkeltemne/regnskapsradgivning/': '/enkeltemner/regnskapsradgivning',
    '/studier/nettstudier/enkeltemne/regnskapssystem-med-arsoppgjor/': '/enkeltemner/regnskapssystem-med-arsoppgjor',
    '/studier/nettstudier/enkeltemne/rekruttering-for-mangfold/': '/enkeltemner/rekruttering-for-mangfold',
    '/studier/nettstudier/enkeltemne/rekruttering/': '/enkeltemner/rekruttering',
    '/studier/nettstudier/enkeltemne/relasjonsledelse/': '/enkeltemner/relasjonsledelse',
    '/studier/nettstudier/enkeltemne/retorikk-og-argumentasjon2/': '/enkeltemner/retorikk-og-argumentasjon2',
    '/studier/nettstudier/enkeltemne/rettskilde-og-informasjonsportaler/': '/enkeltemner/rettskilde-og-informasjonsportaler',
    '/studier/nettstudier/enkeltemne/rutiner-for-barekraftig-drift/': '/enkeltemner/rutiner-for-barekraftig-drift',
    '/studier/nettstudier/enkeltemne/salgsledelse-/': '/enkeltemner/salgsledelse-',
    '/studier/nettstudier/enkeltemne/salgsteknikk-og-salgspsykologi/': '/enkeltemner/salgsteknikk-og-salgspsykologi',
    '/studier/nettstudier/enkeltemne/samfunnsansvar-og-klimaregnskap/': '/enkeltemner/samfunnsansvar-og-klimaregnskap',
    '/studier/nettstudier/enkeltemne/samfunnsokonomi-ii/': '/enkeltemner/samfunnsokonomi-ii',
    '/studier/nettstudier/enkeltemne/samfunnsokonomi/': '/enkeltemner/samfunnsokonomi',
    '/studier/nettstudier/enkeltemne/service-design/': '/enkeltemner/service-design',
    '/studier/nettstudier/enkeltemne/service-og-kundebehandling/': '/enkeltemner/service-og-kundebehandling',
    '/studier/nettstudier/enkeltemne/serviceledelse/': '/enkeltemner/serviceledelse',
    '/studier/nettstudier/enkeltemne/sirkularokonomi/': '/enkeltemner/sirkularokonomi',
    '/studier/nettstudier/enkeltemne/skatterett-1/': '/enkeltemner/skatterett-1',
    '/studier/nettstudier/enkeltemne/skatterett-12/': '/enkeltemner/skatterett-12',
    '/studier/nettstudier/enkeltemne/skatterett-2/': '/enkeltemner/skatterett-2',
    '/studier/nettstudier/enkeltemne/sosialpsykologi/': '/enkeltemner/sosialpsykologi',
    '/studier/nettstudier/enkeltemne/spesialpedagogisk-radgivning-og-veiledning/': '/enkeltemner/spesialpedagogisk-radgivning-og-veiledning',
    '/studier/nettstudier/enkeltemne/spesialpedagogiske-grunnlagsproblemer/': '/enkeltemner/spesialpedagogiske-grunnlagsproblemer',
    '/studier/nettstudier/enkeltemne/statistikk-for-okonomer2/': '/enkeltemner/statistikk-for-okonomer2',
    '/studier/nettstudier/enkeltemne/statsrett-og-rettshistorie/': '/enkeltemner/statsrett-og-rettshistorie',
    '/studier/nettstudier/enkeltemne/strafferett-og-sentrale-rettsomrader/': '/enkeltemner/strafferett-og-sentrale-rettsomrader',
    '/studier/nettstudier/enkeltemne/strategic-change-management-/': '/enkeltemner/strategic-change-management-',
    '/studier/nettstudier/enkeltemne/strategic-marketing-s/': '/enkeltemner/strategic-marketing-s',
    '/studier/nettstudier/enkeltemne/strategic-marketing/': '/enkeltemner/strategic-marketing',
    '/studier/nettstudier/enkeltemne/strategies-for-managing-supply-chains/': '/enkeltemner/strategies-for-managing-supply-chains',
    '/studier/nettstudier/enkeltemne/strategisk-verdikjedeledelse-1/': '/enkeltemner/strategisk-verdikjedeledelse-1',
    '/studier/nettstudier/enkeltemne/strategisk-verdikjedeledelse-2/': '/enkeltemner/strategisk-verdikjedeledelse-2',
    '/studier/nettstudier/enkeltemne/styling-og-interiorkonsepter/': '/enkeltemner/styling-og-interiorkonsepter',
    '/studier/nettstudier/enkeltemne/sykdomsforebygging/': '/enkeltemner/sykdomsforebygging',
    '/studier/nettstudier/enkeltemne/sykdomslare/': '/enkeltemner/sykdomslare',
    '/studier/nettstudier/enkeltemne/teamarbeid-og-teamutvikling/': '/enkeltemner/teamarbeid-og-teamutvikling',
    '/studier/nettstudier/enkeltemne/tekniske-installasjoner/': '/enkeltemner/tekniske-installasjoner',
    '/studier/nettstudier/enkeltemne/teknologi-og-digital-kompetanse/': '/enkeltemner/teknologi-og-digital-kompetanse',
    '/studier/nettstudier/enkeltemne/tekstforfatting/': '/enkeltemner/tekstforfatting',
    '/studier/nettstudier/enkeltemne/tenke-fort-og-langsomt---beslutningspsykologi/': '/enkeltemner/tenke-fort-og-langsomt---beslutningspsykologi',
    '/studier/nettstudier/enkeltemne/teoretisk-biomekanikk-observasjon-palpasjon-og-bevegelsespalpasjon/': '/enkeltemner/teoretisk-biomekanikk-observasjon-palpasjon-og-bevegelsespalpasjon',
    '/studier/nettstudier/enkeltemne/utdanningsvitenskapelig-forskningsmetode/': '/enkeltemner/utdanningsvitenskapelig-forskningsmetode',
    '/studier/nettstudier/enkeltemne/utviklingspsykologi/': '/enkeltemner/utviklingspsykologi',
    '/studier/nettstudier/enkeltemne/verdikjede-teknologi-og-analyse/': '/enkeltemner/verdikjede-teknologi-og-analyse',
    '/studier/nettstudier/enkeltemne/verdikjeder/': '/enkeltemner/verdikjeder',
    '/studier/nettstudier/enkeltemne/verdiskapning-gjennom-den-norske-modellen2/': '/enkeltemner/verdiskapning-gjennom-den-norske-modellen2',
    '/studier/nettstudier/enkeltemne/video-1/': '/enkeltemner/video-1',
    '/studier/nettstudier/enkeltemne/yrkes--og-arbeidslovgivning/': '/enkeltemner/yrkes--og-arbeidslovgivning',
    '/studier/videreutdanning/enkeltemner/ki-for-cybersikkerhet-og-strategisk-trusselvurdering/': '/enkeltemner/ki-for-cybersikkerhet-og-strategisk-trusselvurdering',
    '/studier/videreutdanning/enkeltemner/ledelse-og-utvikling-av-sfo/': '/enkeltemner/ledelse-og-utvikling-av-sfo',
    '/studier/videreutdanning/enkeltemner/omstillings--og-endringsledelse/': '/enkeltemner/omstillings--og-endringsledelse',
    '/studier/videreutdanning/enkeltemner/praktisk-lederskap/': '/enkeltemner/praktisk-lederskap',
    '/studier/videreutdanning/enkeltemner/selvledelse-og-autonom-organisering/': '/enkeltemner/selvledelse-og-autonom-organisering',
    '/studier/videreutdanning/enkeltemner/storytelling-som-strategisk-verktoy/': '/enkeltemner/storytelling-som-strategisk-verktoy'
  };

  function getLocalUrl(item) {
    return localPages[item.linkUrl] || null;
  }

  /* Prototypen skal ikke lenke ut til kristiania.no, så søket viser kun de
     studiene og emnene som faktisk har en side her. Katalogen i
     studietilbud-data.js beholdes komplett (449 oppføringer) – filtreringen
     skjer her, så det er nok å legge til en side + en localPages-nøkkel for at
     et studium dukker opp i søket. */
  var allItems = catalogItems.filter(getLocalUrl);
  var totalCount = allItems.length;

  /* ── CSS ──
     Verten eier rutenettet: widgeten monteres i .Page__body.wrapper, som
     allerede gir maks-bredde 1200px og 32px sidepadding. Derfor skal
     .sl-container ikke legge på egen maks-bredde/padding – da havnet lista
     24px innenfor «Alle studier»-overskriften. */
  var css = document.createElement('style');
  css.textContent = '\
.Page__body{background:#fff !important}\
#8a1a76fd{background:#fff;padding:40px 0;min-height:80vh;font-family:\'Graphik\',\'Helvetica Neue\',Arial,sans-serif}\
.sl-container{width:100%}\
.sl-layout{display:flex;gap:40px;align-items:flex-start}\
.sl-main{flex:1;min-width:0}\
.sl-sidebar{width:280px;flex-shrink:0;position:sticky;top:100px}\
.sl-search{width:100%;padding:14px 18px;font-size:16px;border:1.5px solid #D4D4D4;border-radius:8px;outline:none;font-family:inherit;margin-bottom:8px;transition:border-color .15s;background:#fff}\
.sl-search:focus{border-color:#0A4FB8}\
.sl-search:focus-visible{outline:3px solid #580F0F;outline-offset:3px}\
.sl-count{font-size:14px;color:#5C5C5C;margin:12px 0 20px}\
.sl-grid{display:flex;flex-direction:column;gap:0}\
.sl-card{display:block;padding:20px 0;border-bottom:1px solid #E6E6E6;text-decoration:none;color:inherit;transition:background .1s}\
.sl-card:hover{background:#F2F7FF;margin:0 -12px;padding:20px 12px;border-radius:8px}\
.sl-card:first-child{border-top:1px solid #E6E6E6}\
.sl-card-name{display:inline-block;font-size:18px;font-weight:600;color:#1A1A1A;margin:0 0 10px;border-bottom:2px solid #AF0018;padding-bottom:2px}\
.sl-card-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:#5C5C5C}\
.sl-card-meta span{display:flex;align-items:center;gap:4px}\
.sl-card-meta span svg{flex-shrink:0}\
.sl-card-points{font-family:\'Produkt\',\'Source Serif 4\',Georgia,serif;color:#5C5C5C}\
.sl-hidden{display:none}\
.sl-filter-group{margin-bottom:24px}\
.sl-filter-title{font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #D4D4D4}\
.sl-filter-option{display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;font-size:14px;color:#1A1A1A}\
.sl-filter-option input{width:16px;height:16px;accent-color:#0A4FB8;cursor:pointer}\
.sl-filter-option label{cursor:pointer}\
.sl-no-results{padding:40px 0;text-align:center;color:#5C5C5C;font-size:15px}\
@media(max-width:768px){\
  .sl-layout{flex-direction:column-reverse;gap:20px}\
  .sl-sidebar{width:100%;position:static}\
}\
';
  document.head.appendChild(css);

  /* ── Build UI ── */
  var root = document.getElementById('8a1a76fd');
  if (!root) return;

  /* ── SVG Icons (matching kristiania.no) ── */
  var svgMapPin = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
  var svgGlobe = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
  var svgBook = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>';
  var svgActivity = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>';

  function locationIcon(item) {
    var locs = item.locations || [];
    var isOnline = item.type === 'onlineStudy' || locs.indexOf('Nettstudium') > -1;
    return isOnline ? svgGlobe : svgMapPin;
  }

  // Build filter HTML
  /* Samme alternativer og rekkefølge som fasettene på kristiania.no/studier.
     Nivå-verdiene matcher item.levelLabel direkte. */
  var filterGroups = [
    { id: 'sted', title: 'Sted', options: ['Bergen', 'Oslo', 'Nettstudium', 'Samlingsbasert'] },
    { id: 'niva', title: 'Nivå', options: ['Bachelor', 'Master', 'Fagskole', 'Videreutdanning', 'Årsstudium', 'Ph.d.', 'Enkeltemne'] },
    { id: 'form', title: 'Gjennomføring', options: ['Heltid', 'Deltid'] }
  ];

  /* Behold live-rekkefølgen, men vis bare alternativer som gir treff – ellers
     får vi filtre som alltid gir null (f.eks. Ph.d., som ikke er i prototypen). */
  function optionHasMatch(groupId, opt) {
    return allItems.some(function(item) {
      if (groupId === 'niva') return item.levelLabel === opt;
      if (groupId === 'form') return (item.studyFormTypes || []).indexOf(opt) > -1;
      var locs = item.locations || [];
      if (opt === 'Nettstudium') return locs.indexOf(opt) > -1 || item.type === 'onlineStudy';
      return locs.indexOf(opt) > -1;
    });
  }
  filterGroups = filterGroups.map(function(g) {
    return { id: g.id, title: g.title, options: g.options.filter(function(o) { return optionHasMatch(g.id, o); }) };
  }).filter(function(g) { return g.options.length > 0; });

  var filtersHTML = filterGroups.map(function(group) {
    var opts = group.options.map(function(opt) {
      return '<div class="sl-filter-option">'
        + '<input type="checkbox" id="sl-' + group.id + '-' + opt + '" value="' + opt + '" data-group="' + group.id + '">'
        + '<label for="sl-' + group.id + '-' + opt + '">' + opt + '</label>'
        + '</div>';
    }).join('');
    return '<div class="sl-filter-group"><div class="sl-filter-title">' + group.title + '</div>' + opts + '</div>';
  }).join('');

  root.innerHTML = '<div class="sl-container">'
    + '<div class="sl-layout">'
    + '<div class="sl-main">'
    + '<input type="text" class="sl-search" placeholder="S\u00F8k etter studie eller kurs">'
    + '<div class="sl-count">Viser <strong>' + totalCount + '</strong> av ' + totalCount + '</div>'
    + '<div class="sl-grid" id="sl-results"></div>'
    + '</div>'
    + '<div class="sl-sidebar">' + filtersHTML + '</div>'
    + '</div></div>';

  /* ── Render cards ── */
  var resultsEl = document.getElementById('sl-results');
  var searchInput = root.querySelector('.sl-search');
  var countEl = root.querySelector('.sl-count strong');

  function renderCards(items) {
    if (items.length === 0) {
      resultsEl.innerHTML = '<div class="sl-no-results">Ingen studier matcher s\u00F8ket ditt</div>';
      countEl.textContent = '0';
      return;
    }
    var html = items.map(function(item) {
      var url = getLocalUrl(item);
      var locs = (item.locations || []).join(' \\ ');
      var forms = (item.studyFormTypes || []).join(', ');
      return '<a href="' + url + '" class="sl-card">'
        + '<div class="sl-card-name">' + item.name + '</div>'
        + '<div class="sl-card-meta">'
        + (locs ? '<span>' + locationIcon(item) + ' ' + locs + '</span>' : '')
        + '<span>' + svgBook + ' ' + item.levelLabel + '</span>'
        + (forms ? '<span>' + svgActivity + ' ' + forms + '</span>' : '')
        + (item.points ? '<span class="sl-card-points">' + item.points + '</span>' : '')
        + '</div></a>';
    }).join('');
    resultsEl.innerHTML = html;
    countEl.textContent = items.length;
  }

  /* ── Filter logic ── */
  function getCheckedValues(groupId) {
    var checks = root.querySelectorAll('input[data-group="' + groupId + '"]:checked');
    var vals = [];
    checks.forEach(function(c) { vals.push(c.value); });
    return vals;
  }

  function applyFilters() {
    var query = (searchInput.value || '').toLowerCase().trim();
    var stedFilter = getCheckedValues('sted');
    var nivaFilter = getCheckedValues('niva');
    var formFilter = getCheckedValues('form');

    var filtered = allItems.filter(function(item) {
      // Text search
      if (query) {
        /* Emnekodene er med i søketeksten – enkeltemner refereres ofte til
           med kode («6347») heller enn navn. */
        var searchable = (item.name + ' ' + (item.keywords || '')
          + ' ' + (item.codes || []).join(' ')).toLowerCase();
        if (searchable.indexOf(query) === -1) return false;
      }
      // Sted filter (OR within group)
      if (stedFilter.length > 0) {
        var locs = item.locations || [];
        // Check if item matches any of the selected locations
        // For "Nettstudium", also match item.type === 'onlineStudy'
        var match = stedFilter.some(function(f) {
          if (f === 'Nettstudium') return locs.indexOf('Nettstudium') > -1 || item.type === 'onlineStudy';
          return locs.indexOf(f) > -1;
        });
        if (!match) return false;
      }
      // Nivå filter (OR within group)
      if (nivaFilter.length > 0) {
        if (nivaFilter.indexOf(item.levelLabel) === -1) return false;
      }
      // Gjennomføring filter (OR within group)
      if (formFilter.length > 0) {
        var forms = item.studyFormTypes || [];
        var match = formFilter.some(function(f) { return forms.indexOf(f) > -1; });
        if (!match) return false;
      }
      return true;
    });

    renderCards(filtered);
  }

  /* ── URL state ── */
  function writeStateToURL() {
    var params = new URLSearchParams();
    var q = (searchInput.value || '').trim();
    if (q) params.set('q', q);
    ['sted', 'niva', 'form'].forEach(function(g) {
      var vals = getCheckedValues(g);
      if (vals.length) params.set(g, vals.join(','));
    });
    var qs = params.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    history.replaceState(null, '', newUrl);
  }

  function restoreStateFromURL() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
    if (q) searchInput.value = q;
    ['sted', 'niva', 'form'].forEach(function(g) {
      var raw = params.get(g);
      if (!raw) return;
      raw.split(',').forEach(function(v) {
        if (!v) return;
        var cb = root.querySelector('input[data-group="' + g + '"][value="' + v + '"]');
        if (cb) cb.checked = true;
      });
    });
  }

  function onFilterChange() {
    writeStateToURL();
    applyFilters();
  }

  /* ── Event listeners ── */
  searchInput.addEventListener('input', onFilterChange);
  root.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', onFilterChange);
  });
  window.addEventListener('popstate', function() {
    root.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
    searchInput.value = '';
    restoreStateFromURL();
    applyFilters();
  });

  // Restore state from URL, then render
  restoreStateFromURL();
  applyFilters();

})();
