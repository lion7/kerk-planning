import {Planning} from "../common/Model";

function getPlanning(datum: string, dienst: string): Planning | undefined {
  const filename = `planning ${datum} ${dienst}.json`
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
  const filename = `planning ${planning.datum} ${planning.dienst}.json`
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const f = iterator.next();
    f.setContent(JSON.stringify(planning));
  } else {
    DriveApp.createFile(filename, JSON.stringify(planning), "application/json");
  }
}

function createDescription(dienst: string, naam: string, ingang: string, aantal: number, openingsTijd: Date): string {
  const datum = openingsTijd.toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'});
  const tijdstip = openingsTijd.toLocaleString('nl', {hour: 'numeric', minute: 'numeric'});
  let huisgenotenTekst = '';
  switch (aantal) {
    case 1:
      huisgenotenTekst = ``;
      break;
    case 2:
      huisgenotenTekst = `samen met uw huisgenoot`;
      break;
    default:
      huisgenotenTekst = `samen met uw ${aantal - 1} huisgenoten`;
      break;
  }

  return `Geachte ${naam},

Naar aanleiding van uw aanmelding om een kerkdienst bij te wonen, kunnen wij u hierbij meedelen dat u
${huisgenotenTekst} bent ingedeeld om op D.V. ${datum} de ${dienst} bij te wonen.
U wordt hartelijk uitgenodigd voor deze dienst.

• U wordt verwacht bij de ingang ${ingang}.
• De deuren van de kerk gaan open om ${tijdstip} uur
• U wordt hier opgewacht door een uitgangshulp. Deze zal uw naam aantekenen op een lijst die wij moeten
  bijhouden (om bij eventuele nieuwe uitbraken te kunnen achterhalen met wie bepaalde personen in
  aanraking zijn geweest). Wij verzoeken u de aanwijzingen van de uitgangshulp op te volgen, deze zal aanwijzen
  waar u plaats dient te nemen, dit om de gewenste afstand tot andere kerkbezoekers te kunnen waarborgen.
  Dit heeft tot gevolg dat u zeer waarschijnlijk niet op de plaats komt te zitten waar u gewoonlijk zit.
  Wij vragen hierbij om uw begrip.
• Indien u een overjas aan heeft, wilt u deze dan meenemen naar uw zitplaats. (U bent uiteraard
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
is dat met minder personen. U bevestigt dan met JA.  Kan er niemand komen dan geeft u dat aan met NEE.
Wij zullen dan iemand anders proberen uit te nodigen.

Wij wensen u van harte Gods zegen toe onder de bediening van het Woord,
Kerkenraden Hervormde Gemeente Genemuiden`;
}

function uitnodigen(planning: Planning): number {
  opslaan(planning);

  const startTijd = new Date(`${planning.datum}T${planning.tijd}`);
  const openingsTijd = new Date(startTijd);
  const eindTijd = new Date(startTijd);
  openingsTijd.setTime(startTijd.getTime() - 20 * 60 * 1000);
  eindTijd.setTime(startTijd.getTime() + 90 * 60 * 1000);

  const title = `Uitnodiging ${planning.dienst}`;

  const calendar = CalendarApp.getDefaultCalendar();
  const reedsGenodigden: string[] = [];
  const verdwenenGenodigden: string[] = [];
  calendar.getEventsForDay(new Date(planning.datum), {'search': title}).forEach(event => event.getGuestList().forEach(guest => {
    const email = guest.getEmail().toLowerCase();
    reedsGenodigden.push(email);
    if (!planning.genodigden.some(genodigde => genodigde.email === email)) {
      verdwenenGenodigden.push(email);
    }
  }));
  const nieuweGenodigden = planning.genodigden.filter(genodigde => !reedsGenodigden.includes(genodigde.email));

  nieuweGenodigden.forEach(genodigde => {
    const event = calendar.createEvent(title, startTijd, eindTijd, {
      description: createDescription(planning.dienst, genodigde.naam, genodigde.ingang, genodigde.aantal, openingsTijd),
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

  const filename = `genodigden ${planning.datum} ${planning.dienst}.json`
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
  verdwenenGenodigden.forEach(email => {
    spreadsheet.getSheets().forEach(sheet => {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][3] === email) {
          sheet.deleteRow(i);
          break;
        }
      }
    });
  });

  const blad1 = spreadsheet.getSheetByName('Blad1');
  if (blad1) {
    spreadsheet.deleteSheet(blad1);
  }

  return nieuweGenodigden.length;
}
