import { MapBrowserEvent } from 'ol'
import { MapEvent } from 'ol'
import { Overlay } from 'ol'
import GeometryType from 'ol/geom/geometrytype'
import MapBrowserEventType from 'ol/src/MapBrowserEventType'
import MapEventType from 'ol/src/MapEventType'
function enableLongPress(target, threshold) {
  var timer;
  var timeOut;
  var evt = document.createEvent('Event');
  evt.initEvent('longpress', true, true);
  target.addEventListener('mousedown', function() {
     timer = Date.now();
     timeOut=setTimeout(function(){
       target.dispatchEvent(evt);
     },threshold);
  }, false);
  target.addEventListener('mouseup', function() {
     if(Date.now() - timer < threshold) {
        evt.duration = Date.now() - timer;
        clearTimeout(timeOut);
     }
  }, false);
}
// 选取的节点
class DrawNode {
  draw = null
  position = []
  overlay = null
  properties = {}
  ele = document.createElement('div')
  template = ``
  constructor(opts) {
    this.position = opts.position
    this.draw = opts.draw
    let ele = this.ele
    enableLongPress(ele,200)
    ele.addEventListener('longpress')
    ele.addEventListener('click',(e)=>{
      e.stopPropagation()
      e.preventDefault()
      if(!this.draw.getActive()) return 

      if(this.draw.drawing) {
        let shape = this.draw.shapes[this.draw.shapes.length - 1],
        node = shape.nodes[shape.nodes.length - 1]
        
        if(ele === node.ele) {
          // 绘制中的最后一个
          this.draw.drawing = false // 提前设置drawing = false
          this.draw.finishDrawing()
        }
      } else {
        // 拖动逻辑
        // 拿到点击位置对应地图modify位置
        // console.log(this.position);
        // 构建evt
        let map = this.draw.getMap(),
            pixel = map.getPixelFromCoordinate(this.position),
            originalEvent = new PointerEvent("pointerdown",{
              pointerId: Date.now(),
              bubbles: true,
              cancelable: true,
              pointerType: "touch",
              width: 100,
              height: 100,
              clientX: pixel[0],
              clientY: pixel[1],
              isPrimary: true
            });
        // let evt = new MapBrowserEvent(MapBrowserEventType.POINTERDOWN,map)
        // this.draw.modify.handleDownEvent(evt) //
        map.getViewport().addEventListener('pointerdown',()=>{
          console.log('asfv');
        })
        console.log(originalEvent);
        map.getViewport().dispatchEvent(originalEvent)
      }
    })
    this.overlay = new Overlay({
        element: ele,
        position: this.position,
        className: 'draw-node-overlay',
        positioning: 'center-center'
      }
    )
    
    let map = this.draw.getMap()
    if(map) {
      map.addOverlay(this.overlay)
    }
    this.changed()
  }
  setProperites(obj) {
    Object.assign(this.properties,obj)
  }
  changed() {
    let ele = this.ele
    ele.classList.add('draw-node-overlay')
    let innerHTML = this.template
    for (const key in this.properties) {
      innerHTML.replace(`{${key}}`,properties[key])
    }
    ele.innerHTML = innerHTML
  }
}
class DrawShape {
  draw = null
  feature = null
  flatCoordinates = []
  nodes = []
  label = document.createElement('div') // 显示结果的label
  constructor(opts) {
    this.feature = opts.feature
    let draw = opts.draw
    this.draw = draw
    if(opts.feature) {
      opts.feature.on('change',(e)=>{
        if(draw) {
          let map = draw.getMap()
          this.flatCoordinates = opts.feature.getGeometry().flatCoordinates

          this.nodes.forEach((n)=>{
            map.removeOverlay(n.overlay)
          })
          this.nodes = []
          if(draw.type_ == GeometryType.LINE_STRING || draw.type_ == GeometryType.POLYGON) {
            let hideCount = draw.drawing ? 1 : 0
            if(draw.type_ == GeometryType.POLYGON) hideCount++

            for (let index = 0; index < this.flatCoordinates.length/2-hideCount; index++) {
              let dNode = new DrawNode({
                draw: draw,
                position:[this.flatCoordinates[index*2],this.flatCoordinates[index*2 + 1]],
                template: `
                  <div class="">
                  </div>
                `
              })
              this.nodes.push(dNode)
              map.addOverlay(dNode.overlay)
            }
          }
        }
      })
    }
  }
  getGeometry () {
    return this.feature && this.feature.getGeometry()
  }
  cancelDraw() {

  }
}

class DrawLine extends DrawShape{
  // feature = null
  constructor(opts) {
    super(opts)
  }
}
class DrawPolygon extends DrawShape{
  // feature = null
  constructor(opts) {
    super(opts)
  }
}

export {
  DrawLine,
  DrawPolygon
}
export default DrawShape