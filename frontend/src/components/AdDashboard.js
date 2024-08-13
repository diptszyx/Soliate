import React, { useState, useEffect } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { BorshAccountsCoder, web3 } from "@coral-xyz/anchor";
import { Metaplex } from "@metaplex-foundation/js";
import { Link } from "react-router-dom";
import idl from "../idl.json";

const programId = new PublicKey(idl.address);

function AdDashboard({ walletAddress }) {
  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUserNFTs() {
      if (walletAddress) {
        setIsLoading(true);
        setError(null);
        try {
          const connection = new Connection(
            clusterApiUrl("devnet"),
            "confirmed"
          );
          const metaplex = new Metaplex(connection);

          const [userNftListPda] = web3.PublicKey.findProgramAddressSync(
            [
              Buffer.from("user_nft_list"),
              new PublicKey(walletAddress).toBuffer(),
            ],
            programId
          );

          const accountInfo = await connection.getAccountInfo(userNftListPda);
          if (!accountInfo) {
            console.log("You haven't created any campaigns yet.");
            return;
          }

          const coder = new BorshAccountsCoder(idl);
          const decodedAccount = coder.decode("UserNFTList", accountInfo.data);

          const nftDetails = await Promise.all(
            decodedAccount.nfts.map(async (nftAddress) => {
              try {
                const nft = await metaplex
                  .nfts()
                  .findByMint({ mintAddress: new PublicKey(nftAddress) });
                return {
                  address: nftAddress.toBase58(),
                  name: nft.name,
                  image: nft.json?.image || "https://via.placeholder.com/150",
                  description: nft.json?.description || "Không có mô tả",
                };
              } catch (error) {
                console.error(
                  `Lỗi khi lấy thông tin NFT ${nftAddress}:`,
                  error
                );
                return {
                  address: nftAddress.toBase58(),
                  name: "Không thể tải",
                  image: "https://via.placeholder.com/150",
                  description: "Không thể tải thông tin",
                };
              }
            })
          );

          setNfts(nftDetails);
        } catch (error) {
          console.error("Lỗi khi lấy danh sách NFT của user:", error);
          setError(
            "Có lỗi xảy ra khi tải danh sách NFT. Vui lòng thử lại sau."
          );
        } finally {
          setIsLoading(false);
        }
      } else {
        setError("Vui lòng kết nối ví để xem danh sách NFT của bạn.");
        setIsLoading(false);
      }
    }

    fetchUserNFTs();
  }, [walletAddress]);

  if (isLoading) {
    return <div className="loading">Đang tải danh sách NFT của bạn...</div>;
  }

  if (error) {
    return <div className="error">Lỗi: {error}</div>;
  }

  return (
    <div className="ad-dashboard">
      <h1 className="dashboard-title">Your Campaigns</h1>
      <br />
      <div className="nft-grid">
        {nfts.map((nft) => (
          <div key={nft.address} className="nft-card">
            <div className="nft-image-container">
              <img src={nft.image} alt={nft.name} className="nft-image" />
            </div>
            <div className="nft-info">
              <h3 className="nft-name">{nft.name}</h3>
              <p className="nft-description">{nft.description}</p>
              <Link to={`/nft/${nft.address}`} className="nft-link">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdDashboard;
