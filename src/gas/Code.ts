import AppsScriptHttpRequestEvent = GoogleAppsScript.Events.AppsScriptHttpRequestEvent;
import {Beschikbaarheid, Deelnemer, Gebouw, Ingang, Planning, Prop, Richting, Stoel, Tijdvak} from "../common/Model";

interface GebouwIngang extends Ingang {
  gebouw: string;
}

function doGet(request: AppsScriptHttpRequestEvent) {
  return HtmlService.createTemplateFromFile('dist/Index').evaluate();
}

function uitnodigen(planning: Planning) {
  Logger.log(JSON.stringify(planning));

  const calendar = CalendarApp.getDefaultCalendar();
  const startTijd = new Date(planning.datum);
  const eindTijd = new Date(planning.datum);
  switch (planning.tijdvak) {
    case Tijdvak.Ochtend:
      startTijd.setHours(9, 10, 0, 0);
      eindTijd.setHours(11, 0, 0, 0);
      break;
    case Tijdvak.Middag:
      startTijd.setHours(15, 10, 0, 0);
      eindTijd.setHours(17, 0, 0, 0);
      break;
    case Tijdvak.Avond:
      startTijd.setHours(18, 40, 0, 0);
      eindTijd.setHours(20, 30, 0, 0);
      break;
  }

  const dienst = `${planning.tijdvak.toLowerCase()}dienst`;
  const datum = startTijd.toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'});
  const tijdstip = startTijd.toLocaleString('nl', {hour: 'numeric', minute: 'numeric'});

  planning.genodigden.forEach(genodigde => {
    const gebouw = genodigde.gebouw.includes('(') ? genodigde.gebouw.substring(0, genodigde.gebouw.indexOf('(')).trim() : genodigde.gebouw;
    const title = `Uitnodiging ${dienst} ${gebouw}`;
    let huisgenotenTekst = '';
    switch (genodigde.aantal) {
      case 1:
        huisgenotenTekst = ``;
        break;
      case 2:
        huisgenotenTekst = `samen met uw huisgenoot`;
        break;
      default:
        huisgenotenTekst = `samen met uw ${genodigde.aantal - 1} huisgenoten`;
        break;
    }
    const event = calendar.createEvent(title, startTijd, eindTijd, {
      description: `Geachte ${genodigde.naam},

Naar aanleiding van uw aanmelding om een kerkdienst bij te wonen, kan ik u hierbij meedelen dat u
${huisgenotenTekst} bent ingedeeld om op D.V. ${datum} de ${dienst} bij te wonen.
U wordt hartelijk uitgenodigd om op deze zondag de dienst bij te wonen.

U wordt verzocht om onderstaande regels in acht te nemen, te meer ook omdat er door de mensen
om ons heen gekeken zal worden hoe de kerken met de regels omgaan.

• U wordt verwacht bij de ingang ${genodigde.ingang}.
• De deuren van de kerk gaan open om ${tijdstip}u.
• U wordt hier opgewacht door een coördinator (dat kan een uitgangshulp zijn, maar ook een
(ouderling kerkrentmeester). Deze zal uw naam aantekenen op een lijst die wij moeten
bijhouden (om bij eventuele nieuwe uitbraken te kunnen achterhalen met wie bepaalde
personen in aanraking zijn geweest). Wij verzoeken u de aanwijzingen van de coördinator op
te volgen. Ook wat betreft het plaatsnemen in de kerk. De coördinator zal u de plaats aanwijzen
waar u plaats dient te nemen, dit om de gewenste afstand tot andere kerkbezoekers te kunnen
waarborgen. Dit heeft tot gevolg dat u zeer waarschijnlijk niet op de plaats komt te zitten waar
u gewoonlijk zit. Wij vragen hierbij om uw begrip.
• Indien u een overjas aan heeft, neemt u deze mee naar uw zitplaats in de kerk. (U bent uiteraard
vrij om deze uit te doen en eventueel op de bank of een stoel naast u te leggen). De garderobes
zijn gesloten.
• U checkt van tevoren uw gezondheidstoestand en van uw eventuele gezinsleden. Bij klachten
blijft u thuis. Wel verzoeken wij u dan om de onderstaande persoon hiervan telefonisch
(0639612809) in te lichten. Indien mogelijk kan er nog een andere persoon, die ook graag
de dienst wil bijwonen, dan uw plek innemen. Uiteraard betekent dit niet dat u dan voorlopig
niet meer aan de beurt bent. Wij trachten u zo spoedig mogelijk opnieuw in te delen.
• Bij het uitgaan van de dienst wordt u verzocht om voldoende afstand van de andere
kerkgangers te bewaren, ook bij de collectebussen. Degene die achterin de kerk zit, verlaat
als eerste het gebouw. Wij verlaten de kerk van achteren naar voren. U verlaat de kerk door
dezelfde deur als waar u naar binnen bent gekomen.

Het gaat om uw eigen gezondheid, maar zeker ook om de gezondheid van de ander.
Wij wensen u van harte Gods zegen toe onder bediening van het Woord.



Met broederlijke groet,

Jan Visscher
namens de Hervormde Gemeente Genemuiden
`,
      location: gebouw,
      guests: genodigde.email,
      sendInvites: true
    });
    event.setGuestsCanModify(false);
    event.setGuestsCanSeeGuests(false);
    event.setGuestsCanInviteOthers(false);
  });
}

function createDeelnemer(id: number, row: any[]): Deelnemer {
  return {
    id: id,
    email: row[1],
    naam: row[2],
    aantal: row[3],
    adres: row[4],
    postcode: row[5],
    woonplaats: row[6],
    telefoonnummer: row[7],
    voorkeuren: row[8] instanceof String ? row[8].split(/[;,]/).filter(v => v && v != '' && v.toLowerCase() != 'geen voorkeur') : [],
    afwezigheid: row[9] instanceof String ? row[9].split(/[;,]/).filter(v => v && v != '' && v.toLowerCase() != 'ik kan op alle zondagen') : [],
    uitnodigingen: []
  }
}

function getDeelnemers(): Deelnemer[] {
  const spreadsheet = SpreadsheetApp.openById('1RovlUMgm8ApTsuB0TWrFTjS5H_QpKfYV9SeTWH24GFE');
  const sheet = spreadsheet.getSheets()[0];
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const deelnemers = range.getValues();
  const result: Deelnemer[] = [];
  for (let i = 1; i < deelnemers.length; i++) {
    if (deelnemers[i][0] == '') {
      continue;
    }
    result.push(createDeelnemer(i, deelnemers[i]));
  }

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  from.setMonth(now.getMonth() - 3);
  to.setMonth(now.getMonth() + 3);
  calendar.getEvents(from, to, { 'search': 'Uitnodiging' }).forEach(event => {
    event.getGuestList().forEach(guest => {
      const deelnemer = result.find(value => value.email === guest.getEmail());
      if (deelnemer) {
        deelnemer.uitnodigingen.push({datum: event.getStartTime().toISOString(), status: guest.getGuestStatus().toString()});
      }
    });
  });
  return result;
}

function convertRichting(c: any): Richting | undefined {
  switch (c) {
    case 'N':
      return Richting.Noord;
    case 'O':
      return Richting.Oost;
    case 'Z':
      return Richting.Zuid;
    case 'W':
      return Richting.West;
    default:
      return undefined;
  }
}

function createIngang(row: any[]): GebouwIngang {
  const gebouw = row[0];
  const naam = row[1];
  const richting = convertRichting(row[2]);
  const vanRij = typeof row[3] == "number" ? row[3] : undefined;
  const totRij = typeof row[4] == "number" ? row[4] : undefined;
  const vanKolom = typeof row[5] == "number" ? row[5] : undefined;
  const totKolom = typeof row[6] == "number" ? row[6] : undefined;
  return {
    gebouw: gebouw,
    naam: naam,
    richting: richting,
    vanRij: vanRij,
    totRij: totRij,
    vanKolom: vanKolom,
    totKolom: totKolom
  };
}

function getIngangen(): GebouwIngang[] {
  const spreadsheet = SpreadsheetApp.openById('1FPTrd515HQUC0LXMBU4qUUNzKfc80bi7VXOxjOhWffg');
  const sheet = spreadsheet.getSheets()[0];
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const ingangen = range.getValues();
  const result: GebouwIngang[] = [];
  for (let i = 1; i < ingangen.length; i++) {
    const ingang = createIngang(ingangen[i]);
    if (ingang) {
      result.push(ingang);
    }
  }
  return result;
}

function convertBeschikbaarheid(bg: string): Beschikbaarheid {
  switch (bg) {
    case '#ffff00':
      return Beschikbaarheid.Onbeschikbaar;
    case '#00ffff':
      return Beschikbaarheid.Gereserveerd;
    default:
      return Beschikbaarheid.Beschikbaar;
  }
}

function createGebouw(sheet: GoogleAppsScript.Spreadsheet.Sheet, ingangen: GebouwIngang[]): Gebouw {
  const naam = sheet.getName();
  const cached = CacheService.getScriptCache()?.get(naam);
  if (cached != null) {
    return JSON.parse(cached);
  }
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());
  const indeling = range.getValues();
  const backgrounds = range.getBackgrounds();
  const stoelen: Stoel[] = [];
  const props: Prop[] = [];
  for (let rij = 0; rij < range.getLastRow(); rij++) {
    for (let kolom = 0; kolom < range.getLastColumn(); kolom++) {
      const v = indeling[rij][kolom];
      const bg = backgrounds[rij][kolom];
      if (v && v.charAt(0) === 'S') {
        const richting = convertRichting(v.charAt(1));
        const beschikbaarheid = convertBeschikbaarheid(bg);
        stoelen.push({
          rij: rij + 1,
          kolom: kolom + 1,
          richting: richting ? richting : Richting.Noord,
          beschikbaarheid: beschikbaarheid
        });
      } else if (bg && bg != '#ffffff') {
        props.push({
          rij: rij + 1,
          kolom: kolom + 1,
          kleur: bg
        });
      }
    }
  }
  const result: Gebouw = {
    naam: naam,
    ingangen: ingangen.filter(v => v.gebouw == naam),
    stoelen: stoelen,
    props: props
  };
  CacheService.getScriptCache()?.put(naam, JSON.stringify(result), 86400);
  return result;
}

function getGebouwen(): Gebouw[] {
  const spreadsheet = SpreadsheetApp.openById('1FPTrd515HQUC0LXMBU4qUUNzKfc80bi7VXOxjOhWffg');
  const ingangen = getIngangen();
  const sheets = spreadsheet.getSheets();
  const result: Gebouw[] = [];
  for (let i = 1; i < sheets.length; i++) {
    result.push(createGebouw(sheets[i], ingangen));
  }
  return result;
}
