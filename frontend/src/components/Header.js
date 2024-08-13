import React from "react";
import { Link } from "react-router-dom";

function Header({ buttons, connectWallet, walletAddress }) {
  const shortenAddress = (address) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const buttonStyle = {
    padding: "10px 20px",
    margin: "5px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    transition: "background-color 0.3s, color 0.3s",
  };

  const navLinkStyle = {
    color: "#333",
    textDecoration: "none",
    margin: "0 15px",
    fontWeight: "bold",
  };

  return (
    <header style={{ backgroundColor: "#f8f8f8", padding: "10px 0" }}>
      <div
        className="container"
        style={{ maxWidth: "1200px", margin: "0 auto" }}
      >
        <div
          className="header-content"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            to="/"
            style={{ ...navLinkStyle, fontSize: "24px", fontWeight: "bold" }}
          >
            Soliate
          </Link>
          <nav style={{ display: "flex", alignItems: "center" }}>
            <Link to="/list" style={navLinkStyle}>
              Campaigns
            </Link>
            <Link to="/about-us" style={navLinkStyle}>
              About Us
            </Link>
          </nav>
          <div className="buttons">
            {buttons.map((button, index) => {
              if (button.type === "wallet") {
                return (
                  <button
                    key={index}
                    onClick={connectWallet}
                    style={buttonStyle}
                  >
                    {walletAddress
                      ? shortenAddress(walletAddress)
                      : button.label}
                  </button>
                );
              } else if (button.type === "link") {
                return (
                  <Link
                    key={index}
                    to={button.path}
                    style={{
                      ...buttonStyle,
                      backgroundColor: "black",
                      color: "white",
                    }}
                  >
                    {button.label}
                  </Link>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
