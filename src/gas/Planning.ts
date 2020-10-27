import {Planning, Tijdvak} from "../common/Model";

function isoDatum(date: Date): string {
  const datum = date.toISOString();
  return datum.substring(0, datum.indexOf('T'));
}

function ophalen(datum: string, tijdvak: Tijdvak): Planning | undefined {
  const filename = `planning-${isoDatum(new Date(datum))}-${tijdvak}.json`
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    try {
      const file = iterator.next();
      const json = file.getBlob().getDataAsString();
      return JSON.parse(json);
    } catch (e) {
      Logger.log(e);
    }
  }
  return undefined;
}

function opslaan(planning: Planning) {
  const filename = `planning-${isoDatum(new Date(planning.datum))}-${planning.tijdvak}.json`
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const f = iterator.next();
    f.setContent(JSON.stringify(planning));
  } else {
    DriveApp.createFile(filename, JSON.stringify(planning), "application/json");
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
  calendar.getEvents(startTijd, eindTijd, {'search': 'Uitnodiging'}).forEach(event => event.getGuestList().forEach(guest => {
    const email = guest.getEmail();
    reedsGenodigden.push(email);
    if (!planning.genodigden.some(genodigde => genodigde.email === email)) {
      event.removeGuest(email);
      if (event.getGuestList().length == 0) {
        event.deleteEvent();
      }
    }
  }));
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

Naar aanleiding van uw aanmelding om een kerkdienst bij te wonen,kunnen wij u hierbij meedelen dat u
${huisgenotenTekst} bent ingedeeld om op D.V. ${datum} de ${dienst} bij te wonen.
U wordt hartelijk uitgenodigd voor deze dienst.

U wordt verzocht om onderstaande regels in acht te nemen,
• U wordt verwacht bij de ingang ${genodigde.ingang}.
• De deuren van de kerk gaan open om ${tijdstip} uur
• U wordt hier opgewacht door een uitgangshulp. Deze zal uw naam aantekenen op een lijst die wij moeten
bijhouden (om bij eventuele nieuwe uitbraken te kunnen achterhalen met wie bepaalde personen in
aanraking zijn geweest). Wij verzoeken u de aanwijzingen van de uitgangshulp op te volgen, deze zal u de
plaats aanwijzen waar u plaats dient te nemen, dit om de gewenste afstand tot andere kerkbezoekers te
kunnen waarborgen. Dit heeft tot gevolg dat u zeer waarschijnlijk niet op de plaats komt te zitten waar u
gewoonlijk zit. Wij vragen hierbij om uw begrip.
• Indien u een overjas aan heeft, neemt u deze mee naar uw zitplaats in de kerk. (U bent uiteraard
vrij om deze uit te doen en eventueel op de bank of een stoel naast u te leggen). De garderobes
zijn gesloten.
• U checkt van tevoren uw gezondheidstoestand en van uw eventuele gezinsleden m.b.t. corona
gerelateerde klachten. Bij klachten dient u thuis te blijven.
• Bij het uitgaan van de dienst wordt u verzocht om voldoende afstand van de andere
kerkgangers te bewaren, ook bij de collectebussen. Degene die achterin de kerk zit, verlaat
als eerste het gebouw. Wij verlaten de kerk van achteren naar voren. U verlaat de kerk door
dezelfde deur als waar u naar binnen bent gekomen.
Het gaat om uw eigen gezondheid, maar zeker ook om de gezondheid van de ander.

Wij verzoeken u te bevestigen dat u (met uw huisgenoten) voornemens bent de dienst bij te wonen, ook al
met er minder dan bevestigd u met JA. Kan er niemand komen dan geeft u dat aan met NEE. Wij zullen dan
iemand anders proberen uit te nodigen

Wij wensen u van harte Gods zegen toe onder bediening van het Woord,
Kerkenraden Hervormde Gemeente Genemuiden`,
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

  const blad1 = spreadsheet.getSheetByName('Blad1');
  if (blad1) {
    spreadsheet.deleteSheet(blad1);
  }

  return nieuweGenodigden.length;
}
