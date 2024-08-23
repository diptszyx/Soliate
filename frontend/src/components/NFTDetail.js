import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { Program, web3, setProvider, AnchorProvider } from "@coral-xyz/anchor";
import { FaCopy } from "react-icons/fa";
import styles from "../styles/NFTDetail.module.css";
import idl from "../idl.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BN from "bn.js";

function NFTDetail({ walletAddress }) {
  const { address } = useParams();
  const [nft, setNft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blinkUrl, setBlinkUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [vaultInfo, setVaultInfo] = useState(null);
  const [isCampaignEnded, setIsCampaignEnded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchVaultInfo = useCallback(
    async (connection) => {
      try {
        const programId = new PublicKey(idl.address);
        const nftAddress = new PublicKey(address);
        const [nftVaultPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("nft_vault"), nftAddress.toBuffer()],
          programId
        );

        const accountInfo = await connection.getAccountInfo(nftVaultPda);

        if (accountInfo === null) {
          console.log("Vault không tồn tại");
          return;
        }

        const program = new Program(idl, programId);
        const decodedAccountInfo = program.coder.accounts.decode(
          "nftVault",
          accountInfo.data
        );

        setVaultInfo({
          balance: decodedAccountInfo.balance.toString(),
          interactionsCount: decodedAccountInfo.interacted.length.toString(),
        });

        setIsCampaignEnded(parseInt(decodedAccountInfo.balance.toString()) === 0);
      } catch (error) {
        console.error("Error fetching vault info:", error);
      }
    },
    [address]
  );

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
        const metaplex = new Metaplex(connection);

        const nftDetails = await metaplex
          .nfts()
          .findByMint({ mintAddress: new PublicKey(address) });
        setNft(nftDetails);

        await fetchVaultInfo(connection);
      } catch (error) {
        console.error("Error fetching details:", error);
        setError("Không thể tải thông tin chi tiết. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [address, fetchVaultInfo]);

  const handleGenerateBlink = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.", {
        position: "top-center",
        autoClose: 1000,
      });
      return;
    }

    setIsGenerating(true);

    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const programId = new PublicKey(idl.address);

      const [actionPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("action"),
          new PublicKey(address).toBuffer(),
          new PublicKey(walletAddress).toBuffer(),
        ],
        programId
      );

      const accountInfo = await connection.getAccountInfo(actionPDA);
      
      if (accountInfo !== null) {
        const blinkUrl = `https://dial.to/?action=solana-action:https://api.soliate.xyz/api/action/${actionPDA.toBase58()}`;
        setBlinkUrl(blinkUrl);
        toast.success("Blink URL retrieved successfully!", {
          position: "top-center",
          autoClose: 2000,
        });
        return;
      }

      const amountForSharer =
        nft.json?.attributes.find((attr) => attr.trait_type === "SOL per Sharer")
          ?.value || "0";
      const amountForInteractor =
        nft.json?.attributes.find(
          (attr) => attr.trait_type === "SOL per Interactor"
        )?.value || "0";

      const amountForSharerLamports = Math.round(
        parseFloat(amountForSharer) * 1e9
      );
      const amountForInteractorLamports = Math.round(
        parseFloat(amountForInteractor) * 1e9
      );

      const provider = new AnchorProvider(connection, window.solana, {
        preflightCommitment: "confirmed",
      });
      setProvider(provider);

      const program = new Program(idl, programId);
      const tx = await program.methods
        .createActionPda(
          new PublicKey(address),
          new PublicKey(walletAddress),
          new BN(amountForSharerLamports),
          new BN(amountForInteractorLamports)
        )
        .accounts({
          actionPda: actionPDA,
          user: new PublicKey(walletAddress),
          mintAddress: new PublicKey(address),
          sharerAddress: new PublicKey(walletAddress),
          systemProgram: web3.SystemProgram.programId,
        })
        .transaction();

      await provider.sendAndConfirm(tx);
      
      const blinkUrl = `https://dial.to/?action=solana-action:https://api.soliate.xyz/api/action/${actionPDA.toBase58()}`;
      setBlinkUrl(blinkUrl);
      
      toast.success("Blink URL generated successfully!", {
        position: "top-center",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error creating or retrieving action PDA:", error);
      toast.error("Failed to generate Blink URL. Please try again.", {
        position: "top-center",
        autoClose: 2000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(blinkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shortenUrl = (url) => {
    return url.length > 30 ? url.substring(0, 30) + "..." : url;
  };

  if (isLoading) return <div className={styles.container}>Đang tải...</div>;
  if (error) return <div className={styles.container}>Lỗi: {error}</div>;
  if (!nft) return <div className={styles.container}>Không tìm thấy NFT</div>;

  return (
    <div className={styles.container}>
      <div className={styles.imageWrapper}>
        <img src={nft.json?.image} alt={nft.name} className={styles.image} />
      </div>

      <div className={styles.details}>
        <h1 className={styles.title}>{nft.name}</h1>
        <p className={styles.description}>{nft.json?.description}</p>
        <ul className={styles.attributesList}>
          {nft.json?.attributes?.map((attr, index) => (
            <li key={index} className={styles.attributeItem}>
              <strong>{attr.trait_type}:</strong> {attr.value}
            </li>
          ))}
        </ul>

        {vaultInfo && (
          <div className={styles.vaultInfo}>
            <p>Remaining Budget: {parseFloat(vaultInfo.balance) / 1e9} SOL</p>
            <p>Interactions: {vaultInfo.interactionsCount}</p>
          </div>
        )}

        <button
          className={styles.button}
          onClick={handleGenerateBlink}
          disabled={isCampaignEnded || isGenerating}
        >
          {isCampaignEnded
            ? "Campaign Ended"
            : isGenerating
            ? "Generating..."
            : "Generate Blink"}
        </button>

        {blinkUrl && (
          <div className={styles.linkWrapper}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <a
                href={blinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                {shortenUrl(blinkUrl)}
              </a>
              <button onClick={handleCopyUrl} className={styles.copyButton}>
                <FaCopy size={20} color="#000000" />
              </button>
              {copied && <span className={styles.copiedText}>Copied!</span>}
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default NFTDetail;