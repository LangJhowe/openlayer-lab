import { Overlay } from 'ol'
import GeometryType from 'ol/geom/geometrytype'
import { getArea, getLength } from 'ol/sphere'

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
const formatArea = function (polygon) {
  const area = getArea(polygon)
  let value, unit, text
  value = Math.round(area * 100) / 100
  unit = ' 米\xB2'
  text = value + unit
  return {
    value,
    unit,
    text,
  }
}
const formatLength = function (line) {
  const length = getLength(line)
  let value, unit, text
  value = Math.round(length * 100) / 100
  unit = ' 米'
  text = value + unit
  return {
    value,
    unit,
    text,
  }
}
// 选取的节点
class MeasureNode {
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
    let map = this.draw.map
    enableLongPress(ele,200)
    ele.addEventListener('longpress',()=>{
      if(!this.draw.getActive()) return
      // 拖拽点逻辑
      // 拿到点击位置对应地图modify位置,构建evt
      let pixel = map.getPixelFromCoordinate(this.position)
      let originalEvent = new PointerEvent("pointerdown",{
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
          if(shape.type == GeometryType.POLYGON) {
            if(shape.nodes.length >=3) {
              this.draw.drawing = false // 提前设置drawing = false
              this.draw.finishDrawing()
            }
          } else {
            // 绘制中的最后一个
            this.draw.drawing = false // 提前设置drawing = false
            this.draw.finishDrawing()
          }
        }
      }
    })
    ele.addEventListener('click',(e)=>{
      console.log('%c 🍝 click: ', 'font-size:20px;background-color: #4b4b4b;color:#fff;');
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
    
    map.addOverlay(this.overlay)
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
      innerHTML.replace(`{${key}}`,this.properties[key])
    }
    ele.innerHTML = innerHTML
  }
}
class MeasureShape {
  draw = null
  feature = null
  flatCoordinates = []
  nodes = []
  label = null
  delOverlay = new Overlay({
    element: document.createElement('div'),
    className: 'ol-measure-del'
  })
  type = ''
  constructor(opts) {
    this.feature = opts.feature
    let draw = opts.draw
    this.type=opts.type
    this.draw = draw

    this.initLabel_()
    this.initDelOverlay_()
    
    if(opts.feature) {
      let map = draw.map
      map.addOverlay(this.label)
      opts.feature.on('change',(e)=>{
        if(draw) {
          let geo = e.target.getGeometry()
          this.flatCoordinates = geo.flatCoordinates
          this.nodes.forEach((n)=>{
            map.removeOverlay(n.overlay)
          })
          this.nodes = []
          if(this.type == GeometryType.LINE_STRING || this.type == GeometryType.POLYGON) {
            // 节点
            let hideCount = draw.drawing ? 1 : 0
            if(this.type == GeometryType.POLYGON) hideCount++
            for (let index = 0; index < this.flatCoordinates.length/2-hideCount; index++) {
              let dNode = new MeasureNode({
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

            // 计算点
            let pos = this.type == GeometryType.LINE_STRING ? geo.getLastCoordinate():geo.getInteriorPoint().getCoordinates(),
                data = this.type == GeometryType.LINE_STRING ? formatLength(geo):formatArea(geo)
            if(draw.drawing) {
              if(this.type == GeometryType.POLYGON && this.nodes.length < 2) {
                data.tipsTemplate = '<div>单击确定地点;右键取消</div>'
              } else if(this.type == GeometryType.LINE_STRING && this.nodes.length < 1){

              } else {
                data.tipsTemplate = '<div>单击确定地点,双击结束;右键取消</div>'
              }
            } else {
              data.tipsTemplate = ''
            }
            this.label.setPosition(pos)
            this.delOverlay.setPosition(pos)
            if(this.templateFunction) {
              this.label.getElement().innerHTML = this.templateFunction(data,this.template)
            } else {
              this.label.getElement().innerHTML = data.value
            }
          }
        }
        this.handleChange_ && this.handleChange_(e)
      })
    }
  }
  initLabel_() {
    let ele = document.createElement('div')
    console.log(this.type,GeometryType.LINE_STRING);
    this.label = new Overlay({
      element: ele,
      positioning: this.type == GeometryType.LINE_STRING ? 'center-left': 'center-center',
      offset: this.type == GeometryType.LINE_STRING ? [15,35] : [0,0]
    })
    ele.addEventListener('click',()=>{
      if(this.draw.drawing){
        // 绘制时,鼠标移动到label内点击，执行选点
        console.log('drawing click label');
        // let originalEvent = new PointerEvent("pointerdown",{
        //   pointerId: Date.now(),
        //   bubbles: true,
        //   cancelable: true,
        //   pointerType: "touch",
        //   width: 100,
        //   height: 100,
        //   clientX: pixel[0],
        //   clientY: pixel[1],
        //   isPrimary: true
        // });
        // map.getViewport().dispatchEvent(originalEvent)
      }
    })

  }
  initDelOverlay_() {
    this.delOverlay.setPositioning('center-center')
    const offset = this.type === GeometryType.LINE_STRING ? [21,10] : [0,-20]
    this.delOverlay.setOffset(offset)
    let delEle = this.delOverlay.getElement()
    delEle.addEventListener('click',()=>{
      console.log('删除');
    })
  }
  getGeometry () {
    return this.feature && this.feature.getGeometry()
  }

  removeNode(mNode) {
    let node = this.nodes.splice(mNode.index,1)
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

class MeasureLine extends MeasureShape{
  startLabel = new Overlay({
    element: document.createElement('div'),
    positioning: 'center-left',
    offset: [15,0]
  })
  template = `
    <div class="ol-measure-label__inner">
      <div class="ol-measure-label__cont">
        总长: <span class="ol-measure-label-value">{value}</span>{unit}
      </div> 
      {tipsTemplate}
    </div>
  `
  templateFunction = (obj,template) =>{
    let res = template
    for (const key in obj) {
      let reg = new RegExp(`{${key}}`,'g')
      res = res.replace(reg,obj[key])
    }
    return res
  }
  constructor(opts) {
    opts.type = GeometryType.LINE_STRING
    super(opts)
    let startLabelEle = this.startLabel.getElement()
    startLabelEle.innerHTML = `
      <div class="ol-measure-label__inner">
        起点
      </div>
    `
  }
  
  handleChange_(e) {
    if(this.draw){
      if(this.type == GeometryType.LINE_STRING ){
        let map = this.draw.map,
            geo = e.target.getGeometry(),
            pos = geo.getFirstCoordinate()
        this.startLabel.setPosition(pos)
        map.addOverlay(this.startLabel)
      }
    }
  }
}
class MeasurePolygon extends MeasureShape{
  template = `
    <div class="ol-measure-label__inner">
      <div class="ol-measure-label__cont">
        总面积: <span class="ol-measure-label-value">{value}</span>{unit}
      </div> 
      {tipsTemplate}
    </div>
  `
  templateFunction = (obj,template) =>{
    let res = template
    for (const key in obj) {
      let reg = new RegExp(`{${key}}`,'g')
      res = res.replace(reg,obj[key])
    }
    return res
  }
  type = GeometryType.POLYGON
  constructor(opts) {
    opts.type = GeometryType.POLYGON
    super(opts)
  }
}

export {
  MeasureLine,
  MeasurePolygon
}
export default MeasureShape