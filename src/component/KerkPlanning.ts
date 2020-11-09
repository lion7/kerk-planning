import {css, html, LitElement, property, PropertyValues} from 'lit-element';
import {Beschikbaarheid, Deelnemer, Gebouw, Genodigde, Opgave, Planning, Stoel, Tijdstippen} from "../common/Model";
import '@webcomponents/webcomponentsjs/webcomponents-loader';
import '@material/mwc-icon';
import '@material/mwc-button';
import '@material/mwc-fab';
import '@material/mwc-list';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-select';
import '@material/mwc-top-app-bar-fixed';
import '@vaadin/vaadin-date-picker';
import '@vaadin/vaadin-time-picker';
import {bepaalIngang, isDST, isHorizontaal, isoDatum, isOnbeschikbaar, isoTijd, laatsteUitnodiging, toCssRotation, volgendeZondag} from "../common/Util";

export class KerkPlanning extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    mwc-button {
      --mdc-theme-primary: #018786;
      --mdc-theme-on-primary: white;
      margin: 0 10px;
    }

    #view {
      display: grid;
      grid-template-columns: auto min-content;
      gap: 10px;
      padding: 10px;
    }

    #controls {
      display: grid;
      grid-auto-flow: column;
      gap: 10px;
      padding: 10px;
      text-align: center;
    }

    #deelnemers {
      height: 80vh;
      overflow: auto;
    }

    #deelnemers ul {
      margin: 0.25rem 0;
      padding: 0 1rem;
    }

    #gebouw {
      height: min-content;
      width: min-content;
      background-color: #836B32;
    }

    .inverted {
      background-color: gray;
      color: white;
    }

    .deelnemer {
      cursor: move;
    }

    .stoel {
      height: 100%;
      width: 100%;
    }

    .loading {
      background: rgba(0,0,0,.5);
      width: 100%;
      height: 100%;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 999;
    }
  `;

  @property({type: []}) diensten: string[] = [];
  @property({type: []}) deelnemers: Deelnemer[] = [];
  @property({type: []}) gebouwen: Gebouw[] = [];
  @property({type: Function}) ophalen: (datum: string, dienst: string, handler: (planning: Planning | undefined) => void) => void = (datum, dienst, handler) => {
    console.log(`Ophalen van ${datum} ${dienst}`);
    setTimeout(() => handler(undefined), 1000);
  };
  @property({type: Function}) opslaan: (planning: Planning, handler: () => void) => void = (planning, handler) => {
    console.log(planning);
    setTimeout(() => handler(), 1000);
  };
  @property({type: Function}) uitnodigen: (planning: Planning, handler: (aantalGenodigden: number) => void) => void = (planning, handler) => {
    console.log(planning);
    setTimeout(() => handler(this.genodigden.length), 1000);
  };

  @property({type: Boolean}) private loading = false;
  @property({type: String}) private datum = volgendeZondag();
  @property({type: String}) private dienst: string | undefined = undefined;
  @property({type: []}) private genodigden: Genodigde[] = [];

  get gebouw(): Gebouw | undefined {
    const dienst = this.dienst?.toLowerCase();
    if (dienst) {
      return this.gebouwen.find(gebouw => {
        const gebouwNaam = gebouw.naam.includes('(') ? gebouw.naam.substring(0, gebouw.naam.indexOf('(')).trim() : gebouw.naam;
        return dienst.includes(gebouwNaam.toLowerCase());
      });
    }
    return undefined;
  }

  render() {
    return html`
      <mwc-top-app-bar-fixed>
        <!--<div slot="title">KerkPlanning</div>-->
        <mwc-button raised label="Planning exporteren" icon="archive" slot="actionItems" @click="${this._downloadPlanning}"></mwc-button>
        <mwc-button raised label="Lijst downloaden" icon="list" slot="actionItems" @click="${this._downloadLijst}"></mwc-button>
        <mwc-button raised label="Planning opslaan" icon="save_alt" slot="actionItems" @click="${this._opslaanPlanning}"></mwc-button>
        <mwc-button raised label="Reset planning" icon="restore" slot="actionItems" @click="${this._resetPlanning}"></mwc-button>
        <mwc-fab extended label="Uitnodigingen versturen" icon="send" slot="actionItems" @click="${this._verstuurUitnodigingen}"></mwc-fab>
        <div>
          <div id="view">
            <mwc-select label="Dienst" slot="actionItems" value="${this.dienst}" @selected="${this._selecteerDienst}">
              ${this.diensten.map(((value) => html`<mwc-list-item value="${value}">${value}</mwc-list-item>`))}
            </mwc-select>
            <div id="controls">
              <vaadin-date-picker value="${isoDatum(this.datum)}" @value-changed="${this._selecteerDatum}"></vaadin-date-picker>
              <vaadin-time-picker value="${isoTijd(this.datum)}" step="1800" min="08:00" @value-changed="${this._selecteerTijd}"></vaadin-time-picker>
            </div>
            ${this.renderDeelnemers()}
            ${this.renderGebouw()}
          </div> <!-- #planning -->
          <div class="${this.loading ? 'loading' : ''}"></div>
        </div> <!-- #top-app-bar-content -->
      </mwc-top-app-bar-fixed>
    `;
  }

  renderDeelnemers() {
    return html`
      <mwc-list id="deelnemers"
                ondragenter="return false"
                ondragover="return false"
                @drop="${this._reset}">
          ${this.deelnemers
      .sort((a, b) => laatsteUitnodiging(a).getTime() - laatsteUitnodiging(b).getTime())
      .map(deelnemer => {
        return {deelnemer: deelnemer, opgave: this.findOpgave(deelnemer)};
      })
      .filter(value => !!value.opgave)
      .map(value => {
        const deelnemer = value.deelnemer;
        const opgave = value.opgave;
        const aantal = opgave ? opgave.aantal : '?';
        const uitnodigingen = deelnemer.uitnodigingen.map(value => html`<li>${new Date(value.datum).toLocaleString('nl', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        })} - ${value.dienst} - ${value.status}</li>`);

        let styling = '';
        if (this.isGenodigde(deelnemer)) {
          const status = deelnemer.uitnodigingen?.find(value => value.datum == this.datum.toISOString() && value.dienst == this.dienst)?.status;
          if (status === 'YES') {
            styling = 'background-color: red';
          } else if (status === 'NO') {
            styling = 'background-color: yellow';
          } else {
            styling = 'background-color: orange';
          }
        }
        return html`<mwc-list-item twoline hasMeta graphic="avatar"
                             data-deelnemer-email="${deelnemer.email}"
                             style="height: min-content; ${styling}"
                             draggable="true"
                             @dragstart="${this._drag})">
              <span>${deelnemer.naam}</span>
              <span slot="secondary">${deelnemer.adres}, ${deelnemer.postcode} ${deelnemer.woonplaats}</span>
              <span slot="secondary"><ul>${uitnodigingen}</ul></span>
              <mwc-icon slot="meta">filter_${aantal}</mwc-icon>
              <mwc-icon slot="graphic" class="inverted">${aantal > 1 ? 'people' : 'person'}</mwc-icon>
            </mwc-list-item>`;
      })}
      </mwc-list>
    `;
  }

  renderGebouw() {
    const gebouw = this.gebouw
    if (!gebouw) {
      console.log("Gebouw niet gevonden!");
      return;
    }

    const aantalStoelen = gebouw.stoelen.length;
    const aantalStoelenIngepland = this.genodigden.map(value => value.stoelen.length).reduce((previousValue, currentValue) => previousValue + currentValue, 0);
    const beschikbareStoelen = gebouw.stoelen.filter(stoel => this.isBeschikbaar(gebouw, stoel));
    const aantalStoelenBeschikbaar = beschikbareStoelen.length;

    const rijen = [...gebouw.stoelen.map(value => value.rij), ...gebouw.props.map(value => value.rij)]
      .reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
    const kolommen = [...gebouw.stoelen.map(value => value.kolom), ...gebouw.props.map(value => value.kolom)]
      .reduce((previousValue, currentValue) => previousValue < currentValue ? currentValue : previousValue, 0);
    const cellSize = css`min(80vh / ${rijen}, (100vw - 570px) / ${kolommen})`;

    return html`
      <div>
        <div id="gebouw" style="display: grid; grid-template-rows: repeat(${rijen}, ${cellSize}); grid-template-columns: repeat(${kolommen}, ${cellSize});">

        ${gebouw.props.map(prop => html`<div style="grid-row: ${prop.rij}; grid-column: ${prop.kolom}; background-color: ${prop.kleur}"></div>`)}

          ${gebouw.stoelen.map((stoel, index) => {
      const genodigde = this.findGenodigde(stoel);
      const rotation = toCssRotation(stoel.richting);
      let styling = '';
      let beschikbaar = false;
      let title = 'Leeg';
      if (genodigde) {
        title = genodigde.naam;
        const status = this.findDeelnemer(genodigde.email)?.uitnodigingen?.find(value => value.datum == this.datum.toISOString() && value.dienst == this.dienst)?.status;
        if (status === 'YES') {
          styling = 'background-color: red';
        } else if (status === 'NO') {
          styling = 'background-color: yellow';
        } else {
          styling = 'background-color: orange';
        }
      } else if (stoel.beschikbaarheid == Beschikbaarheid.Gereserveerd) {
        styling = 'background-color: cyan';
        title = 'Gereserveerd';
      } else if (beschikbareStoelen.includes(stoel)) {
        styling = 'background-color: green';
        title = 'Beschikbaar';
        beschikbaar = true;
      }
      return html`<img src="https://upload.wikimedia.org/wikipedia/commons/3/36/Font_Awesome_5_solid_chair.svg"
                   class="stoel"
                   draggable="${!!genodigde}"
                   data-stoel-index="${index}"
                   data-deelnemer-email="${genodigde ? genodigde.email : ''}"
                   title="${title}"
                   style="grid-row: ${stoel.rij}; grid-column: ${stoel.kolom}; transform: rotate(${rotation}); ${styling}"
                   ondragenter="return ${!beschikbaar}"
                   ondragover="return ${!beschikbaar}"
                   @dragstart="${this._drag}"
                   @drop="${this._drop}" />`;
    })}
        </div>
        <div id="controls">
          <div>Aantal plekken:<br/>${aantalStoelen}</div>
          <div>Plekken beschikbaar:<br/>${aantalStoelenBeschikbaar}</div>
          <div>Plekken ingepland:<br/>${aantalStoelenIngepland}</div>
        </div>
      </div>
      `;
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties)

    if (changedProperties.has('deelnemers') && this.diensten.length == 0) {
      const diensten: string[] = [];
      this.deelnemers.forEach(deelnemer => deelnemer.opgaven.forEach(opgave => {
        if (!diensten.includes(opgave.dienst)) diensten.push(opgave.dienst);
      }))
      this.diensten = diensten;
    }

    if (changedProperties.has('dienst')) {
      const startTijd = this.bepaalStarttijd();
      this.datum.setTime(startTijd.getTime()); // set time directly so it won't trigger an update loop
    }

    if (changedProperties.has('datum') || changedProperties.has('dienst')) {
      const dienst = this.dienst;
      if (!this.loading && dienst) {
        this._setLoading(true);
        this.ophalen(isoDatum(this.datum), dienst, planning => {
          this._setLoading(false);
          this.genodigden = planning ? planning.genodigden : [];
          console.log(`Planning opgehaald met ${this.genodigden.length} genodigden`);
        });
      }
    }
  }

  _drag(event: DragEvent) {
    const el = event.target as Element;
    if (!el || !el.getAttribute) {
      return;
    }
    const deelnemerEmail = el.getAttribute("data-deelnemer-email");
    if (!deelnemerEmail) {
      console.log("Deelnemer email niet gevonden!");
      return;
    }

    const icon = el.getElementsByTagName('mwc-icon')?.item(0);
    if (icon) {
      event.dataTransfer?.setDragImage(icon, 0, 0);
    }
    event.dataTransfer?.setData('text/plain', deelnemerEmail);
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

    const deelnemerEmail = event.dataTransfer?.getData('text/plain');
    if (!deelnemerEmail) {
      console.log("Deelnemer email niet gevonden!");
      return;
    }

    const gebouw = this.gebouw
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

    const deelnemer = this.findDeelnemer(deelnemerEmail);
    if (!deelnemer) {
      console.log("Deelnemer niet gevonden!");
      return;
    }

    const opgave = this.findOpgave(deelnemer);
    if (!opgave) {
      console.log("Opgave niet gevonden!");
      return;
    }

    const aantalStoelenNodig = opgave.aantal;
    const vanRij = stoel.rij;
    const totRij = isHorizontaal(stoel.richting) ? vanRij + 1 : vanRij + aantalStoelenNodig;
    const vanKolom = stoel.kolom;
    const totKolom = isHorizontaal(stoel.richting) ? vanKolom + aantalStoelenNodig : vanKolom + 1;
    console.log(`Proberen om ${deelnemer.naam} in te delen op ${aantalStoelenNodig} stoelen van rij ${vanRij}-${totRij} en van kolom ${vanKolom}-${totKolom}`);
    const gevondenStoelen = gebouw.stoelen.filter(stoel => stoel.rij >= vanRij && stoel.rij < totRij && stoel.kolom >= vanKolom && stoel.kolom < totKolom);
    console.log(`${gevondenStoelen.length} stoelen gevonden voor ${deelnemer.naam}`);
    if (gevondenStoelen.length == aantalStoelenNodig) {
      const genodigde: Genodigde = {
        naam: deelnemer.naam,
        aantal: aantalStoelenNodig,
        email: deelnemer.email,
        ingang: bepaalIngang(gebouw, gevondenStoelen[0]),
        stoelen: gevondenStoelen
      };
      this.genodigden = [...this.genodigden.filter(value => value.email != deelnemerEmail), genodigde];
    }
  }

  _planning(): Planning {
    const dienst = this.dienst;
    return {
      tijdstippen: this.bepaalTijdstippen(),
      dienst: dienst ? dienst : '',
      genodigden: this.genodigden
    };
  }

  _reset(event: DragEvent) {
    const deelnemerEmail = event.dataTransfer?.getData('text/plain');
    if (!deelnemerEmail) {
      console.log("Deelnemer email niet gevonden!");
      return;
    }

    this.genodigden = this.genodigden.filter(value => value.email != deelnemerEmail);
  }

  _resetPlanning(event: Event) {
    event.preventDefault();
    this.genodigden = [];
  }

  _downloadPlanning(event: Event) {
    event.preventDefault();
    const planning = this._planning();
    const link = document.createElement("a");
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURI(JSON.stringify(planning)));
    link.setAttribute('download', `planning ${isoDatum(this.datum)} ${this.dienst}.json`);
    link.click(); // This will download the JSON file
  }

  _downloadLijst(event: Event) {
    event.preventDefault();
    const rows = this.genodigden.sort((a, b) => a.ingang.localeCompare(b.ingang))
      .map(value => [value.ingang, value.naam, value.aantal, value.email]);
    const csvContent = "gebouw;ingang;naam;aantal personen;email\n" + rows.map(e => e.join(";")).join("\n");
    const link = document.createElement("a");
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURI(csvContent));
    link.setAttribute('download', `genodigden ${isoDatum(this.datum)} ${this.dienst}.csv`);
    link.click(); // This will download the CSV file
  }

  _opslaanPlanning(event: Event) {
    event.preventDefault();
    const planning = this._planning();
    this._setLoading(true);
    this.opslaan(planning, () => this._setLoading(false));
  }

  _verstuurUitnodigingen(event: Event) {
    event.preventDefault();
    const planning = this._planning();
    this._setLoading(true);
    this.uitnodigen(planning, aantalGenodigden => {
      this._setLoading(false);
      alert(`Er zijn ${aantalGenodigden} uitnodigingen verstuurd!`);
    });
  }

  _selecteerDienst(event: Event) {
    const el = event.target as HTMLInputElement;
    console.log(el.value);
    this.dienst = el.value;
  }

  _selecteerDatum(event: CustomEvent) {
    const nieuweDatum = event.detail.value;
    const nieuweDatumTijd = new Date(this.datum);
    nieuweDatumTijd.setDate(new Date(nieuweDatum).getDate());
    if (this.datum.toISOString() !== nieuweDatumTijd.toISOString()) {
      this.datum = nieuweDatumTijd;
    }
  }

  _selecteerTijd(event: CustomEvent) {
    const nieuweTijd = event.detail.value as string;
    const nieuweDatumTijd = new Date(this.datum);
    const parts = nieuweTijd.split(':', 2).map(value => parseInt(value));
    nieuweDatumTijd.setHours(parts[0], parts[1], 0, 0);
    if (this.datum.toISOString() !== nieuweDatumTijd.toISOString()) {
      this.datum = nieuweDatumTijd;
    }
  }

  _setLoading(loading: boolean) {
    this.loading = loading;
  }

  private findDeelnemer(email: string): Deelnemer | undefined {
    return this.deelnemers.find(value => value.email == email);
  }

  private findGenodigde(stoel: Stoel): Genodigde | undefined {
    return this.genodigden.find(value => value.stoelen.some(s => s.rij == stoel.rij && s.kolom == stoel.kolom));
  }

  private findOpgave(deelnemer: Deelnemer): Opgave | undefined {
    return deelnemer.opgaven.find(value => value.aantal > 0 && value.dienst == this.dienst);
  }

  private isGenodigde(deelnemer: Deelnemer): boolean {
    return this.genodigden.some(value => value.email == deelnemer.email);
  }

  private isBeschikbaar(gebouw: Gebouw, stoel: Stoel): boolean {
    if (stoel.beschikbaarheid != Beschikbaarheid.Beschikbaar) {
      return false;
    }
    const gereserveerdeStoelen = gebouw.stoelen.filter(value => value.beschikbaarheid == Beschikbaarheid.Gereserveerd).map(value => [value]);
    if (gereserveerdeStoelen.some(stoelen => isOnbeschikbaar(stoel, stoelen))) {
      return false;
    }
    const ingeplandeStoelen = this.genodigden.map(value => value.stoelen);
    return !ingeplandeStoelen.some(stoelen => isOnbeschikbaar(stoel, stoelen));
  }

  private bepaalStarttijd(): Date {
    const dienst = this.dienst ? this.dienst.toLowerCase() : '';
    const datum = this.datum;
    const startTijd = new Date(datum);
    if (dienst.includes("ochtend")) {
      startTijd.setHours(9, 30, 0, 0);
    } else if ((dienst.includes("middag") && !dienst.includes("avond")) || (dienst.includes("middag") && dienst.includes("avond") && !isDST(datum))) {
      startTijd.setHours(15, 30, 0, 0);
    } else if ((!dienst.includes("middag") && dienst.includes("avond")) || (dienst.includes("middag") && dienst.includes("avond") && isDST(datum))) {
      startTijd.setHours(19, 0, 0, 0);
    }
    return startTijd;
  }

  private bepaalTijdstippen(): Tijdstippen {
    const datum = this.datum;
    const startTijd = new Date(datum);
    const openingsTijd = new Date(datum);
    const eindTijd = new Date(datum);
    openingsTijd.setTime(startTijd.getTime() - 20 * 60 * 1000);
    eindTijd.setTime(startTijd.getTime() + 90 * 60 * 1000);
    return {
      openingsTijd: openingsTijd.toISOString(),
      startTijd: startTijd.toISOString(),
      eindTijd: eindTijd.toISOString()
    }
  }
}
