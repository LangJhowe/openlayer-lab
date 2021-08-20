import 'ol/ol.css';
import './ol.scss'
import Map from 'ol/Map';
import View from 'ol/View';
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import Draw from './BDDraw'
import {LineString, Point} from 'ol/geom';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {getArea, getLength} from 'ol/sphere';
import ruler from 'url:./ruler.cur'

const typeSelect = document.getElementById('type');
const showSegments = document.getElementById('segments');
const clearPrevious = document.getElementById('clear');

const raster = new TileLayer({
  source: new OSM(),
});

const source = new VectorSource();


const map = new Map({
  layers: [raster],
  target: 'map',
  view: new View({
    center: [-11000000, 4600000],
    zoom: 15,
  }),
});


let draw; // global so we can remove it later

function addInteraction() {
  const drawType = typeSelect.value;
  draw = new Draw({
    type: drawType,
  });
  draw.on('drawstart', function () {
    if (clearPrevious.checked) {
      source.clear();
    }
  });
  draw.on('drawend', function () {

  });
  map.addInteraction(draw);
}

typeSelect.onchange = function (e) {
  if(mesauring) {
    map.removeInteraction(draw);
    addInteraction();
  } else {
    if(draw) {
      map.removeInteraction(draw);
      draw = void 0
    }
  }
};


showSegments.onchange = function () {
  draw.mapLayer_.changed();
  draw.getOverlay().changed();
};
const viewPort = map.getViewport()

// 开始绘制按钮
let measureStart = document.getElementById('measure-start-btn')
let mesauring = false
measureStart.addEventListener('click',()=>{
  // if(mesauring) {
  //   draw.finishDrawing()
  //   draw.setActive(false)
  //   viewPort.style.cursor = ``
  // } else {
  //   const drawType = typeSelect.value;
  //   viewPort.style.cursor = `url(${ruler}),auto` // 鼠标尺图
  //   if(draw){
  //     if(drawType === draw.type) {
  //       draw.setActive(true)
  //     } else {
  //       addInteraction()
  //     }
  //   } else {
  //       addInteraction()
  //   }
  // }
  if(mesauring) {
    draw.finishDrawing()
    map.removeInteraction(draw);
    viewPort.style.cursor = ``
  } else {
    viewPort.style.cursor = `url(${ruler}),auto` // 鼠标尺图
    addInteraction()
  }
  mesauring = !mesauring
  // draw.setModifyActive(mesauring)
  measureStart.innerHTML = mesauring ? '结束绘制':'开始绘制'
})