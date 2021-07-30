// 官方demo
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import ruler from 'url:./ruler.cur'
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import {Draw, Modify} from 'ol/interaction';
import {LineString, Point} from 'ol/geom';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {getArea, getLength} from 'ol/sphere';

const typeSelect = document.getElementById('type');
const showSegments = document.getElementById('segments');
const clearPrevious = document.getElementById('clear');
import { throttle } from 'lodash';

const style = new Style({
  zIndex: 100,
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(0, 0, 0, 0.5)',
    lineDash: [10, 10],
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.2)',
    }),
  }),
});

const labelStyle = new Style({
  text: new Text({
    font: '24px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 25, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [3, 3, 3, 3],
    textBaseline: 'bottom',
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
  }),
});

const tipStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 0.7)',
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
  text: new Text({
    text: 'Drag to modify',
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.7)',
    }),
    padding: [2, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(55, 255, 255, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
    padding: [2, 2, 2, 2],
    textBaseline: 'bottom',
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({
      color: 'rgba(0, 0, 0, 0.4)',
    }),
  }),
});

const segmentStyles = [segmentStyle];

const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
};

const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' km\xB2';
  } else {
    output = Math.round(area * 100) / 100 + ' m\xB2';
  }
  return output;
};

const raster = new TileLayer({
  source: new OSM(),
});

const source = new VectorSource();

const modify = new Modify({source: source, style: modifyStyle});

let tipPoint;

// overlay
// const selectOverlay

function styleFunction(feature, segments, drawType, tip,) {

  const styles = [style];
  const geometry = feature.getGeometry();
  const type = geometry.getType();
  let point, label, line;
  if (!drawType || drawType === type) {
    if (type === 'Polygon') {
      point = geometry.getInteriorPoint();
      label = formatArea(geometry);
      line = new LineString(geometry.getCoordinates()[0]);
    } else if (type === 'LineString') {
      point = new Point(geometry.getLastCoordinate());
      label = formatLength(geometry);
      line = geometry;
    }
  }
  if (segments && line) {
    let count = 0;
    line.forEachSegment(function (a, b) {
      const segment = new LineString([a, b]);
      const label = formatLength(segment);
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone());
      }
      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);
      styles.push(segmentStyles[count]);
      count++;
    });
  }
  if (label) {
    labelStyle.setGeometry(point);
    labelStyle.getText().setText(label);
    styles.push(labelStyle);
  }
  if (
    tip &&
    type === 'Point' &&
    !modify.getOverlay().getSource().getFeatures().length
  ) {
    tipPoint = geometry;
    tipStyle.getText().setText(tip);
    styles.push(tipStyle);
  }

  return styles;
}

const vector = new VectorLayer({
  source: source,
  style: function (feature) {
    return styleFunction(feature, showSegments.checked);
  },
});

const map = new Map({
  layers: [ raster,vector ],// 顺序会涉及图层顺序
  target: 'map',
  view: new View({
    center: [12564838.63, 2698440.04],
    zoom: 15,
  }),
});



map.addInteraction(modify);

let draw; // global so we can remove it later

function addInteraction() {
  const drawType = typeSelect.value;
  const activeTip =
    'Click to continue drawing the ' +
    (drawType === 'Polygon' ? 'polygon' : 'line');
  const idleTip = 'Click to start measuring';
  let tip = idleTip;
  draw = new Draw({
    source: source,
    type: drawType,
    style: function (feature) {
      return styleFunction(feature, showSegments.checked, drawType, tip);
    },
  });
  draw.on('drawstart', function () {
    if (clearPrevious.checked) {
      source.clear();
    }
    modify.setActive(false);
    tip = activeTip;
  });
  draw.on('change', function () {
    console.log('draw change');
  })
  draw.on('drawend', function () {
    modifyStyle.setGeometry(tipPoint);
    modify.setActive(true);
    map.once('pointermove', function () {
      modifyStyle.setGeometry();
    });
    tip = idleTip;
  });
  modify.setActive(true);
  map.addInteraction(draw);

  map.on('pointermove', function (ev) {
    let pixel = ev.pixel
    let feature = map.forEachFeatureAtPixel(pixel, function (feature) {
      return feature
    })
    let f1 = map.getFeaturesAtPixel(pixel)
    if (feature) {
      // console.log(f1);
      // console.log(feature == f1[0],feature,f1[0]);
      // let geometry = feature.getGeometry()
      // console.log(typeof geometry)
      // if (geometry instanceof LineString) {
      //   console.log('lineString')
      // } else if (geometry instanceof Point) {
      //   console.log('point')
      // }
      // console.log('geometry', geometry)
      // console.log('style', feature.getStyle())
      // console.log(geometry.getProperties())
    } else {
      // console.log('no feature')
    }
  })
}

typeSelect.onchange = function () {
  map.removeInteraction(draw);
  addInteraction();
};

addInteraction();

showSegments.onchange = function () {
  vector.changed();
  draw.getOverlay().changed();
};

// 绘制时鼠标移出地图,移动方向向量=鼠标坐标点 - 地图中心点
let moveThrottle = throttle((e)=>{
  console.log('%c 🥨 moveThrottle: ', 'font-size:20px;background-color: #FCA650;color:#fff;');
    let leavePixel = map.getEventPixel(e),
        leaveCoord = map.getCoordinateFromPixel(leavePixel)
  
    let centerCoord =  map.getView().getCenter();
  
    //坐标项链
    let v = [leaveCoord[0]-centerCoord[0],leaveCoord[1]-centerCoord[1]],
        unitV = [v[0]/10,v[1]/10]
    let nCroodLng = centerCoord[0] + unitV[0],
        nCroodLat = centerCoord[1] + unitV[1]

    // 地图未发生变化
    // 中心点无变化
    map.getView().animate({
      center:  [nCroodLng,nCroodLat],// map.getCoordinateFromPixel([newx, newy]),//平移后的像素坐标转投影坐标
      duration: 100,
      zoom: map.getView().getZoom()//定义比例尺
    });

    // 点更新位置
    // console.log(draw);
},100,{
  leading: false
})
let timer 
function mouseLeaveCb(e) {
    // map.getView().setCenter([12664838.63, 2698440.04])  

  function step () {
    moveThrottle(e)
    timer = window.requestAnimationFrame(step);
  }
  timer = window.requestAnimationFrame(step);
}
function mouseEnterCb(e) {
  if(timer) {
    cancelAnimationFrame(timer)
    timer = null
  }
}
let viewPort = map.getViewport()
viewPort.addEventListener('mouseleave',mouseLeaveCb)
viewPort.addEventListener('mouseenter',mouseEnterCb)

// 鼠标尺图
viewPort.onmousemove = function() {
  this.style.cursor = `url(${ruler}),auto`
}
class MeasureItem {
  uid
}
console.log(map.getViewport());


