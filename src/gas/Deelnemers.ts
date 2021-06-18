import {Deelnemer, Opgave,} from "../common/Model";

function createDeelnemer(row: any[], headerRow: string[]): Deelnemer {
  const opgaven: Opgave[] = [];
  for (let i = 7; i < row.length; i++) {
    const dienst = headerRow[i];
    const aantal = parseInt(row[i]);
    if (dienst && aantal && !isNaN(aantal)) {
      opgaven.push({
        dienst: dienst,
        aantal: aantal
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
    uitnodigingen: []
  }
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

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  from.setMonth(now.getMonth() - 3);
  to.setMonth(now.getMonth() + 3);
  calendar.getEvents(from, to, {'search': 'Uitnodiging'}).forEach(event => {
    event.getGuestList().forEach(guest => {
      const datumTijd = event.getStartTime().toISOString();
      const datum = datumTijd.substring(0, datumTijd.indexOf('T'));
      const dienst = event.getTitle().replace("Uitnodiging ", "").trim();
      const email = guest.getEmail();
      const status = guest.getGuestStatus().toString();
      const deelnemer = result.find(value => value.email === email);
      if (deelnemer) {
        deelnemer.uitnodigingen.push({
            datum: datum,
            dienst: dienst,
            status: status
          });
        }
    });
  });
  return result;
}
