import { Genodigde, Planning } from '../common/Model';
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import Sheet = GoogleAppsScript.Spreadsheet.Sheet;

const planningenFolder = DriveApp.getFolderById('16e3f4M8OIVj2SzYiKWQIuKbfbTLRz4P6');
const genodigdenFolder = DriveApp.getFolderById('1LrC7sKphoZWKEj-hPGGxk2XFw2Uc8QB1');

function createDescriptionDutch(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('nl', { day: 'numeric', month: 'long', year: 'numeric' });
  const tijdstip = openingsTijd.toLocaleString('nl', { hour: 'numeric', minute: 'numeric' });
  let huisgenotenTekst = '';
  switch (genodigde.aantal) {
    case 1:
      huisgenotenTekst = `u`;
      break;
    case 2:
      huisgenotenTekst = `u samen met uw huisgenoot`;
      break;
    default:
      huisgenotenTekst = `u samen met uw ${genodigde.aantal - 1} huisgenoten`;
      break;
  }

  return `Geachte ${genodigde.naam},

Naar aanleiding van uw aanmelding om een kerkdienst bij te wonen, kunnen wij u hierbij meedelen dat ${huisgenotenTekst} bent ingedeeld om op D.V. ${datum} de ${dienst} bij te wonen.

U wordt hartelijk uitgenodigd voor deze dienst.
• U wordt verwacht bij de ingang ${genodigde.ingang.replace('galerij', 'GALERIJ')}.
• De deuren van de kerk gaan open om ${tijdstip} uur.
• U wordt hier opgewacht door een uitgangshulp.
• Uiteraard gelden de inmiddels bekende corona regels.
• Bij het uitgaan van de dienst wordt u verzocht om voldoende afstand van de andere kerkgangers te bewaren, ook bij de collectebussen. Op aanwijzing van de uitgangshulp verlaat u het gebouw door dezelfde deur als waar u naar binnen bent gekomen.

Mocht u verhinderd zijn, dan verzoeken wij u vriendelijk om op deze e-mail te reageren. Wij zullen dan iemand anders proberen uit te nodigen.

Wij wensen u van harte Gods zegen toe onder de bediening van het Woord,
Kerkenraden Hervormde Gemeente Genemuiden`;
}

function createDescriptionEnglish(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('en', { day: 'numeric', month: 'long', year: 'numeric' });
  const tijdstip = openingsTijd.toLocaleString('en', { hour: 'numeric', minute: 'numeric' });
  let huisgenotenTekst = '';
  switch (genodigde.aantal) {
    case 1:
      huisgenotenTekst = `you`;
      break;
    case 2:
      huisgenotenTekst = `you with your housemate`;
      break;
    default:
      huisgenotenTekst = `you with your ${genodigde.aantal - 1} housemates`;
      break;
  }

  return `Dear ${genodigde.naam},

Following your registration to attend a church service, we hereby inform you that ${huisgenotenTekst} are scheduled to attend the ${dienst} on ${datum}.

You are cordially invited to this service.
• You are expected at the entrance ${genodigde.ingang}.
• The doors of the church will open at ${tijdstip}
• You will be met here by an attendant.
• Of course, the usual corona measures apply.
• When leaving the service, you are asked to leave enough distance from the other persons attending, especially at the collection boxes. You will leave the on the instructions of the attendant, through the same door you entered.

If you are unable to attend, we kindly request you to respond to this e-mail. We will then try to invite someone else.

We sincerely wish you God's blessing under the ministry of the Word,
Hervormde Gemeente Genemuiden`;
}

function getPlanning(datum: string, dienst: string): Planning | undefined {
  const iterator = planningenFolder.getFilesByName(`planning ${datum} ${dienst}.json`);
  if (iterator.hasNext()) {
    const file = iterator.next();
    const json = file.getBlob().getDataAsString();
    return JSON.parse(json);
  }
  return undefined;
}

function opslaan(planning: Planning) {
  const filename = `planning ${planning.datum} ${planning.dienst}.json`;
  const iterator = planningenFolder.getFilesByName(filename);
  if (iterator.hasNext()) {
    const f = iterator.next();
    f.setContent(JSON.stringify(planning));
  } else {
    planningenFolder.createFile(filename, JSON.stringify(planning), 'application/json');
  }
}

function maakGenodigdenSpreadsheet(planning: Planning) {
  const filename = `genodigden ${planning.datum} ${planning.dienst}`;
  const iterator = genodigdenFolder.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    file.setTrashed(true);
  }

  const spreadsheet = SpreadsheetApp.create(filename);
  const file = DriveApp.getFileById(spreadsheet.getId());
  genodigdenFolder.addFile(file);
  DriveApp.removeFile(file);

  spreadsheet.appendRow([`Genodigden ${planning.dienst} op ${planning.datum}`]);
  spreadsheet.getRange('A1:D1').merge();
  spreadsheet.appendRow(['Ingang', 'Naam', 'Aantal', 'Email']);
  planning.genodigden.forEach(genodigde => spreadsheet.appendRow([genodigde.ingang, genodigde.naam, genodigde.aantal, genodigde.email]));
  spreadsheet.getRange('1:2').setBackground('#0000ff').setFontColor('#ffffff');
  spreadsheet.setFrozenRows(2);
  spreadsheet.sort(1);
  spreadsheet.getActiveSheet().autoResizeColumns(1, spreadsheet.getLastColumn());
}

function verstuurUitnodiging(genodigde: Genodigde, dienst: string, openingsTijd: Date, sheet: Sheet) {
  const engelsen = ['michalnawrocki1992@gmail.com'];
  const title = `Uitnodiging ${dienst}`;
  const description = engelsen.includes(genodigde.email) ? createDescriptionEnglish(dienst, openingsTijd, genodigde) : createDescriptionDutch(dienst, openingsTijd, genodigde);
  const remainingMailQuota = MailApp.getRemainingDailyQuota();
  if (remainingMailQuota > 0) {
    GmailApp.sendEmail(genodigde.email, title, description);
    Logger.log(`${title} verstuurd naar ${genodigde.email} (resterende quota: ${remainingMailQuota - 1})`);
  } else {
    GmailApp.createDraft(genodigde.email, title, description);
    Logger.log(`${title} concept aangemaakt voor ${genodigde.email}`);
  }
  if (remainingMailQuota == 2) {
    GmailApp.sendEmail('gdeleeuw7@gmail.com', 'Mail quota bereikt', 'Hoi Gerard,\n\nHet mail quota voor vandaag is op, verstuur de concepten handmatig!\n\nGroeten,\nKerkPlanning');
  }
  sheet.appendRow([dienst, genodigde.email, 'INVITED']);
}

function verwerkVerwijderdeGenodigden(dienst: string, verwijderdeGenodigden: string[], sheet: Sheet) {
  const range = sheet.getDataRange();
  range.getValues().forEach((value, index) => {
    const row = index + 1;
    const dienstValue = value[0] as string;
    const email = value[1] as string;
    const status = value[2] as string;
    if (dienstValue == dienst && status !== 'NO' && verwijderdeGenodigden.includes(email)) {
      console.log(`Marking row ${row} (${email}) as 'NO'`);
      range.getCell(row, 3).setValue('NO');
    }
  });
}

function uitnodigen(planning: Planning): number {
  console.log(`Uitnodigingen versturen voor ${planning.datum} ${planning.dienst}`);

  const startTijd = new Date(`${planning.datum}T${planning.tijd}`);
  const openingsTijd = new Date(startTijd);
  const eindTijd = new Date(startTijd);
  openingsTijd.setTime(startTijd.getTime() - 20 * 60 * 1000);
  eindTijd.setTime(startTijd.getTime() + 90 * 60 * 1000);

  const filename = `Genodigden`;
  const iterator = DriveApp.getFilesByName(filename);
  let spreadsheet: Spreadsheet;
  if (iterator.hasNext()) {
    const file = iterator.next();
    spreadsheet = SpreadsheetApp.open(file);
  } else {
    spreadsheet = SpreadsheetApp.create(filename);
  }

  let sheet: Sheet;
  const sheetOrNull = spreadsheet.getSheetByName(planning.datum);
  if (sheetOrNull) {
    sheet = sheetOrNull;
  } else {
    sheet = spreadsheet.insertSheet();
    sheet.setName(planning.datum);
  }

  const reedsGenodigden = sheet
    .getDataRange()
    .getValues()
    .filter(value => value[0] == planning.dienst)
    .map(value => value[1] as string);
  const nieuwGenodigden = planning.genodigden.filter(genodigde => genodigde?.email).map(genodigde => genodigde.email);
  const verwijderdeGenodigden = reedsGenodigden.filter(email => !nieuwGenodigden.includes(email));
  const toegevoegdeGenodigden = nieuwGenodigden.filter(email => !reedsGenodigden.includes(email));

  console.log(`Verwijderde genodigden: ${verwijderdeGenodigden}`);
  console.log(`Toegevoegde genodigden: ${toegevoegdeGenodigden}`);

  opslaan(planning);
  verwerkVerwijderdeGenodigden(planning.dienst, verwijderdeGenodigden, sheet);
  maakGenodigdenSpreadsheet(planning);
  planning.genodigden
    .filter(genodigde => toegevoegdeGenodigden.includes(genodigde.email))
    .forEach(genodigde => verstuurUitnodiging(genodigde, planning.dienst, openingsTijd, sheet));

  console.log(`${toegevoegdeGenodigden.length} uitnodigingen verstuurd voor ${planning.datum} ${planning.dienst}`);

  return toegevoegdeGenodigden.length;
}
