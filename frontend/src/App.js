// App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./index.css";
import Header from "./components/Header";
import Features from "./components/Features";
import Footer from "./components/Footer";
import AdvertiserPage from "./components/AdvertiserPage";
import AdvertiserForm from "./components/AdvertiserForm";
import CreateNFT from "./components/CreateNFT";
import ListNFT from "./components/ListNFT";
import NFTDetail from "./components/NFTDetail";
import AdDashboard from "./components/AdDashboard";
import { UserProvider, WithAuth, useUser } from "./utils/AuthUtils";


function App() {
  const { walletAddress, checkAndConnectWallet } = useUser();

  const getHeaderButtons = (page) => {
    const loginButton = {
      type: "wallet",
      label: "Login",
      onClick: () => checkAndConnectWallet(page),
    };

    switch (page) {
      case "home":
        return walletAddress
          ? [loginButton]
          : [
              loginButton,
              { type: "link", path: "/advertiser", label: "Post AD" },
            ];
      case "advertiser":
        return [
          loginButton,
          { type: "link", path: "/advertiser-form", label: "Register" },
        ];
      case "dashboard":
        return [
          loginButton,
          { type: "link", path: "/create", label: "CREATE" },
        ];
      case "advertiser-form":
      case "create":
      case "list":
      case "detail":
        return [loginButton];
      default:
        return [loginButton];
    }
  };

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            <WithAuth page="home">
              <Header
                buttons={getHeaderButtons("home")}
                connectWallet={() => checkAndConnectWallet("home")}
                walletAddress={walletAddress}
              />
              <Features />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/advertiser"
          element={
            <WithAuth page="advertiser">
              <Header
                buttons={getHeaderButtons("advertiser")}
                connectWallet={() => checkAndConnectWallet("advertiser")}
                walletAddress={walletAddress}
              />
              <AdvertiserPage />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/advertiser-form"
          element={
            <WithAuth page="advertiser-form">
              <Header
                buttons={getHeaderButtons("advertiser-form")}
                connectWallet={() => checkAndConnectWallet("advertiser-form")}
                walletAddress={walletAddress}
              />
              <AdvertiserForm
                walletAddress={walletAddress}
              />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/ad-dashboard"
          element={
            <WithAuth requireAdvertiser={true} page="dashboard">
              <Header
                buttons={getHeaderButtons("dashboard")}
                connectWallet={() => checkAndConnectWallet("dashboard")}
                walletAddress={walletAddress}
              />
              <AdDashboard walletAddress={walletAddress} />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/create"
          element={
            <WithAuth requireAdvertiser={true} page="create">
              <Header
                buttons={getHeaderButtons("create")}
                connectWallet={() => checkAndConnectWallet("create")}
                walletAddress={walletAddress}
              />
              <CreateNFT
                walletAddress={walletAddress}
              />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/list"
          element={
            <WithAuth page="list">
              <Header
                buttons={getHeaderButtons("list")}
                connectWallet={() => checkAndConnectWallet("list")}
                walletAddress={walletAddress}
              />
              <ListNFT />
              <Footer />
            </WithAuth>
          }
        />
        <Route
          path="/nft/:address"
          element={
            <WithAuth page="detail">
              <Header
                buttons={getHeaderButtons("detail")}
                connectWallet={() => checkAndConnectWallet("detail")}
                walletAddress={walletAddress}
              />
              <NFTDetail
                walletAddress={walletAddress}
              />
              <Footer />
            </WithAuth>
          }
        />
      </Routes>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <UserProvider>
        <App />
      </UserProvider>
    </Router>
  );
}
