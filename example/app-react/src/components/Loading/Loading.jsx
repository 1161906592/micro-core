import React from "react";

const Loading = ({ pastDelay, error }) => {
  if (pastDelay) {
    return (
    <div id="global-loading">
      <div className="spinner">
        <div className="bounce" />
        <div className="bounce" />
        <div className="bounce" />
      </div>
    </div>
    );
  } else if (error) {
    return <div>Sorry, there was a problem loading the page.</div>;
  } else {
    return null;
  }
};

export default Loading;
