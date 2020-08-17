import React, { useEffect, useState } from "react";
import { Button, Input, message as aMessage, Pagination } from "antd";
import style from "./home.module.scss";
import http from "@utils/http";

function Home (props) {
  const [pageResult, setPageResult] = useState({
    result: [],
    total: 0
  });

  let pageParams = {
    pageNum: 1,
    pageSize: 5
  };

  let name = "";

  useEffect(() => {
    getScenic();
  }, []);

  async function getScenic () {
    const { data: { status, data, message } } = await http.get("/api/scenic", {
      params: { ...pageParams, name }
    });
    if (status === 1) {
      setPageResult(data);
    } else {
      aMessage.error(message);
    }
  }
  function handleInput (e) {
    name = e.target.value;
  }
  function handlePageChange (pageNum, pageSize) {
    pageParams = { pageNum, pageSize };
    getScenic();
    document.documentElement.scrollTop = document.body.scrollTop = 0
  }

  return (
  <div className={style.main}>
    <div className={"df p20 " + style.bb}>
      <Input placeholder="搜索旅游景点" onInput={handleInput} />
      <Button type="primary" className="ml10" onClick={getScenic}>搜索</Button>
    </div>
    <div>
      {pageResult.result.map((item, index) => {
        return (
        <div key={index} className={"df p20 " + style.bb}>
          <div className={"flxn " + style.img}>
            <img src={item.img} alt="" />
          </div>
          <div className={`ml20 ${style.right}`}>
            <div className={`fsz18 fwb ${style.name} ${style.ellipsis}`}>{item.name}</div>
            <div className={`mt10 fsz12 ${style.address} ${style.ellipsis}`}>{item.address}</div>
            <div className={style.introduce}>{item.introduce}</div>
          </div>
        </div>
        );
      })}
    </div>
    <div className="pt20 pb20 df jcc">
      <Pagination defaultCurrent={1} defaultPageSize={5} onChange={handlePageChange} total={pageResult.total} />
    </div>
  </div>
  );
}

export default Home;
