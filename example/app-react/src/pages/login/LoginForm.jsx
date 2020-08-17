import React from "react";
import { Button, Form, Icon, Input, message as aMessage } from "antd";
import { withRouter } from "react-router-dom";
import http from "@utils/http";

function LoginForm (props) {
  function handleSubmit (e) {
    e.preventDefault();
    props.form.validateFields(async (err, values) => {
      if (!err) {
        login(values);
      }
    });
  }

  async function login (values) {
    const { data: { status, data, message } } = await http.post("/api/user/login", values);
    if (status === 1) {
      localStorage.setItem("token", data);
      aMessage.success("登录成功");
      props.history.push(localStorage.getItem("currentPath") || "/");
    } else {
      aMessage.error(message);
    }
  }

  const { getFieldDecorator } = props.form;
  return (
  <Form>
    <Form.Item hasFeedback={true}>
      {getFieldDecorator("userName", { rules: [ { required: true, message: "请输入用户名" } ] })(
      <Input prefix={<Icon type="user" style={{ color: "rgba(0,0,0,.25)" }} />}
             autoComplete="off"
             placeholder="用户名" />
      )}
    </Form.Item>
    <Form.Item hasFeedback={true}>
      {getFieldDecorator("password", { rules: [ { required: true, message: "请输入密码" } ], })(
      <Input prefix={<Icon type="lock" style={{ color: "rgba(0,0,0,.25)" }} />}
             type="password"
             autoComplete="off"
             placeholder="密码" />
      )}
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" block={true} onClick={handleSubmit}>登录</Button>
    </Form.Item>
  </Form>
  );
}

export default withRouter(Form.create()(LoginForm));
