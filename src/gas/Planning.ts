import { Genodigde, Planning } from '../common/Model';
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function createDescriptionDutch(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('nl', { day: 'numeric', month: 'long', year: 'numeric' });
  const tijdstip = openingsTijd.toLocaleString('nl', { hour: 'numeric', minute: 'numeric' });
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

  return `Geachte ${genodigde.naam},

Naar aanleiding van uw aanmelding om een kerkdienst bij te wonen,
kunnen wij u hierbij meedelen dat u ${huisgenotenTekst}
bent ingedeeld om op D.V. ${datum} de ${dienst} bij te wonen.

U wordt hartelijk uitgenodigd voor deze dienst.
• U wordt verwacht bij de ingang ${genodigde.ingang.replace('galerij', 'GALERIJ')}.
• De deuren van de kerk gaan open om ${tijdstip} uur.
• U wordt hier opgewacht door een uitgangshulp.
• Uiteraard gelden de inmiddels bekende corona regels.
• Bij het uitgaan van de dienst wordt u verzocht om voldoende afstand van de andere
  kerkgangers te bewaren, ook bij de collectebussen. Op aanwijzing van de uitgangshulp
  verlaat u het gebouw door dezelfde deur als waar u naar binnen bent gekomen.

Mocht u verhinderd zijn, dan verzoeken wij u vriendelijk om op deze e-mail te reageren.
Wij zullen dan iemand anders proberen uit te nodigen.

Wij wensen u van harte Gods zegen toe onder de bediening van het Woord,
Kerkenraden Hervormde Gemeente Genemuiden`;
}

function createDescriptionEnglish(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('en', { day: 'numeric', month: 'long', year: 'numeric' });
  const tijdstip = openingsTijd.toLocaleString('en', { hour: 'numeric', minute: 'numeric' });
  let huisgenotenTekst = '';
  switch (genodigde.aantal) {
    case 1:
      huisgenotenTekst = ``;
      break;
    case 2:
      huisgenotenTekst = `with your housemate`;
      break;
    default:
      huisgenotenTekst = `with your ${genodigde.aantal - 1} housemates`;
      break;
  }

  return `Dear ${genodigde.naam},

Following your registration to attend a church service,
we hereby inform you that you ${huisgenotenTekst}
are scheduled to attend the ${dienst} on ${datum}.

You are cordially invited to this service.
• You are expected at the entrance ${genodigde.ingang}.
• The doors of the church will open at ${tijdstip}
• You will be met here by an attendant.
• Of course, the usual corona measures apply.
• When leaving the service, you are asked to leave enough distance from the other persons attending,
  especially at the collection boxes. You will leave the on the instructions of the attendant,
  through the same door you entered.

If you are unable to attend, we kindly request you to respond to this e-mail.
We will then try to invite someone else.

We sincerely wish you God's blessing under the ministry of the Word,
Hervormde Gemeente Genemuiden`;
}

function getPlanning(datum: string, dienst: string): Planning | undefined {
  const filename = `planning ${datum} ${dienst}.json`;
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
  const filename = `planning ${planning.datum} ${planning.dienst}.json`;
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const f = iterator.next();
    f.setContent(JSON.stringify(planning));
  } else {
    DriveApp.createFile(filename, JSON.stringify(planning), 'application/json');
  }
}

function maakGenodigdenSpreadsheet(planning: Planning) {
  const filename = `genodigden ${planning.datum} ${planning.dienst}`;
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    file.setTrashed(true);
  }
  const spreadsheet = SpreadsheetApp.create(filename);
  spreadsheet.appendRow([`Genodigden ${planning.dienst} op ${planning.datum}`]);
  spreadsheet.getRange('A1:D1').merge();
  spreadsheet.appendRow(['Ingang', 'Naam', 'Aantal', 'Email']);
  planning.genodigden.forEach(genodigde => spreadsheet.appendRow([genodigde.ingang, genodigde.naam, genodigde.aantal, genodigde.email]));
  spreadsheet.getRange('1:2').setBackground('#0000ff').setFontColor('#ffffff');
  spreadsheet.setFrozenRows(2);
  spreadsheet.sort(1);
  spreadsheet.getActiveSheet().autoResizeColumns(1, spreadsheet.getLastColumn());
}

function verstuurUitnodiging(genodigde: Genodigde, datum: string, dienst: string, openingsTijd: Date, spreadsheet: Spreadsheet) {
  const engelsen = ['michalnawrocki1992@gmail.com'];
  const title = `Uitnodiging ${dienst}`;
  const description = engelsen.includes(genodigde.email) ? createDescriptionEnglish(dienst, openingsTijd, genodigde) : createDescriptionDutch(dienst, openingsTijd, genodigde);
  MailApp.sendEmail({
    subject: title,
    to: genodigde.email,
    body: description,
  });
  spreadsheet.appendRow([datum, dienst, genodigde.email, 'INVITED']);
  Logger.log(`${title} verstuurd naar ${genodigde.email} (resterende quota: ${MailApp.getRemainingDailyQuota()})`);
}

function verwerkVerwijderdeGenodigden(datum: string, dienst: string, verwijderdeGenodigden: string[], spreadsheet: Spreadsheet) {
  const range = spreadsheet.getDataRange();
  range.getValues().forEach((value, index) => {
    const datumValue = value[0];
    const datumString = datumValue instanceof Date ? datumValue.toISOString().substring(0, 10) : datumValue.toString();
    const dienstValue = value[1] as string;
    const email = value[2] as string;
    if (datumString == datum && dienstValue == dienst && verwijderdeGenodigden.includes(email)) {
      range.getCell(index, 3).setValue('NO');
    }
  });
}

function uitnodigen(planning: Planning): number {
  const oudePlanning = getPlanning(planning.datum, planning.dienst);
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

  const reedsGenodigden = oudePlanning ? oudePlanning.genodigden.map(genodigde => genodigde.email) : [];
  const nieuwGenodigden = planning.genodigden.map(genodigde => genodigde.email);
  const verwijderdeGenodigden = reedsGenodigden.filter(email => !nieuwGenodigden.includes(email));
  const toegevoegdeGenodigden = nieuwGenodigden.filter(email => !reedsGenodigden.includes(email));

  opslaan(planning);
  maakGenodigdenSpreadsheet(planning);
  planning.genodigden
    .filter(genodigde => toegevoegdeGenodigden.includes(genodigde.email))
    .forEach(genodigde => verstuurUitnodiging(genodigde, planning.datum, planning.dienst, openingsTijd, spreadsheet));
  verwerkVerwijderdeGenodigden(planning.datum, planning.dienst, verwijderdeGenodigden, spreadsheet);

  return toegevoegdeGenodigden.length;
}
