import {Genodigde, Planning} from "../common/Model";

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

function getReedsGenodigden(startTijd: Date, eindTijd: Date): string[] {
  const result: string[] = [];
  const calendar = CalendarApp.getDefaultCalendar();
  calendar.getEvents(startTijd, eindTijd).forEach(event => {
    event.getGuestList().forEach(guest => {
      const email = guest.getEmail();
      result.push(email);
    });
  });
  return result;
}

function createDescriptionDutch(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'});
  const tijdstip = openingsTijd.toLocaleString('nl', {hour: 'numeric', minute: 'numeric'});
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
• U wordt verwacht bij de ingang ${genodigde.ingang}.
• De deuren van de kerk gaan open om ${tijdstip} uur.
• U wordt hier opgewacht door een uitgangshulp.
• Uiteraard gelden de inmiddels bekende corona regels.
• Bij het uitgaan van de dienst wordt u verzocht om voldoende afstand van de andere
  kerkgangers te bewaren, ook bij de collectebussen. Op aanwijzing van de uitgangshulp
  verlaat u het gebouw door dezelfde deur als waar u naar binnen bent gekomen.

Wij verzoeken u te bevestigen dat u (met uw huisgenoten) voornemens bent de dienst bij te wonen, ook al
is dat met minder personen. U bevestigt dan met JA. Kan er niemand komen dan geeft u dat aan met NEE.
Wij zullen dan iemand anders proberen uit te nodigen.

Wij wensen u van harte Gods zegen toe onder de bediening van het Woord,
Kerkenraden Hervormde Gemeente Genemuiden`;
}

function createDescriptionEnglish(dienst: string, openingsTijd: Date, genodigde: Genodigde): string {
  const datum = openingsTijd.toLocaleString('en', {day: 'numeric', month: 'long', year: 'numeric'});
  const tijdstip = openingsTijd.toLocaleString('en', {hour: 'numeric', minute: 'numeric'});
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

We ask you to confirm that you (with your housemates) intend to attend the service, even if with fewer people.
You then confirm with YES. If no one can come, indicate this with NO. We will then try to invite someone else.

We sincerely wish you God's blessing under the ministry of the Word,
Hervormde Gemeente Genemuiden`;
}

function uitnodigen(planning: Planning): number {
  const title = `Uitnodiging ${planning.dienst}`;
  const startTijd = new Date(`${planning.datum}T${planning.tijd}`);
  const openingsTijd = new Date(startTijd);
  const eindTijd = new Date(startTijd);
  openingsTijd.setTime(startTijd.getTime() - 20 * 60 * 1000);
  eindTijd.setTime(startTijd.getTime() + 90 * 60 * 1000);

  const reedsGenodigden = getReedsGenodigden(startTijd, eindTijd);
  const nieuweGenodigden = planning.genodigden.filter(genodigde => !reedsGenodigden.includes(genodigde.email));

  const calendar = CalendarApp.getDefaultCalendar();
  nieuweGenodigden.forEach(genodigde => {
    Logger.log(`${title} voor ${genodigde.naam} (${genodigde.aantal} personen) met email ${genodigde.email}`);
    const description = ['michalnawrocki1992@gmail.com'].indexOf(genodigde.email) != -1 ?
      createDescriptionEnglish(planning.dienst, openingsTijd, genodigde) :
      createDescriptionDutch(planning.dienst, openingsTijd, genodigde);
    const event = calendar.createEvent(title, startTijd, eindTijd, {
      description: description,
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

  opslaan(planning);

  const filename = `genodigden ${planning.datum} ${planning.dienst}`
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    file.setTrashed(true);
  }
  const spreadsheet = SpreadsheetApp.create(filename);
  spreadsheet.appendRow([`Genodigden ${planning.dienst} op ${planning.datum}`]);
  spreadsheet.getRange("A1:D1").merge();
  spreadsheet.appendRow(['Ingang', 'Naam', 'Aantal', 'Email']);
  planning.genodigden.forEach(genodigde => spreadsheet.appendRow([genodigde.ingang, genodigde.naam, genodigde.aantal, genodigde.email]));
  spreadsheet.getRange('1:2').setBackground('#0000ff').setFontColor('#ffffff');
  spreadsheet.setFrozenRows(2);
  spreadsheet.sort(1);
  spreadsheet.getActiveSheet().autoResizeColumns(1, spreadsheet.getLastColumn());

  return nieuweGenodigden.length;
}
