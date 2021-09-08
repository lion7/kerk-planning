import { Deelnemer, Opgave, Uitnodiging } from '../common/Model';

function createDeelnemer(row: any[], headerRow: string[]): Deelnemer {
  const opgaven: Opgave[] = [];
  for (let i = 7; i < row.length; i++) {
    const dienst = headerRow[i];
    const aantal = parseInt(row[i]);
    if (dienst && aantal && !isNaN(aantal)) {
      opgaven.push({
        dienst: dienst,
        aantal: aantal,
      });
    }
  }
  return {
    email: row[1].toLowerCase(),
    naam: row[2],
    adres: row[3],
    postcode: row[4],
    woonplaats: row[5],
    telefoonnummer: row[6],
    opgaven: opgaven,
    uitnodigingen: [],
  };
}

function getDeelnemersOld(): Deelnemer[] {
  const sheet = SpreadsheetApp.getActiveSheet();
  const deelnemers = sheet.getDataRange().getValues();
  const headerRow = deelnemers[0];
  const rows: Deelnemer[] = [];
  for (let i = 1; i < deelnemers.length; i++) {
    if (deelnemers[i][0] == '') {
      continue;
    }
    rows.push(createDeelnemer(deelnemers[i], headerRow));
  }
  // reverse the array so the last entry of duplicates is always used
  const result = rows.reverse();

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  from.setMonth(now.getMonth() - 3);
  to.setMonth(now.getMonth() + 3);
  calendar.getEvents(from, to, { search: 'Uitnodiging' }).forEach(event => {
    event.getGuestList().forEach(guest => {
      const datumTijd = event.getStartTime().toISOString();
      const datum = datumTijd.substring(0, datumTijd.indexOf('T'));
      const dienst = event.getTitle().replace('Uitnodiging ', '').trim();
      const email = guest.getEmail();
      const status = guest.getGuestStatus().toString();
      const deelnemer = result.find(value => value.email === email);
      if (deelnemer) {
        deelnemer.uitnodigingen.push({
          datum: datum,
          dienst: dienst,
          status: status,
        });
      }
    });
  });
  return result;
}

interface UitnodigingMetEmail extends Uitnodiging {
  email: string;
}

function compareUitnodiging(al: UitnodigingMetEmail, ab: UitnodigingMetEmail): number {
  if (al == undefined && ab == undefined) {
    return 0;
  } else if (al == undefined) {
    return 1;
  } else if (ab == undefined) {
    return -1;
  }

  let c = new Date(al.datum).getTime() - new Date(ab.datum).getTime();
  if (c == 0) {
    c = al.dienst.localeCompare(ab.dienst);
  }
  if (c == 0) {
    c = al.email.localeCompare(ab.email);
  }
  return c;
}

function getDeelnemers(): Deelnemer[] {
  const sheet = SpreadsheetApp.getActiveSheet();
  const deelnemers = sheet.getDataRange().getValues();
  const headerRow = deelnemers[0];
  const rows: Deelnemer[] = [];
  for (let i = 1; i < deelnemers.length; i++) {
    if (deelnemers[i][0] == '') {
      continue;
    }
    rows.push(createDeelnemer(deelnemers[i], headerRow));
  }
  // reverse the array so the last entry of duplicates is always used
  const result = rows.reverse();

  const filename = `Genodigden`;
  const iterator = DriveApp.getFilesByName(filename);
  if (iterator.hasNext()) {
    const file = iterator.next();
    const spreadsheet = SpreadsheetApp.open(file);
    spreadsheet
      .getDataRange()
      .getValues()
      .forEach(value => {
        const datumTijd = value[0] as string;
        const datum = datumTijd.substring(0, datumTijd.indexOf('T'));
        const dienst = value[1] as string;
        const email = value[2] as string;
        const status = value[3] as string;
        const deelnemer = result.find(value => value.email === email);
        if (deelnemer) {
          deelnemer.uitnodigingen.push({
            datum: datum,
            dienst: dienst,
            status: status,
          });
        }
      });
  } else {
    const deelnemersOud = getDeelnemersOld();
    const oudeUitnodigingen: UitnodigingMetEmail[] = [];
    deelnemersOud.forEach(deelnemer =>
      oudeUitnodigingen.push(
        ...deelnemer.uitnodigingen.map(uitnodiging => {
          return {
            datum: uitnodiging.datum,
            dienst: uitnodiging.dienst,
            status: uitnodiging.status,
            email: deelnemer.email,
          } as UitnodigingMetEmail;
        })
      )
    );
    oudeUitnodigingen.sort((a, b) => compareUitnodiging(a, b));
    const spreadsheet = SpreadsheetApp.create(filename);
    oudeUitnodigingen.forEach(value => spreadsheet.appendRow([value.datum, value.dienst, value.email, value.status]));
    return deelnemersOud;
  }

  return result;
}
