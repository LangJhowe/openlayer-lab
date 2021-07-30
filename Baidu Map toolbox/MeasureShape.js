
import GeometryType from 'ol/geom/geometrytype'
class MeasureShape {
  type = ''
  drawPoints = [] // 选择的点
  calcRes = 0 // 计算结果 
  constructor({
    type // GeometryType.LINE_STRING||POLYGON
  }) {

  }
}
class MeasureLine extends MeasureShape{
  constructor(opts={}) {
    super({type: GeometryType.LINE_STRING,...opts})
  }
}
class MeasurePolygon extends MeasureShape{
  constructor(opts={}) {
    super({type: GeometryType.POLYGON,...opts})
  }
}
export {
  MeasureLine,
  MeasurePolygon
}
export default MeasureShape