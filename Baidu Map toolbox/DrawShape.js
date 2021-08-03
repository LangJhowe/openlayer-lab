import { MapBrowserEvent } from 'ol'
import { MapEvent } from 'ol'
import { Overlay } from 'ol'
import GeometryLayout from 'ol/geom/geometrylayout'
import GeometryType from 'ol/geom/geometrytype'
import MapBrowserEventType from 'ol/src/MapBrowserEventType'
import MapEventType from 'ol/src/MapEventType'
let clickTimer
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
  index = 0
  draw = null
  position = []
  overlay = null
  properties = {}
  ele = document.createElement('div')
  template = ``
  shape = null
  constructor(opts) {
    this.shape = opts.shape
    this.position = opts.position
    this.draw = opts.draw
    this.index = opts.index
    let ele = this.ele
    enableLongPress(ele,200)
    ele.addEventListener('longpress',()=>{
      if(!this.draw.getActive()) return
      // 拖拽点逻辑
      // 拿到点击位置对应地图modify位置,构建evt
      let map = this.draw.map,
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
      map.getViewport().dispatchEvent(originalEvent)
    })
    ele.addEventListener('dblclick',()=>{
      clearTimeout(clickTimer)
      clickTimer = null
      // 确认位置
      if(!this.draw.getActive()) return
      if(this.draw.drawing) {
        let shape = this.draw.shapes[this.draw.shapes.length - 1],
        node = shape.nodes[shape.nodes.length - 1]
        
        if(ele === node.ele) {
          // 绘制中的最后一个
          this.draw.drawing = false // 提前设置drawing = false
          this.draw.finishDrawing()
        }
      }
    })
    ele.addEventListener('click',(e)=>{
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => {
        // 删除位置
        if(!this.draw.getActive()) return
        this.shape.removeNode(this)
      }, 300);
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
  type = ''
  constructor(opts) {
    this.feature = opts.feature
    let draw = opts.draw
    this.draw = draw
    if(opts.feature) {
      let map = draw.map
      opts.feature.on('change',(e)=>{
        if(draw) {
          this.flatCoordinates = e.target.getGeometry().flatCoordinates
          this.nodes.forEach((n)=>{
            map.removeOverlay(n.overlay)
          })
          this.nodes = []
          if(this.type == GeometryType.LINE_STRING || this.type == GeometryType.POLYGON) {
            let hideCount = draw.drawing ? 1 : 0
            if(this.type == GeometryType.POLYGON) hideCount++
            for (let index = 0; index < this.flatCoordinates.length/2-hideCount; index++) {
              let dNode = new DrawNode({
                draw: draw,
                position:[this.flatCoordinates[index*2],this.flatCoordinates[index*2 + 1]],
                template: `
                  <div class="">
                  </div>
                `,
                shape: this,
                index: index
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

  removeNode(drawNode) {
    let node = this.nodes.splice(drawNode.index,1)
    if(node[0]) {
      let map = this.draw.map
      map.removeOverlay(node[0].overlay)
      if(this.type == GeometryType.LINE_STRING) {
        if(this.nodes.length == 1) {
          this.draw.removeShape(this)
        } else {
          let coords = this.nodes.map((n,index)=>{
            n.index = index
            return n.position
          })
          this.feature.getGeometry().setCoordinates(coords)
          this.feature.changed()
        }
      } else if(this.type == GeometryType.POLYGON) {
        if(this.nodes.length == 2) {
          this.draw.removeShape(this)
        } else {
          let coordinates = this.feature.getGeometry().getCoordinates()[0]
          let nc = coordinates.filter(c=>{
            return c[0] !== node[0].position[0] && c[1] !== node[0].position[1]
          })
          this.feature.getGeometry().setCoordinates([nc])
        }
      }
    }
  }
}

class DrawLine extends DrawShape{
  // feature = null
  type = GeometryType.LINE_STRING
  constructor(opts) {
    super(opts)
  }
}
class DrawPolygon extends DrawShape{
  // feature = null
  type = GeometryType.POLYGON
  constructor(opts) {
    super(opts)
  }
}

export {
  DrawLine,
  DrawPolygon
}
export default DrawShape