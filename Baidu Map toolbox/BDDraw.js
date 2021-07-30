import { throttle } from 'lodash'
import { Draw } from 'ol/interaction'
throttle
// 仿web百度地图交互 拓展class
class BDDraw extends Draw {
  /**
   * 绘图时是否移除地图
   */
  outsideViewportDrawing = false

  constructor(options) {
    super(options)
  }

  // overwrite
  // map removeInteraction 会set Null
  // 经实践,removeInteraction已解除draw.on事件,无需在考虑解绑问题
  setMap(map) {
    super.setMap(map);
    if(map) {
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
    }
  }
}
const outsideMoveDuration = 100 // 鼠标在地图外 使地图移动的动画过渡时间
let moveThrottle = throttle((e,map)=>{
    // console.log(ins);
    // const map = ins.getMap()
    let leavePixel = map.getEventPixel(e),
        leaveCoord = map.getCoordinateFromPixel(leavePixel)
  
    let centerCoord =  map.getView().getCenter();
  
    //坐标项链
    let v = [leaveCoord[0]-centerCoord[0],leaveCoord[1]-centerCoord[1]],
        unitV = [v[0]/10,v[1]/10]
    let nCroodLng = centerCoord[0] + unitV[0],
        nCroodLat = centerCoord[1] + unitV[1]

    // 地图未发生变化
    map.getView().animate({
      center:  [nCroodLng,nCroodLat],
      duration: outsideMoveDuration,
    });

    // 绘制中隐藏绘制线

    // 点更新位置

    // console.log(e,map);
},outsideMoveDuration,{
  leading: false
})
function mouseLeaveCb(ins,e) {
  console.log('mouseLeaveCb',ins);
  let map = ins.getMap()
  ins.outsideViewportDrawing = true
  
  function step () {
    moveThrottle(e,map)
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