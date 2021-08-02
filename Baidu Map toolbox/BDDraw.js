import { throttle } from 'lodash'
import GeometryType from 'ol/geom/geometrytype'
import { Draw, Modify } from 'ol/interaction'
import {LineString, Point} from 'ol/geom';
import {getArea, getLength} from 'ol/sphere';
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
// 仿web百度地图交互 拓展class
function styleFunction({feature, segments, drawType, tip,tag,ins}={}) {
  // console.log('BDDtag',tag);
  // console.log('BDDtag',tag,ins,segments);
  let {segmentStyles,segmentDrawingLines} = ins
  const styles = [];
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
        segmentDrawingLines.push(segmentDrawingLineStyle.clone());
      }
      if(ins.outsideViewportDrawing) {
        if(count == line.flatCoordinates.length/2 - 2) {

          // 绘制最后一条边 颜色改变(百度交互,隐藏)
          // segmentDrawingLines.push(new Style({
          //   stroke: new Stroke({
          //     color: 'rgba(0, 0, 0, 0)',
          //     lineDash: [10, 10],
          //     width: 2,
          //   })
          // }));
          segmentDrawingLines[count].setStroke(new Stroke({
            color: 'rgba(0, 0, 0, 0)',
            lineDash: [10, 10],
            width: 2,
          }))
        } else {
          // 其他边,重新设为默认值
          segmentDrawingLines[count].setStroke(lineStroke)
        }
      } else {
        segmentDrawingLines[count].setStroke(lineStroke)
      }

      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);

      segmentDrawingLines[count].setGeometry(segment)
      styles.push(segmentDrawingLines[count]); // 线段
      styles.push(segmentStyles[count]);       // 线段文本

      count++;
    });
    // console.log(segmentDrawingLines);
  }
  if (label) {
    labelStyle.setGeometry(point);
    labelStyle.getText().setText(label);
    styles.push(labelStyle);
  }
  // if (
  //   tip &&
  //   type === 'Point' &&
  //   !modify.getOverlay().getSource().getFeatures().length
  // ) {
  //   tipPoint = geometry;
  //   tipStyle.getText().setText(tip);
  //   styles.push(tipStyle);
  // }
  return styles;
}

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
const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(0, 0, 0, 0.7)',
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
const labelStyle = new Style({
  text: new Text({
    font: '14px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
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
const segmentStyle = new Style({
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1)',
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
const lineStroke = new Stroke({
  color: 'rgba(0, 255, 255, 0.5)',
  lineDash: [10, 10],
  width: 2,
})
const segmentDrawingLineStyle = new Style({
  zIndex: 100,
  stroke: lineStroke
});
class BDDraw extends Draw {
  /**
   * 绘图时是否移除地图
   */
  outsideViewportDrawing = false
  segmentStyles = [segmentStyle]
  segmentDrawingLines = [segmentDrawingLineStyle]

  mapLayer_ = null
  segments_ = true
  modify = null
  constructor(options) {
    let isSegmentShow = options.segments_ == void 0 || options.segments_
    if(!options.souce) {
      options.source = new VectorSource();
    }
    if(!options.style) {
      options.style = function (feature) { 
        return styleFunction({feature, segments: isSegmentShow,tag: 'drawStyleFunction',ins});
      }
    }
    super(options)
    let ins = this
    this.segments_ = isSegmentShow
    if(!options.mapLayer) {
      this.mapLayer_ = new VectorLayer({
        source: this.source_,
        style: function (feature) {
          return styleFunction({feature, segments: isSegmentShow,tag: 'layerStyleFunction',ins});
        },
        ...options.mapLayerOpts
      });
    } else {
      this.mapLayer_ = options.mapLayer
    }
    this.modify = new Modify({source: this.source_, style: modifyStyle});
  }

  // overwrite
  // map removeInteraction 会set Null
  // 经实践,removeInteraction已解除draw.on事件,无需在考虑事件解绑问题
  setMap(map) {
    if(map) {
      // 事件
      let viewPort = map.getViewport()
      let ins = this
      let mouseLeaveExtend = mouseLeaveCb.bind(null,ins),
          mouseEnterExtend = mouseEnterCb.bind(null,ins)
      this.on('drawstart',function() {
        viewPort.addEventListener('mouseleave',mouseLeaveExtend)
        viewPort.addEventListener('mouseenter',mouseEnterExtend)
      })
  
      this.on('drawend', function() {
        viewPort.removeEventListener('mouseleave',mouseLeaveExtend)
        viewPort.removeEventListener('mouseenter',mouseEnterExtend)
      })
      
      // 地图添加 图层
      map.addLayer(this.mapLayer_)
      map.addInteraction(this.modify)
      // map.
    }
    super.setMap(map);
  }
}
const outsideMoveDuration = 100 // 鼠标在地图外 使地图移动的动画过渡时间
let moveThrottle = throttle((e,ins)=>{
    const map = ins.getMap()
    let leavePixel = map.getEventPixel(e),
        leaveCoord = map.getCoordinateFromPixel(leavePixel)
  
    let centerCoord =  map.getView().getCenter();
  
    //坐标项链
    let v = [leaveCoord[0]-centerCoord[0],leaveCoord[1]-centerCoord[1]],
        unitV = [v[0]/10,v[1]/10]
    let nCroodLng = centerCoord[0] + unitV[0],
        nCroodLat = centerCoord[1] + unitV[1]

    // 地图移动过渡
    map.getView().animate({
      center:  [nCroodLng,nCroodLat],
      duration: outsideMoveDuration,
    });

    // 绘制中隐藏绘制线
    // 点更新位置

},outsideMoveDuration,{
  leading: false
})
function mouseLeaveCb(ins,e) {
  ins.outsideViewportDrawing = true
  // ins.changed() // 不一定执行
  ins.getOverlay().changed() // 一定执行
  
  function step () {
    moveThrottle(e,ins)
    timer = window.requestAnimationFrame(step);
  }
  timer = window.requestAnimationFrame(step);
}
function mouseEnterCb(ins) {
  ins.outsideViewportDrawing = false

  if(timer) {
    cancelAnimationFrame(timer)
    timer = null
  }
}

export default BDDraw 