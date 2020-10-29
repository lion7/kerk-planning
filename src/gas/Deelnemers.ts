import {
  Deelnemer,
  Opgave,
} from "../common/Model";

function createDeelnemer(row: any[], headerRow: string[]): Deelnemer {
  const opgaven: Opgave[] = [];
  for (let i = 7; i < row.length; i++) {
    const dienst = headerRow[i];
    const aantal = parseInt(row[i]);
    opgaven.push({
      dienst: dienst,
      aantal: aantal
    });
  }
  return {
    email: row[1],
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
  const result: Deelnemer[] = [];
  for (let i = 1; i < deelnemers.length; i++) {
    if (deelnemers[i][0] == '') {
      continue;
    }
    result.push(createDeelnemer(deelnemers[i], headerRow));
  }

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  from.setMonth(now.getMonth() - 3);
  to.setMonth(now.getMonth() + 3);
  calendar.getEvents(from, to, {'search': 'Uitnodiging'}).forEach(event => {
    event.getGuestList().forEach(guest => {
      const deelnemer = result.find(value => value.email === guest.getEmail());
      if (deelnemer) {
        deelnemer.uitnodigingen.push({
          datum: event.getStartTime().toISOString(),
          status: guest.getGuestStatus().toString()
        });
      }
    });
  });
  return result;
}
