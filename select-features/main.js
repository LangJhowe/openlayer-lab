// https://codesandbox.io/api/v1/sandboxes/define
import 'ol/ol.css';
import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import Select from 'ol/interaction/Select';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {altKeyOnly, click, pointerMove} from 'ol/events/condition';

const raster = new TileLayer({
  source: new OSM(),
});
const vector = new VectorLayer({
  source: new VectorSource({
    format: (e)=>{
      console.log(e);
    },
    // url: 'data/geojson/countries.geojson',
    url: 'https://openlayers.org/en/latest/examples/data/geojson/countries.geojson',
    format: new GeoJSON(),
  }),
});

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 2,
  }),
});

let select = null; // ref to currently selected interaction

// select interaction working on "singleclick"
const selectSingleClick = new Select();

// select interaction working on "click"
const selectClick = new Select({
  condition: click,
});

// select interaction working on "pointermove"
const selectPointerMove = new Select({
  condition: pointerMove,
});

const selectAltClick = new Select({
  condition: function (mapBrowserEvent) {
    return click(mapBrowserEvent) && altKeyOnly(mapBrowserEvent);
  },
});

const selectElement = document.getElementById('type');

const changeInteraction = function () {
  if (select !== null) {
    map.removeInteraction(select);
  }
  const value = selectElement.value;
  if (value == 'singleclick') {
    select = selectSingleClick;
  } else if (value == 'click') {
    select = selectClick;
  } else if (value == 'pointermove') {
    select = selectPointerMove;
  } else if (value == 'altclick') {
    select = selectAltClick;
  } else {
    select = null;
  }
  if (select !== null) {
    map.addInteraction(select);
    select.on('select', function (e) {
      document.getElementById('status').innerHTML =
        '&nbsp;' +
        e.target.getFeatures().getLength() +
        ' selected features (last operation selected ' +
        e.selected.length +
        ' and deselected ' +
        e.deselected.length +
        ' features)';
    });
  }
};

/**
 * onchange callback on the select element.
 */
selectElement.onchange = changeInteraction;
changeInteraction();
