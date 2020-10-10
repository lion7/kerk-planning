import {css, html, LitElement, property, PropertyValues} from 'lit-element';
import {Beschikbaarheid, Deelnemer, Gebouw, Genodigde, Planning, Richting, Stoel, Tijdvak} from "../common/Model";

export class KerkPlanning extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    th {
      text-align: left;
    }

    #deelnemers th {
      position: sticky;
      top: 0;
      background: white;
      padding: 0.25rem;
    }

    #deelnemers td ul {
      margin: 0.25rem 0;
      padding: 0 1rem;
    }

    #gebouwen {
      display: grid;
    }

    #gebouw {
      position: fixed;
      bottom: 10px;
      right: 10px;
      display: grid;
      background-color: #836B32;
    }

    #controls {
      position: fixed;
      top: 10px;
      right: 10px;
      height: 100px;
      display: grid;
      grid-template-columns: 200px 200px 200px;
      gap: 8px;
    }

    .deelnemer {
      cursor: move;
    }

    .stoel {
      height: 100%;
      width: 100%;
    }
  `;

  @property({type: String}) gebouwenUrl = '';
  @property({type: String}) deelnemersUrl = '';
  @property({type: String}) uitnodigenUrl = '';
  @property({type: Number}) private gebouwIndex = 0;
  @property({type: String}) private tijdvak = Tijdvak.Ochtend;
  @property({type: String}) private datum = KerkPlanning.volgendeZondag();
  @property({type: []}) gebouwen: Gebouw[] = [];
  @property({type: []}) deelnemers: Deelnemer[] = [];
  @property({type: []}) private genodigden: Genodigde[] = [];
  @property({type: Function}) uitnodigen: (planning: Planning) => void = planning => {
    console.log(planning);
  };

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    if (changedProperties.has('gebouwenUrl') && this.gebouwenUrl && this.gebouwenUrl != '') {
      console.log(`Gebouwen ophalen van ${this.gebouwenUrl}`);
      fetch(this.gebouwenUrl, {mode: "no-cors"}).then(value => value.json()).then(value => {
        this.gebouwIndex = 0;
        this.gebouwen = value;
      });
    }
    if (changedProperties.has('deelnemersUrl') && this.deelnemersUrl && this.deelnemersUrl != '') {
      console.log(`Deelnemers ophalen van ${this.deelnemersUrl}`);
      fetch(this.deelnemersUrl, {mode: "no-cors"}).then(value => value.json()).then(value => this.deelnemers = value);
    }
    if (changedProperties.has('uitnodigenUrl') && this.uitnodigenUrl && this.uitnodigenUrl != '') {
      this.uitnodigen = genodigden => {
        fetch(this.uitnodigenUrl, {
          method: 'POST',
          body: JSON.stringify(genodigden)
        }).then(value => console.log(`Uitnodigingen verstuurd: ${value}`))
      }
    }
  }

  _dragstart(event: DragEvent) {
    const el = event.target as Element;
    if (!el || !el.getAttribute) {
      return;
    }
    const deelnemerId = el.getAttribute("data-deelnemer-id");
    if (!deelnemerId) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    event.dataTransfer?.setData('text/plain', deelnemerId);
  }

  _drop(event: DragEvent) {
    const el = event.target as Element;
    if (!el || !el.getAttribute) {
      return;
    }
    const stoelIndexStr = el.getAttribute("data-stoel-index");
    if (!stoelIndexStr) {
      console.log("Stoel index niet gevonden!");
      return;
    }

    const deelnemerIdStr = event.dataTransfer?.getData('text/plain');
    if (!deelnemerIdStr) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    const gebouw = this.gebouwen[this.gebouwIndex]
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return;
    }

    const stoelIndex = parseInt(stoelIndexStr);
    const stoel = gebouw.stoelen[stoelIndex];
    if (!stoel) {
      console.log("Stoel niet gevonden!");
      return;
    }

    const deelnemerId = parseInt(deelnemerIdStr);
    const deelnemer = this.findDeelnemer(deelnemerId);
    if (!deelnemer) {
      console.log("Deelnemer niet gevonden!");
      return;
    }

    const aantalStoelenNodig = parseInt(deelnemer.aantal);
    const vanRij = stoel.rij;
    const totRij = KerkPlanning.isHorizontaal(stoel.richting) ? vanRij + 1 : vanRij + aantalStoelenNodig;
    const vanKolom = stoel.kolom;
    const totKolom = KerkPlanning.isHorizontaal(stoel.richting) ? vanKolom + aantalStoelenNodig : vanKolom + 1;
    console.log(`Proberen om ${deelnemer.naam} in te delen op ${aantalStoelenNodig} stoelen van rij ${vanRij}-${totRij} en van kolom ${vanKolom}-${totKolom}`);
    const gevondenStoelen = gebouw.stoelen.filter(stoel => stoel.rij >= vanRij && stoel.rij < totRij && stoel.kolom >= vanKolom && stoel.kolom < totKolom);
    console.log(`${gevondenStoelen.length} stoelen gevonden voor ${deelnemer.naam}`);
    if (gevondenStoelen.length == aantalStoelenNodig) {
      const genodigde: Genodigde = {
        id: deelnemer.id,
        naam: deelnemer.naam,
        aantal: aantalStoelenNodig,
        email: deelnemer.email,
        gebouw: gebouw.naam,
        ingang: KerkPlanning.ingang(gebouw, gevondenStoelen[0]),
        stoelen: gevondenStoelen
      };
      this.genodigden = [...this.genodigden.filter(value => value.id != deelnemerId), genodigde];
    }
  }

  _reset(event: DragEvent) {
    const deelnemerIdStr = event.dataTransfer?.getData('text/plain');
    if (!deelnemerIdStr) {
      console.log("Deelnemer id niet gevonden!");
      return;
    }

    const deelnemerId = parseInt(deelnemerIdStr);
    this.genodigden = this.genodigden.filter(value => value.id != deelnemerId);
  }

  _downloadLijst(event: Event) {
    event.preventDefault();
    const rows = this.genodigden.sort((a, b) => a.ingang.localeCompare(b.ingang))
      .map(value => [value.gebouw, value.ingang, value.naam, value.aantal, value.email]);
    const csvContent = "data:text/csv;charset=utf-8,gebouw;ingang;naam;aantal personen;email\n" + rows.map(e => e.join(";")).join("\n");
    const link = document.createElement("a");
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `genodigden-${new Date().toISOString()}.csv`);
    link.click(); // This will download the CSV file
  }

  _verstuurUitnodigingen(event: Event) {
    event.preventDefault();
    const planning: Planning = {
      datum: this.datum.toISOString(),
      tijdvak: this.tijdvak,
      genodigden: this.genodigden
    };
    this.uitnodigen(planning);
  }

  _selecteerGebouw(event: Event) {
    const el = event.target as HTMLInputElement;
    this.gebouwIndex = parseInt(el.value);
  }

  _selecteerTijdvak(event: Event) {
    const el = event.target as HTMLInputElement;
    this.tijdvak = el.value as Tijdvak;
  }

  _selecteerDatum(event: Event) {
    const el = event.target as HTMLInputElement;
    this.datum = new Date(el.value);
  }

  render() {
    const gebouw = this.gebouwen[this.gebouwIndex]
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return;
    }

    const aantalStoelen = gebouw.stoelen.length;
    let beschikbareStoelen: Stoel[] = [];
    let aantalStoelenBeschikbaar = 0;
    let aantalStoelenIngepland = 0;
    let gridRowsTemplate = css`100%`;
    let gridColumnsTemplate = css`100%`;

    if (aantalStoelen > 0) {
      beschikbareStoelen = gebouw.stoelen.filter(stoel => this.isBeschikbaar(gebouw, stoel));
      aantalStoelenIngepland = this.genodigden.filter(value => value.gebouw == gebouw.naam)
        .map(value => value.stoelen.length)
        .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
      aantalStoelenBeschikbaar = beschikbareStoelen.length;

      const rijen = [...gebouw.stoelen.map(value => value.rij), ...gebouw.props.map(value => value.rij)]
        .reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
      const kolommen = [...gebouw.stoelen.map(value => value.kolom), ...gebouw.props.map(value => value.kolom)]
        .reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
      gridRowsTemplate = css`repeat(${rijen}, min((100vh - 130px) / ${rijen}, (49vw - 20px) / ${kolommen}))`;
      gridColumnsTemplate = css`repeat(${kolommen}, min((100vh - 130px) / ${rijen}, (49vw - 20px) / ${kolommen}))`;
    }

    return html`
      <div id="planning" xmlns="http://www.w3.org/1999/html">
        <table id="deelnemers"
               style="width: 49vw"
               draggable="false"
               ondragenter="return false"
               ondragover="return false"
               @drop="${this._reset}">
          <thead>
          <tr>
            <th>Naam</th>
            <th>Aantal</th>
            <th>Voorkeuren</th>
            <th>Afwezigheid</th>
            <th>Uitnodigingen</th>
          </tr>
          </thead>
          <tbody>
          ${this.deelnemers
      .filter(deelnemer => this.kanIngeplandWorden(deelnemer))
      .sort((a, b) => KerkPlanning.laatsteUitnodiging(a).getTime()- KerkPlanning.laatsteUitnodiging(b).getTime())
      .map(value => html`
            <tr>
            <td style="background-color: ${this.isGenodigde(value) ? 'red' : 'transparant'}"
                draggable="true"
                data-deelnemer-id="${value.id}"
                @dragstart="${this._dragstart})">${value.naam}</td>
            <td>${value.aantal}</td>
            <td><ul>${value.voorkeuren.map(value => html`<li>${value}</li>`)}</ul></td>
            <td><ul>${value.afwezigheid.map(value => html`<li>${value}</li>`)}</ul></td>
            <td><ul>${value.uitnodigingen.map(value => html`<li>${new Date(value.datum).toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'})} - ${value.status}</li>`)}</ul></td>
            </tr>
          `)}
          </tbody>
        </table>

        <div id="controls">
          <div>Gebouw:<br/><select @change="${this._selecteerGebouw}">${this.gebouwen.map(((value, index) => html`<option value="${index}">${value.naam}</option>`))}</select></div>
          <div>Tijdvak:<br/><select @change="${this._selecteerTijdvak}">${Object.keys(Tijdvak).map(value => html`<option value="${value}">${value}</option>`)}</select></div>
          <div>Datum:<br/><input type="date" @change="${this._selecteerDatum}" value="${KerkPlanning.isoDatum(this.datum)}" /></div>
          <div>Aantal plekken: ${aantalStoelen}</div>
          <div>Plekken beschikbaar: ${aantalStoelenBeschikbaar}</div>
          <div>Plekken ingepland: ${aantalStoelenIngepland}</div>
          <div></div>
          <button @click="${this._downloadLijst}">Lijst downloaden</button>
          <button @click="${this._verstuurUitnodigingen}">Uitnodigingen versturen</button>
        </div>

        <div id="gebouw" style="grid-template-rows: ${gridRowsTemplate}; grid-template-columns: ${gridColumnsTemplate};">
        ${gebouw.props.map(prop => html`
        <div style="grid-row: ${prop.rij}; grid-column: ${prop.kolom}; background-color: ${prop.kleur}"></div>
        `)}
          ${gebouw.stoelen.map((stoel, index) => {
      const genodigde = this.findGenodigde(stoel);
      const rotation = KerkPlanning.rotation(stoel.richting);
      let styling = '';
      let beschikbaar = false;
      let title = 'Leeg';
      if (genodigde) {
        styling = 'background-color: red';
        title = genodigde.naam;
      } else if (stoel.beschikbaarheid == Beschikbaarheid.Gereserveerd) {
        styling = 'background-color: cyan';
        title = 'Gereserveerd';
      } else if (beschikbareStoelen.includes(stoel)) {
        styling = 'background-color: green';
        beschikbaar = true;
      }
      return html`
          <img src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M112 128c0-29.5 16.2-55 40-68.9V256h48V48h48v208h48V59.1c23.8 13.9 40 39.4 40 68.9v128h48V128C384 57.3 326.7 0 256 0h-64C121.3 0 64 57.3 64 128v128h48zm334.3 213.9l-10.7-32c-4.4-13.1-16.6-21.9-30.4-21.9H42.7c-13.8 0-26 8.8-30.4 21.9l-10.7 32C-5.2 362.6 10.2 384 32 384v112c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V384h256v112c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V384c21.8 0 37.2-21.4 30.3-42.1z"/></svg>'
               class="stoel"
               draggable="${!!genodigde}"
               data-stoel-index="${index}"
               data-deelnemer-id="${genodigde ? genodigde.id : ''}"
               title="${title}"
               style="grid-row: ${stoel.rij}; grid-column: ${stoel.kolom}; transform: rotate(${rotation}); ${styling}"
               ondragenter="return ${!beschikbaar}"
               ondragover="return ${!beschikbaar}"
               @dragstart="${this._dragstart}"
               @drop="${this._drop}" />

      `;
    })}
        </div>
      </div>
    `;
  }

  private findDeelnemer(id: number): Deelnemer | undefined {
    return this.deelnemers.find(value => value.id == id);
  }

  private findGenodigde(stoel: Stoel): Genodigde | undefined {
    return this.genodigden.find(value => value.stoelen.includes(stoel));
  }

  private isGenodigde(deelnemer: Deelnemer): boolean {
    return this.genodigden.some(value => value.id == deelnemer.id);
  }

  private isBeschikbaar(gebouw: Gebouw, stoel: Stoel): boolean {
    if (stoel.beschikbaarheid != Beschikbaarheid.Beschikbaar) {
      return false;
    }
    const gereserveerdeStoelen = gebouw.stoelen.filter(value => value.beschikbaarheid == Beschikbaarheid.Gereserveerd).map(value => [value]);
    if (gereserveerdeStoelen.some(stoelen => KerkPlanning.isOnbeschikbaar(stoel, stoelen))) {
      return false;
    }
    const ingeplandeStoelen = this.genodigden.filter(value => value.gebouw == gebouw.naam).map(value => value.stoelen);
    return !ingeplandeStoelen.some(stoelen => KerkPlanning.isOnbeschikbaar(stoel, stoelen));
  }

  private kanIngeplandWorden(deelnemer: Deelnemer): boolean {
    return (deelnemer.voorkeuren.length == 0 || deelnemer.voorkeuren.some(v => this.isVoorkeur(v))) &&
      (deelnemer.afwezigheid.length == 0 || !deelnemer.afwezigheid.some(v => this.isAfwezig(v)));
  }

  private isVoorkeur(voorkeur: string): boolean {
    const gebouw = this.gebouwen[this.gebouwIndex]
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return false;
    }
    const v = voorkeur.toLowerCase();
    const g = gebouw.naam.includes('(') ? gebouw.naam.substring(0, gebouw.naam.indexOf('(')).toLowerCase().trim() : gebouw.naam.toLowerCase();
    const t = this.tijdvak.toLowerCase();
    return v.includes(g) && v.includes(t);
  }

  private isAfwezig(datum: string): boolean {
    const planDatum = this.datum.toLocaleString('nl', {day: 'numeric', month: 'long', year: 'numeric'});
    return datum.startsWith(planDatum);
  }

  private static isOnbeschikbaar(stoel: Stoel, stoelen: Stoel[]): boolean {
    const richting = stoelen[0].richting;
    let totRij = stoelen.map(value => value.rij).reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
    let vanRij = stoelen.map(value => value.rij).reduce((previousValue, currentValue) => previousValue > currentValue ? currentValue : previousValue, totRij);
    let totKolom = stoelen.map(value => value.kolom).reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
    let vanKolom = stoelen.map(value => value.kolom).reduce((previousValue, currentValue) => previousValue > currentValue ? currentValue : previousValue, totKolom);
    if (KerkPlanning.isHorizontaal(richting)) {
      vanRij -= 2;
      totRij += 2;
      totKolom += 3;
      vanKolom -= 3;
    } else {
      vanRij -= 3;
      totRij += 3;
      totKolom += 2;
      vanKolom -= 2;
    }
    return (stoel.rij >= vanRij && stoel.rij <= totRij) && (stoel.kolom >= vanKolom && stoel.kolom <= totKolom)
  }

  private static isHorizontaal(richting: Richting) {
    return richting === Richting.Noord || richting === Richting.Zuid;
  }

  private static rotation(richting: Richting): string {
    switch (richting) {
      case Richting.Noord:
        return '180deg';
      case Richting.Oost:
        return '270deg';
      case Richting.Zuid:
        return '0';
      case Richting.West:
        return '90deg';
      default:
        return '0';
    }
  }

  private static ingang(gebouw: Gebouw, stoel: Stoel): string {
    const ingang = gebouw.ingangen.find(ingang => {
      let matches = true;
      if (ingang.richting) {
        matches = matches && stoel.richting == ingang.richting;
      }
      if (ingang.vanRij) {
        matches = matches && stoel.rij > ingang.vanRij;
      }
      if (ingang.totRij) {
        matches = matches && stoel.rij < ingang.totRij;
      }
      if (ingang.vanKolom) {
        matches = matches && stoel.kolom > ingang.vanKolom;
      }
      if (ingang.totKolom) {
        matches = matches && stoel.kolom < ingang.totKolom;
      }
      return matches;
    });
    return ingang ? ingang.naam : 'onbekend';
  }

  private static volgendeZondag(): Date {
    const date = new Date();
    const daysUntilNextSunday = 7 - date.getDay();
    date.setDate(date.getDate() + daysUntilNextSunday);
    return date;
  }

  private static isoDatum(date: Date): string {
    const datum = date.toISOString();
    return datum.substring(0, datum.indexOf('T'));
  }

  private static laatsteUitnodiging(deelnemer: Deelnemer): Date {
    return deelnemer.uitnodigingen.map(value => new Date(value.datum))
      .reduce((previousValue, currentValue) => previousValue > currentValue ? previousValue : currentValue, new Date(0));
  }
}
