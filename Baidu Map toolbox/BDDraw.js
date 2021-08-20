import { throttle } from 'lodash'
import GeometryType from 'ol/geom/GeometryType'
import { Draw, Modify } from 'ol/interaction'
import { LineString, Point } from 'ol/geom'
import { getLength } from 'ol/sphere'
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { MeasureLine, MeasurePolygon } from './MeasureShape'
import EventType from 'ol/src/events/EventType'
GeometryType
// 仿web百度地图交互 拓展class
const lineCapStyle = new Style({
  zIndex: 100,
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({
      color: 'rgba(255, 111, 0, 1.0)',
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 255, 1.0)',
    }),
  }),
})
function styleFunction({ feature, segments, drawType, ins } = {}) {
  let { segmentStyles, segmentDrawingLines } = ins
  const styles = []
  const lineCapStyles = [lineCapStyle]
  const geometry = feature.getGeometry()
  const type = geometry.getType()
  let line
  if (!drawType || drawType === type) {
    if (type === 'Polygon') {
      line = new LineString(geometry.getCoordinates()[0])
    } else if (type === 'LineString') {
      line = geometry
    }
  }
  if (segments && line) {
    let count = 0
    line.forEachSegment(function (a, b) {
      const segment = new LineString([a, b])
      const label = formatLength(segment)
      if (segmentStyles.length - 1 < count) {
        segmentStyles.push(segmentStyle.clone())
        segmentDrawingLines.push(segmentDrawingLineStyle.clone())
      }
      if (lineCapStyles.length - 1 < count) {
        lineCapStyles.push(lineCapStyle.clone())
      }
      const lineCapPointStart = new Point(segment.getCoordinateAt(0)) // 线段起点
      lineCapPointStart.setProperties({
        name: 'Point',
      })
      lineCapStyles[count].setGeometry(lineCapPointStart)

      if (ins.outsideViewportDrawing) {
        if (count == line.flatCoordinates.length / 2 - 2) {
          // 绘制最后一条边 颜色改变(百度交互,隐藏)
          segmentDrawingLines[count].setStroke(
            new Stroke({
              color: 'rgba(0, 0, 0, 0)',
              lineDash: [10, 10],
              width: 2,
            })
          )
          segmentStyles[count].setText(
            new Text({
              font: '12px Calibri,sans-serif',
              fill: new Fill({
                color: 'rgba(255, 255, 255, 0)',
              }),
              backgroundFill: new Fill({
                color: 'rgba(0, 0, 0, 0)',
              }),
              padding: [2, 2, 2, 2],
              textBaseline: 'bottom',
              offsetY: -12,
            })
          )
          segmentStyles[count].setImage(
            new RegularShape({
              radius: 6,
              points: 3,
              angle: Math.PI,
              displacement: [0, 8],
              fill: new Fill({
                color: 'rgba(0, 0, 0, 0)',
              }),
            })
          )
        } else {
          // 其他边,重新设为默认值
          segmentDrawingLines[count].setStroke(lineStroke)
          segmentStyles[count].setText(
            new Text({
              font: '12px Calibri,sans-serif',
              fill: new Fill({
                color: 'rgba(51, 51, 51, 0.7)',
              }),
              backgroundFill: new Fill({
                color: 'rgba(255,255,255,1)',
              }),
              padding: [2, 2, 2, 2],
              textBaseline: 'bottom',
              offsetY: -12,
            })
          )
          segmentStyles[count].setImage(
            new RegularShape({
              radius: 6,
              points: 3,
              angle: Math.PI,
              displacement: [0, 8],
              fill: new Fill({
                color: 'rgba(255,255,255,1)',
              }),
            })
          )
        }
        // 最后一个边距隐藏
      } else {
        segmentDrawingLines[count].setStroke(lineStroke)

        segmentStyles[count].setText(
          new Text({
            font: '12px Calibri,sans-serif',
            fill: new Fill({
              color: 'rgba(51, 51, 51, 0.7)',
            }),
            backgroundFill: new Fill({
              color: 'rgba(255,255,255,1)',
            }),
            padding: [2, 2, 2, 2],
            textBaseline: 'bottom',
            offsetY: -12,
          })
        )
        segmentStyles[count].setImage(
          new RegularShape({
            radius: 6,
            points: 3,
            angle: Math.PI,
            displacement: [0, 8],
            fill: new Fill({
              color: 'rgba(255,255,255,1)',
            }),
          })
        )
      }

      const segmentPoint = new Point(segment.getCoordinateAt(0.5))
      segmentStyles[count].setGeometry(segmentPoint)
      segmentStyles[count].getText().setText(label)

      segmentDrawingLines[count].setGeometry(segment)
      styles.push(segmentDrawingLines[count]) // 线段
      styles.push(segmentStyles[count]) // 线段文本
      styles.push(lineCapStyles[count])
      count++
    })
    // 线段尾节点
    const lineEndLineCap = new Point(line.getLastCoordinate())
    lineCapStyles.push(lineCapStyle.clone())
    lineCapStyles[count].setGeometry(lineEndLineCap)
    styles.push(lineCapStyles[count])
  }
  return styles
}

const formatLength = function (line) {
  const length = getLength(line)
  let output
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km'
  } else {
    output = Math.round(length * 100) / 100 + ' m'
  }
  return output
}
const modifyStyleText = (tips = '单击新增节点') =>
  new Text({
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
  text: modifyStyleText(),
})
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
  stroke: lineStroke,
})
// 公用
let modify = null
const source = new VectorSource()
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
  drawingShape = null
  constructor(options) {
    let isSegmentShow = options.segments_ == void 0 || options.segments_
    options.source = source
    if (!options.style) {
      options.style = (feature) => {
        return styleFunction({ feature, segments: isSegmentShow, tag: 'drawStyleFunction', ins: this })
      }
    }
    super(options)
    this.isSegmentShow = isSegmentShow
    this.segments_ = isSegmentShow
    this.options = options
    if (!modify) {
      modify = new BDModify({ source: this.source_, style: modifyStyle })
      this.modify = modify
    }
    this.modify = modify
  }

  // overwrite
  // map removeInteraction 会set Null
  // 经实践,removeInteraction已解除draw.on事件,无需在考虑事件解绑问题
  setMap(map) {
    if (map) {
      this.map = map
      // 事件
      let viewPort = map.getViewport()
      viewPort.classList.add('ol-viewport--drawing')
      let mouseLeaveExtend = mouseLeaveCb.bind(null, this),
        mouseEnterExtend = mouseEnterCb.bind(null, this)
      this.on('drawstart', (evt) => {
        this.drawing = true
        viewPort.addEventListener('mouseleave', mouseLeaveExtend)
        viewPort.addEventListener('mouseenter', mouseEnterExtend)

        let shape
        if (this.type_ === GeometryType.LINE_STRING) {
          shape = new MeasureLine({ feature: evt.feature, draw: this })
        } else if (this.type_ === GeometryType.POLYGON) {
          shape = new MeasurePolygon({ feature: evt.feature, draw: this })
        }
        this.shapes.push(shape)
        this.drawingShape = shape
      })

      this.on('drawend', () => {
        if (this.drawingShape) {
          // 绘制完成添加绘图删除按键
          map.addOverlay(this.drawingShape.delOverlay)
        }
        this.drawingShape = null
        viewPort.classList.remove('ol-viewport--drawing')
        viewPort.removeEventListener('mouseleave', mouseLeaveExtend)
        viewPort.removeEventListener('mouseenter', mouseEnterExtend)
      })

      // 地图添加 图层
      if (!mapLayer) {
        mapLayer = new VectorLayer({
          zIndex: 100,
          source: this.source_,
          style: (feature) => {
            return styleFunction({ feature, segments: this.isSegmentShow, tag: 'layerStyleFunction', ins: this })
          },
          ...this.options.mapLayerOpts,
        })
        this.mapLayer_ = mapLayer
        map.addLayer(this.mapLayer_)
      }
      // 交互优化
      // 图形支持随时修改
      map.addInteraction(modify)
    }
    super.setMap(map)
  }

  // overwrite
  // event.type [pointerdown,pointerup,pointermove,click,dbclick]
  handleEvent(event) {
    if (event.type !== 'pointermove') {
      console.log('%c 🍭 event: ', 'font-size:20px;background-color: #7F2B82;color:#fff;', event)
    }
    if (event.type == EventType.CONTEXTMENU && this.drawing) {
      // 右键修改为取消现在的点 并绘制完成
      // event.preventDefault() // 无效,还是会多一个点,需要removeLastPoint
      // event.stopPropagation() // 无效,还是会多一个点,需要removeLastPoint
      this.cancelDrawing()

      return
    }
    super.handleEvent(event)
  }

  // 绘制时右键取消

  cancelDrawing() {
    let map = this.getMap()
    this.drawing = false
    if (this.type_ == GeometryType.LINE_STRING) {
      this.removeLastPoint()
      if (this.sketchCoords_.length == 2) {
        this.abortDrawing()
        let shape = this.shapes.pop()
        shape.nodes.forEach((n) => {
          map.removeOverlay(n.overlay)
        })
        map.removeOverlay(shape.label)
        map.removeOverlay(shape.delOverlay)
      } else {
        this.finishDrawing()
      }
    } else if (this.type_ == GeometryType.POLYGON) {
      this.removeLastPoint()
      if (this.sketchLineCoords_.length <= 3) {
        this.abortDrawing()
        let shape = this.shapes.pop()
        shape.nodes.forEach((n) => {
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
    let index = this.shapes.findIndex((s) => s == shape)
    if (index > -1) {
      let map = this.map
      this.source_.removeFeature(shape.feature)

      shape.nodes.forEach((n) => {
        map.removeOverlay(n.overlay)
      })
      map.removeOverlay(shape.label)
      map.removeOverlay(shape.delOverlay)
      this.shapes.splice(index, 1)
    }
  }
  setModifyActive(active) {
    if (this.modify) {
      this.modify.setActive(active)
    }
  }
  finishDrawing() {
    this.drawing = false
    super.finishDrawing()
  }
}
const outsideMoveDuration = 100 // 鼠标在地图外 使地图移动的动画过渡时间
let moveThrottle = throttle(
  (e, ins, leaveMomentPixel) => {
    const map = ins.map
    let leavePixel = map.getEventPixel(e),
      leaveCoord = map.getCoordinateFromPixel(leavePixel)

    let centerCoord = map.getView().getCenter()

    //坐标项链
    let v = [leaveCoord[0] - centerCoord[0], leaveCoord[1] - centerCoord[1]],
      unitV = [v[0] / 10, v[1] / 10]
    let nCroodLng = centerCoord[0] + unitV[0],
      nCroodLat = centerCoord[1] + unitV[1]

    // 地图移动过渡
    map.getView().animate({
      center: [nCroodLng, nCroodLat],
      duration: outsideMoveDuration,
    })

    // 绘制中隐藏绘制线
    // 最后一点更新位置（暂无法实现，在mouseLeaveCb step中更新geometry坐标点无效果）
  },
  outsideMoveDuration,
  {
    leading: false,
  }
)
function mouseLeaveCb(ins, e) {
  ins.outsideViewportDrawing = true
  // ins.changed() // 不一定执行
  ins.getOverlay().changed() // 一定执行
  const map = ins.map
  let leaveMomentPixel = map.getEventPixel(e)
  let drawingShape = ins.drawingShape,
    geo = drawingShape.feature.getGeometry()

  function step() {
    if (drawingShape) {
      let coords = geo.getCoordinates(),
        outCoord = map.getCoordinateFromPixel(leaveMomentPixel),
        lastCoord = []
      if (drawingShape.type === GeometryType.LINE_STRING) {
        lastCoord = coords.slice(-1)[0]
      } else if (drawingShape.type === GeometryType.POLYGON) {
        lastCoord = coords[0].slice(-2, -1)[0]
      }
      lastCoord[0] = outCoord[0]
      lastCoord[1] = outCoord[1]
      geo.setCoordinates(coords)
      drawingShape.feature.setGeometry(geo)
      drawingShape.feature.changed()
      if (ins.type === GeometryType.LINE_STRING) {
        drawingShape.label.setPosition(lastCoord)
      } else {
        let pos = geo.getInteriorPoint().getCoordinates()
        drawingShape.label.setPosition(pos)
      }
    }
    moveThrottle(e, ins, leaveMomentPixel)
    ins.timer = window.requestAnimationFrame(step)
  }
  ins.timer = window.requestAnimationFrame(step)
}
function mouseEnterCb(ins) {
  ins.outsideViewportDrawing = false
  ins.getOverlay().changed() // 一定执行

  if (ins.timer) {
    cancelAnimationFrame(ins.timer)
    ins.timer = null
  }
}

// BDModify
class BDModify extends Modify {
  constructor(opts) {
    super(opts)
  }
  handlePointerAtPixel_(pixel, map, opt_coordinate) {
    super.handlePointerAtPixel_(pixel, map, opt_coordinate)
    /**
     * 源码方法拓展
     */
    if (this.vertexFeature_) {
      let style = this.overlay_.getStyle()
      if (this.snappedToVertex_) {
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
