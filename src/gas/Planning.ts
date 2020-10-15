import {Planning, Tijdvak} from "../common/Model";

function isoDatum(date: Date): string {
  const datum = date.toISOString();
  return datum.substring(0, datum.indexOf('T'));
}

function ophalen(datum: string, tijdvak: Tijdvak): Planning | undefined {
  const filename = `planning-${isoDatum(new Date(datum))}-${tijdvak}.json`
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    const json = file.getBlob().getDataAsString();
    return JSON.parse(json);
  } else {
    return undefined;
  }
}

function opslaan(planning: Planning) {
  const filename = `planning-${isoDatum(new Date(planning.datum))}-${planning.tijdvak}.json`
  const file = DriveApp.createFile(filename, JSON.stringify(planning), "application/json");
  const iterator = DriveApp.getFilesByName(filename);
  while (iterator.hasNext()) {
    const f = iterator.next();
    if (f.getId() !== file.getId()) {
      f.setTrashed(true);
    }
  }
}

function uitnodigen(planning: Planning): number {
  opslaan(planning);

  const openingsTijd = new Date(planning.datum);
  const startTijd = new Date(planning.datum);
  const eindTijd = new Date(planning.datum);
  switch (planning.tijdvak) {
    case Tijdvak.Ochtend:
      openingsTijd.setHours(9, 10, 0, 0);
      startTijd.setHours(9, 30, 0, 0);
      eindTijd.setHours(11, 0, 0, 0);
      break;
    case Tijdvak.Middag:
      openingsTijd.setHours(15, 10, 0, 0);
      startTijd.setHours(15, 30, 0, 0);
      eindTijd.setHours(17, 0, 0, 0);
      break;
    case Tijdvak.Avond:
      openingsTijd.setHours(18, 40, 0, 0);
      startTijd.setHours(19, 0, 0, 0);
      eindTijd.setHours(20, 30, 0, 0);
      break;
  }

  const dienst = `${planning.tijdvak.toLowerCase()}dienst`;
  const datum = openingsTijd.toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'});
  const tijdstip = openingsTijd.toLocaleString('nl', {hour: 'numeric', minute: 'numeric'});

  const calendar = CalendarApp.getDefaultCalendar();
  const reedsGenodigden: string[] = [];
  calendar.getEvents(startTijd, eindTijd, {'search': 'Uitnodiging'}).forEach(event => reedsGenodigden.push(...event.getGuestList().map(guest => guest.getEmail())));
  const nieuweGenodigden = planning.genodigden.filter(genodigde => !reedsGenodigden.includes(genodigde.email));

  nieuweGenodigden.forEach(genodigde => {
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
    event.setTag('Naam', genodigde.naam)
    event.setTag('Aantal', genodigde.aantal.toString())
    event.setTag('Ingang', genodigde.ingang)
  });

  const filename = `genodigden-${isoDatum(new Date(planning.datum))}-${planning.tijdvak}`;
  const iterator = DriveApp.getFilesByName(filename);
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  if (iterator.hasNext()) {
    const file = iterator.next();
    spreadsheet = SpreadsheetApp.openById(file.getId());
  } else {
    spreadsheet = SpreadsheetApp.create(filename);
  }

  nieuweGenodigden.forEach(genodigde => {
    let sheet = spreadsheet.getSheetByName(genodigde.ingang);
    if (!sheet) {
      sheet = spreadsheet.insertSheet();
      sheet.setName(genodigde.ingang);
      sheet.appendRow(['Naam', 'Aantal', 'Email'])
    }
    sheet.appendRow([genodigde.naam, genodigde.aantal, genodigde.email]);
  });

  return nieuweGenodigden.length;
}
