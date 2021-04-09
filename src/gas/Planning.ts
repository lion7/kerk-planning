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
• You will be met here by an attendant. He will put your name on a list that we must keep track of
  (to be able to find out with whom certain people are involved in the event of new outbreaks).
  We request that you follow the instructions of the attendant, who will point out where you
  should take a seat, this to ensure the desired distance from other church visitors.
  As a result, you are most likely not going to sit where you usually sit. We ask for your understanding.
• If you are wearing an overcoat, please take it with you to your seat.
  (You are, of course, free to take it off and possibly put it on the couch or a chair next to you).
  The wardrobes are closed.
• You check in advance your health status and any family members regarding corona related complaints.
  In case of complaints you should stay at home.
• When leaving the service, you are asked to leave enough distance from the other persons attending,
  especially at the collection boxes. Whoever sits in the back of the church leaves first the building.
  We leave the church from the back to the front. You leave the church through the same door you entered.
  It is about your own health, but certainly also about the health of the others.

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
    const description = ['michalnawrocki1992@gmail.com', 'gdeleeuw7@gmail.com'].indexOf(genodigde.email) != -1 ?
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
  spreadsheet.appendRow(['Ingang', 'Naam', 'Aantal', 'Email']);
  planning.genodigden.forEach(genodigde => spreadsheet.appendRow([genodigde.ingang, genodigde.naam, genodigde.aantal, genodigde.email]));
  spreadsheet.getRange('1:1').setBackground('#0000ff').setFontColor('#ffffff');
  spreadsheet.setFrozenRows(1);
  spreadsheet.sort(1);
  spreadsheet.getActiveSheet().autoResizeColumns(1, spreadsheet.getLastColumn());

  return nieuweGenodigden.length;
}
