import { map, throttle } from 'lodash'
import GeometryType from 'ol/geom/geometrytype'
import { Draw, Modify, Select } from 'ol/interaction'
import {LineString, Point, Polygon} from 'ol/geom';
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
import { MeasureLine, MeasurePolygon } from './MeasureShape'
import EventType from 'ol/src/events/EventType'

// 仿web百度地图交互 拓展class
function styleFunction({feature, segments, drawType, tip,tag,ins}={}) {
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
        // if(count == line.flatCoordinates.length/2 - 2) {
        //   // 绘制最后一条边 颜色改变(百度交互,隐藏)
        //   segmentDrawingLines[count].setStroke(new Stroke({
        //     color: 'rgba(0, 0, 0, 0)',
        //     lineDash: [10, 10],
        //     width: 2,
        //   }))

        //   segmentStyles[count].setText(new Text({
        //     font: '12px Calibri,sans-serif',
        //     fill: new Fill({
        //       color: 'rgba(255, 255, 255, 0)',
        //     }),
        //     backgroundFill: new Fill({
        //       color: 'rgba(0, 0, 0, 0)',
        //     }),
        //     padding: [2, 2, 2, 2],
        //     textBaseline: 'bottom',
        //     offsetY: -12,
        //   }))
        //   segmentStyles[count].setImage(new RegularShape({
        //     radius: 6,
        //     points: 3,
        //     angle: Math.PI,
        //     displacement: [0, 8],
        //     fill: new Fill({
        //       color: 'rgba(0, 0, 0, 0)',
        //     }),
        //   }))
        // } else {
        //   // 其他边,重新设为默认值
        //   segmentDrawingLines[count].setStroke(lineStroke)

        //   segmentStyles[count].setText(new Text({
        //     font: '12px Calibri,sans-serif',
        //     fill: new Fill({
        //       color: 'rgba(255, 255, 255, 1)',
        //     }),
        //     backgroundFill: new Fill({
        //       color: 'rgba(0, 0, 0, 0.4)',
        //     }),
        //     padding: [2, 2, 2, 2],
        //     textBaseline: 'bottom',
        //     offsetY: -12,
        //   }))
        //   segmentStyles[count].setImage(new RegularShape({
        //     radius: 6,
        //     points: 3,
        //     angle: Math.PI,
        //     displacement: [0, 8],
        //     fill: new Fill({
        //       color: 'rgba(0, 0, 0, 0.4)',
        //     }),
        //   }))
        // }

        // 最后一个边距隐藏

      } else {
        segmentDrawingLines[count].setStroke(lineStroke)

        // segmentStyles[count].setText(new Text({
        //   font: '12px Calibri,sans-serif',
        //   fill: new Fill({
        //     color: 'rgba(255, 255, 255, 1)',
        //   }),
        //   backgroundFill: new Fill({
        //     color: 'rgba(0, 0, 255, 0.4)',
        //   }),
        //   padding: [2, 2, 2, 2],
        //   textBaseline: 'bottom',
        //   offsetY: -12,
        // }))
        // segmentStyles[count].setImage(new RegularShape({
        //   radius: 6,
        //   points: 3,
        //   angle: Math.PI,
        //   displacement: [0, 8],
        //   fill: new Fill({
        //     color: 'rgba(0, 0, 0, 0.4)',
        //   }),
        // }))
      }

      const segmentPoint = new Point(segment.getCoordinateAt(0.5));
      segmentStyles[count].setGeometry(segmentPoint);
      segmentStyles[count].getText().setText(label);

      segmentDrawingLines[count].setGeometry(segment)
      styles.push(segmentDrawingLines[count]); // 线段
      styles.push(segmentStyles[count]);       // 线段文本

      count++;
    });
  }
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
const modifyStyleText = (tips = '单击新增节点') => new Text({
    text: tips,
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(51, 51, 51, 1)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(255,255,255,1)',
    }),
    padding: [2, 2, 2, 2],
    textAlign: 'left',
    offsetX: 15,
  })
const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(255, 111, 0, 0.7)',
    }),
    fill: new Fill({
      color: 'rgba(255, 111, 0, 0.4)',
    }),
  }),
  text: modifyStyleText()
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
  zIndex: 100,
  text: new Text({
    font: '12px Calibri,sans-serif',
    fill: new Fill({
      color: 'rgba(51, 51, 51, 0.7)',
    }),
    backgroundFill: new Fill({
      color: 'rgba(255, 255, 255, 1.0)',
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
      color: 'rgba(255, 255, 255, 1.0)',
    }),
  }),
})
const lineStroke = new Stroke({
  color: 'rgba(255,111,0, .8)',
  width: 3,
})
const segmentDrawingLineStyle = new Style({
  zIndex: 100,
  stroke: lineStroke
});
// 公用
let modify = null
const source = new VectorSource();
let mapLayer = null
class BDDraw extends Draw {
  /**
   * 绘图时是否移除地图
   */
  drawing = false
  outsideViewportDrawing = false
  segmentStyles = [segmentStyle]
  segmentDrawingLines = [segmentDrawingLineStyle]

  mapLayer_ = null
  segments_ = true
  shapes = []
  timer = null
  map = null
  options = {}
  modify = null
  constructor(options) {
    let isSegmentShow = options.segments_ == void 0 || options.segments_
    options.source = source
    if(!options.style) {
      options.style = function (feature) { 
        return styleFunction({feature, segments: isSegmentShow,tag: 'drawStyleFunction',ins});
      }
    }
    super(options)
    let ins = this
    this.isSegmentShow = isSegmentShow
    this.segments_ = isSegmentShow
    this.options = options
    if(!modify) {
      modify = new BDModify({source: this.source_, style: modifyStyle});
      this.modify = modify
    }
    this.modify = modify
  }

  // overwrite
  // map removeInteraction 会set Null
  // 经实践,removeInteraction已解除draw.on事件,无需在考虑事件解绑问题
  setMap(map) {
    if(map) {
      this.map = map
      // 事件
      let viewPort = map.getViewport()
      let ins = this
      let mouseLeaveExtend = mouseLeaveCb.bind(null,ins),
          mouseEnterExtend = mouseEnterCb.bind(null,ins)
      this.on('drawstart',function(evt) {
        ins.drawing = true
        viewPort.addEventListener('mouseleave',mouseLeaveExtend)
        viewPort.addEventListener('mouseenter',mouseEnterExtend)

        if(ins.type_ === GeometryType.LINE_STRING) {
          ins.shapes.push(new MeasureLine({feature:evt.feature,draw: ins}))
        } else if(ins.type_ === GeometryType.POLYGON) {
          ins.shapes.push(new MeasurePolygon({feature:evt.feature,draw: ins}))
        }
      })
  
      this.on('drawend', function() {
        let shape = ins.shapes.slice(-1)[0]
        if(shape) {
          // 绘制完成添加绘图删除按键
          map.addOverlay(shape.delOverlay)
        }
        ins.drawing = false
        viewPort.removeEventListener('mouseleave',mouseLeaveExtend)
        viewPort.removeEventListener('mouseenter',mouseEnterExtend)
      })

      // 地图添加 图层
      if(!mapLayer) {
        mapLayer = new VectorLayer({
          source: this.source_,
          style: function (feature) {
            return styleFunction({feature, segments: ins.isSegmentShow,tag: 'layerStyleFunction',ins});
          },
          ...this.options.mapLayerOpts
        });
        this.mapLayer_ = mapLayer
        map.addLayer(this.mapLayer_)
      }
      map.addInteraction(modify)
      map.on('contextmenu',BDDraw.handleContextmenu)
    } else {
      map.un('contextmenu',BDDraw.handleContextmenu)
    }
    super.setMap(map);
  }

  // overwrite
  // event.type [pointdown,pointup,pointmove,click,dbclick]
  handleEvent(event) {
    if(event.type == EventType.CONTEXTMENU && this.drawing){
      console.log(event.type);
      console.log(event);
      // 右键修改为取消现在的点 并绘制完成
      event.preventDefault(); // 无效,还是会多一个点,需要removeLastPoint
      event.stopPropagation();// 无效,还是会多一个点,需要removeLastPoint
      this.cancelDrawing()

      return
    }
    super.handleEvent(event)
  }

  // 绘制时右键取消

  cancelDrawing() {
    let map = this.getMap()
    this.drawing = false
    if(this.type_ == GeometryType.LINE_STRING) {
      this.removeLastPoint()
      if(this.sketchCoords_.length == 2) {
        this.abortDrawing()
        let shape = this.shapes.pop()
        shape.nodes.forEach((n)=>{
          map.removeOverlay(n.overlay)
        })
        map.removeOverlay(shape.label)
        map.removeOverlay(shape.delOverlay)
      } else {
        this.finishDrawing()
      }
    } else if(this.type_ == GeometryType.POLYGON){
      this.removeLastPoint()
      if(this.sketchLineCoords_.length <= 3) {
        this.abortDrawing()
        let shape = this.shapes.pop()
        shape.nodes.forEach((n)=>{
          map.removeOverlay(n.overlay)
        })
        map.removeOverlay(shape.label)
        map.removeOverlay(shape.delOverlay)
      } else {
        this.finishDrawing()
      }
    }
  }

  removeShape(shape) {
    let index = this.shapes.findIndex(s=>s == shape)
    if(index > -1) {
      let map = this.map
      this.source_.removeFeature(shape.feature)
      
      shape.nodes.forEach(n=>{
        map.removeOverlay(n.overlay)
      })

      this.shapes.splice(index,1)
    }
  }
  setModifyActive(active) {
    if(this.modify) {
      this.modify.setActive(active)
    }
  }
  static handleContextmenu(e) {
    // console.log('handleContextmenu',e);
    // e.stopPropagation()
    // e.preventDefault()
  }
}
const outsideMoveDuration = 100 // 鼠标在地图外 使地图移动的动画过渡时间
let moveThrottle = throttle((e,ins)=>{
    const map = ins.map
    let leavePixel = map.getEventPixel(e),
        leaveCoord = map.getCoordinateFromPixel(leavePixel)
  
    let centerCoord =  map.getView().getCenter();
  
    //坐标项链
    let v = [leaveCoord[0]-centerCoord[0],leaveCoord[1]-centerCoord[1]],
        unitV = [v[0]/10,v[1]/10]
    let nCroodLng = centerCoord[0] + unitV[0],
        nCroodLat = centerCoord[1] + unitV[1]

    // 地图移动过渡
    // map.getView().animate({
    //   center:  [nCroodLng,nCroodLat],
    //   duration: outsideMoveDuration,
    // });

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
    ins.timer = window.requestAnimationFrame(step);
  }
  ins.timer = window.requestAnimationFrame(step);
}
function mouseEnterCb(ins) {
  ins.outsideViewportDrawing = false
  ins.getOverlay().changed() // 一定执行

  if(ins.timer) {
    cancelAnimationFrame(ins.timer)
    ins.timer = null
  }
}

// BDModify
class BDModify extends Modify {
  constructor(opts){
    super(opts)
  }
  handlePointerAtPixel_(pixel, map, opt_coordinate) {


    super.handlePointerAtPixel_(pixel, map, opt_coordinate)
    /**
     * 源码方法拓展
     */
    if(this.vertexFeature_) {
      let style = this.overlay_.getStyle()
      if(this.snappedToVertex_) {
        // 靠近节点 修改modify 提示
        style.setText(modifyStyleText('拖拽节点修改'))
      } else {
        // 复原 modify 提示
        style.setText(modifyStyleText('点击添加节点'))
      }
    }
  }
}
export default BDDraw 