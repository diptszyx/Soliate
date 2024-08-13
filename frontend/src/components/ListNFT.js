import React, { useState, useEffect } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { Metaplex } from "@metaplex-foundation/js";
import { Link } from "react-router-dom";
import idl from "../idl.json";
import "../styles/NFTList.css";

const programId = new PublicKey(idl.address);

function NFTList() {
  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNFTs();
  }, []);

  async function fetchNFTs() {
    setIsLoading(true);
    setError(null);
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const metaplex = new Metaplex(connection);

      const [globalNftListPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("global_nft_list")],
        programId
      );

      const accountInfo = await connection.getAccountInfo(globalNftListPda);
      if (!accountInfo) {
        throw new Error("Không tìm thấy tài khoản GlobalNFTList");
      }

      const coder = new BorshAccountsCoder(idl);
      const decodedAccount = coder.decode("GlobalNFTList", accountInfo.data);

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
            console.error(`Lỗi khi lấy thông tin NFT ${nftAddress}:`, error);
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
      console.error("Lỗi khi lấy danh sách NFT:", error);
      setError("Có lỗi xảy ra khi tải danh sách NFT. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="loading">Đang tải danh sách NFT...</div>;
  }

  if (error) {
    return <div className="error">Lỗi: {error}</div>;
  }

  return (
    <div className="nft-list-page">
      <h1 className="page-title">List Campains</h1>
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

export default NFTList;
