import React from "react";
import { Button, Form, message as aMessage, Select } from "antd";
import style from "./strategy.module.scss"
import http from "@utils/http";

@Form.create()
class Strategy extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      addressOptions: [],
      routeArr: []
    }
  }
  ref = [];
  autoComplete = null;

  getAddress = (value) => {
    this.autoComplete.search(value, (status, result) => {
      this.setState({
        addressOptions: result.tips || []
      })
    })
  };

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.form.validateFields(async (err, values) => {
      if (!err) {
        values.address = values.address.slice(0, -1);
        const {data: {status, data, message}} = await http.get("/api/strategy", {
          params: values
        });
        if (status === 1) {
          this.ref = data.map(d => React.createRef());
          this.setState({
            routeArr: data
          });
          data.forEach((item, index) => {
            this.createMap(item, index)
          })
        } else {
          aMessage.error(message)
        }
      }
    })
  };

  createMap = (item, index) => {
    const map = new window.AMap.Map(this.ref[index].current.children[1], {
      resizeEnable: false,
      // mapStyle: 'amap://styles/whitesmoke', //设置地图的显示样式
      isHotspot: true,//是否开启地图热点和标注的hover效果
      zoomEnable: true,//地图是否可缩放
      scrollWheel: false,//地图是否可通过鼠标滚轮缩放浏览
    });
    var driving = new window.AMap.Driving({
      // 驾车路线规划策略，AMap.DrivingPolicy.LEAST_TIME是最快捷模式
      map: map,
      policy: window.AMap.DrivingPolicy.LEAST_TIME,
      //是否显示路况
      showTraffic: true,
      //显示结果列表的容器Id或元素
      panel: this.ref[index].current.children[2],
      //自动调整路径显示位置及大小
      autoFitView: true,
    });
    driving.search(item.map(d => ({keyword: d, city: "重庆"})).concat([{keyword: item[0], city: "重庆"}]))
  };

  componentWillMount () {
    window.AMap.plugin('AMap.Autocomplete', () => {
      this.autoComplete = new window.AMap.Autocomplete({
        city: '重庆'
      });
    })
  }

  render () {
    const {getFieldDecorator} = this.props.form;
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 3 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 21 },
      },
    };
    const {addressOptions, routeArr} = this.state;
    return (
    <div>
      <div className={`p20 ${style.section}`}>
        <Form {...formItemLayout}>
          <Form.Item hasFeedback={true} label="旅游时长">
            {getFieldDecorator('duration', {rules: [{required: true, message: '请选择旅游时长'}]})(
            <Select placeholder="请选择旅游时长">
              {Array(10).fill("").map((d, i) => <Select.Option key={i} value={i + 1}>{i + 1 + '天'}</Select.Option>)}
            </Select>
            )}
          </Form.Item>
          <Form.Item hasFeedback={true} label="旅游类型">
            {getFieldDecorator('type', {rules: [{required: true, message: '请选择旅游类型'}],})(
            <Select placeholder="请选择旅游类型">
              {['人文旅游景点', "自然旅游景点"].map((d, i) => <Select.Option key={i} value={i + 1}>{d}</Select.Option>)}
            </Select>
            )}
          </Form.Item>
          <Form.Item hasFeedback={true} label="住宿地址">
            {getFieldDecorator('address', {rules: [{required: true, message: '请选择住宿地址'}]})(
            <Select showSearch placeholder="搜索住宿地址" filterOption={false} onSearch={this.getAddress}>
              {addressOptions.map((d, i) => <Select.Option key={i} value={d.name + i}>{d.name}</Select.Option>)}
            </Select>
            )}
          </Form.Item>
        </Form>
        <Button type="primary" block={true} onClick={this.handleSubmit}>生成攻略</Button>
        <div className={`fsz12 mt10`}>小提示：目前只支持生成重庆地区驾车的旅游攻略哟~~</div>
      </div>
      <div className="mt20">
        {routeArr.map((item, index) =>(
        <div key={index} className={style.routeLine}>{`第 ${index + 1} 天：${item.join(">")}`}</div>)
        )}
      </div>
      {routeArr.map((item, index) =>(
      <div className={`mt20 ${style.section}`} key={index} ref={this.ref[index]} >
        <div className={style.titleLine}>{`第 ${index + 1} 天：${item.join(">")}`}</div>
        <div className={`mt20 mb10 ${style.map}`}/>
        <div />
      </div>)
      )}
    </div>
    )
  }
}

export default Strategy;
