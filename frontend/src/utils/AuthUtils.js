import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { useNavigate } from "react-router-dom";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import idl from "../idl.json";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isAdvertiser, setIsAdvertiser] = useState(false);
  const navigate = useNavigate();

  const programId = useMemo(() => new PublicKey(idl.address), []);

  const checkIsAdvertiser = useCallback(
    async (address) => {
      if (!address) {
        console.log("No wallet address provided");
        return false;
      }

      try {
        console.log("Checking advertiser status for address:", address);
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        console.log("Connection established");

        const provider = new AnchorProvider(connection, window.solana, {
          preflightCommitment: "confirmed",
        });
        console.log("Provider created");

        const program = new Program(idl, programId);
        console.log("Program initialized with ID:", programId.toString());

        const [advertiserPda] = web3.PublicKey.findProgramAddressSync(
          [Buffer.from("advertiser"), provider.publicKey.toBuffer()],
          program.programId
        );
        console.log("Advertiser PDA calculated:", advertiserPda.toString());

        const accountInfo = await connection.getAccountInfo(advertiserPda);
        console.log("Account Info:", accountInfo);

        if (accountInfo) {
          console.log("Account owner:", accountInfo.owner.toString());
          console.log("Account data length:", accountInfo.data.length);
        } else {
          console.log("No account info found for this PDA");
        }

        const isAdvertiser =
          !!accountInfo && accountInfo.owner.equals(program.programId);
        console.log("Is Advertiser:", isAdvertiser);
        setIsAdvertiser(isAdvertiser);
        return isAdvertiser;
      } catch (error) {
        console.error("Error checking advertiser status:", error);
        setIsAdvertiser(false);
        return false;
      }
    },
    [programId]
  );

  const disconnectWallet = useCallback(async () => {
    if (window.solana && window.solana.isConnected) {
      await window.solana.disconnect();
    }
    setWalletAddress(null);
    setIsAdvertiser(false);
  }, []);

  const checkUserAccess = useCallback(
    (page) => {
      if (isAdvertiser && ["home", "list", "detail"].includes(page)) {
        console.log("Advertiser accessing user page, disconnecting wallet");
        disconnectWallet();
        return false;
      }
      return true;
    },
    [isAdvertiser, disconnectWallet]
  );

  const checkAndConnectWallet = async (page = "") => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect();
        const address = resp.publicKey.toString();
        console.log("Connected wallet address:", address);
        setWalletAddress(address);

        const isAdv = await checkIsAdvertiser(address);
        console.log("Is advertiser check result:", isAdv);

        if (page === "advertiser") {
          if (isAdv) {
            console.log("Navigating to ad dashboard");
            navigate("/ad-dashboard");
          } else {
            console.log("Not recognized as advertiser");
            alert(
              "You are not recognized as an advertiser. Please check your registration or try again."
            );
            await disconnectWallet();
          }
        } else if (["home", "list", "detail"].includes(page)) {
          if (isAdv) {
            console.log("Advertiser trying to access user pages");
            alert(
              "This wallet is registered for a different role. Your wallet will be disconnected."
            );
            await disconnectWallet();
          } else {
            console.log("Wallet connected successfully");
          }
        }
      } catch (err) {
        console.error("Connection failed:", err);
        alert("Connection failed. Please try again.");
      }
    } else {
      alert("Phantom Wallet is not installed. Please install Phantom Wallet.");
    }
  };

  return (
    <UserContext.Provider
      value={{
        walletAddress,
        isAdvertiser,
        checkAndConnectWallet,
        setWalletAddress,
        disconnectWallet,
        checkUserAccess,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export const WithAuth = ({ children, requireAdvertiser = false, page }) => {
  const { walletAddress, isAdvertiser, checkUserAccess } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (requireAdvertiser && !isAdvertiser) {
      navigate("/");
    } else if (walletAddress) {
      checkUserAccess(page);
    }
  }, [
    walletAddress,
    isAdvertiser,
    requireAdvertiser,
    navigate,
    checkUserAccess,
    page,
  ]);

  return children;
};
