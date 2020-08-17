import React, { useEffect } from "react";
import { Link, withRouter } from "react-router-dom";
import style from "./layout.module.scss";
import { Dropdown, Icon, Menu, message as aMessage } from "antd";
import http from "@utils/http";
import { connect, action } from "@store";

function mapStateToProps (state, ownProps) {
  return {
    user: state.user
  };
}

function mapDispatchToProps (dispatch, ownProps) {
  return {
    setUser: (user) => {
      dispatch(action.setUser(user));
    }
  }
}

// @connect(mapStateToProps)
function MainLayout (props) {
  useEffect(() => {
    props.setUser();
  }, []);

  const handleLogout = async () => {
    const { data: { status, message } } = await http.post("/api/user/logout");
    if (status === 1) {
      localStorage.clear();
      aMessage.success("已退出登录");
      props.history.push("/login");
    } else {
      aMessage.error(message);
    }
  };

  const menu = (
  <Menu>
    <Menu.Item onClick={handleLogout}><Icon type="logout" />退出登录</Menu.Item>
  </Menu>
  );
  const { children, user } = props;
  return (
  <>
    <header className={style.header}>
      <div className={"df aic jcsb " + style.inner}>
        <div className="fsz24 fwb">自驾游小助手</div>
        <div className="fsz16">
          <Link className="mr20" to={{ pathname: "/" }}>首页</Link>
          <Link className="mr20" to={{ pathname: "/home/strategy" }}>攻略</Link>
          {
            user.userName ? (
            <Dropdown overlay={menu} trigger={[ "click" ]}>
              <span className="cup">
                <span className="mr4">{user.userName}</span>
                <Icon type="down" />
              </span>
            </Dropdown>
            ) :
            <Link to={{ pathname: "/login" }}>登录</Link>
          }
        </div>
      </div>
    </header>
    <main className={style.main + " " + style.inner}>{children}</main>
    <footer className={"tac " + style.footer}>&copy;2019 copyright - 向娇专卖</footer>
  </>
  );

};

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(MainLayout));
