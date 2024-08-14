import "../styles/CreateNFTPage.css";
import React, { useState, useEffect } from "react";
import {
  Metaplex,
  walletAdapterIdentity,
  irysStorage,
} from "@metaplex-foundation/js";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import { WebIrys } from "@irys/sdk";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { useNavigate } from "react-router-dom";
import { AnchorProvider, Program, setProvider, web3 } from "@coral-xyz/anchor";
import idl from "../idl.json";
import BN from "bn.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const programId = new PublicKey(idl.address);

function CreateNFTPage({ walletAddress, connectWallet }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [phantomAdapter] = useState(() => new PhantomWalletAdapter());
  const [solAmount, setSolAmount] = useState("");
  const [numberOfParticipants, setNumberOfParticipants] = useState("");
  const [sharePercentage, setSharePercentage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const autoConnectWallet = async () => {
      if (!walletAddress) {
        await connectWallet();
      }
    };
    autoConnectWallet();
  }, [walletAddress, connectWallet]);

  const calculateParticipantShare = () => {
    const totalSol = parseFloat(solAmount) || 0;
    const participants = parseInt(numberOfParticipants) || 1;
    return participants > 0 ? totalSol / participants : 0;
  };

  const calculateShares = () => {
    const participantShare = calculateParticipantShare();
    const sharerShare =
      (participantShare * (parseFloat(sharePercentage) || 0)) / 100;
    const viewerShare = participantShare - sharerShare;
    return {
      sharerShare: sharerShare >= 0 ? sharerShare : 0,
      viewerShare: viewerShare >= 0 ? viewerShare : 0,
    };
  };

  const { sharerShare, viewerShare } = calculateShares();

  const getIrys = async () => {
    const network = "devnet";
    const token = "solana";
    const rpcUrl = clusterApiUrl("devnet");
    await phantomAdapter.connect();

    const wallet = {
      rpcUrl: rpcUrl,
      name: "phantom",
      provider: phantomAdapter,
    };

    const webIrys = new WebIrys({ network, token, wallet });
    await webIrys.ready();

    return webIrys;
  };

  async function fundIrysWithRetry(irys, amount) {
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const fundTx = await irys.fund(amount);
        console.log("Funding transaction sent:", fundTx);
        return fundTx;
      } catch (error) {
        console.error(`Funding attempt ${i + 1} failed:`, error);
        if (i === MAX_RETRIES - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  const uploadToIrys = async (file) => {
    if (!file) throw new Error("No file selected");
    console.log("Starting Irys upload...");
    const irys = await getIrys();

    try {
      const balance = await irys.getLoadedBalance();
      const price = await irys.getPrice(file.size);
      if (balance.isLessThan(price)) {
        console.log("Funding Irys wallet...");
        const fundingAmount = Math.ceil(
          price.minus(balance).multipliedBy(1.1).toNumber()
        );
        await fundIrysWithRetry(irys, fundingAmount);
      }

      const tags = [{ name: "Content-Type", value: file.type }];
      const receipt = await irys.uploadFile(file, { tags });
      console.log("Irys upload receipt:", receipt);
      return `https://arweave.net/${receipt.id}`;
    } catch (error) {
      console.error("Error uploading to Irys:", error);
      throw error;
    }
  };

  const initializeEverything = async (
    nft,
    metadataUri,
    solAmount,
    walletAddress
  ) => {
    const program = new Program(idl, programId);
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const provider = new AnchorProvider(connection, window.solana, {
      preflightCommitment: "confirmed",
    });
    setProvider(provider);

    const [globalNftListPda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_nft_list")],
      program.programId
    );
    const [userNftListPda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_nft_list"), new PublicKey(walletAddress).toBuffer()],
      program.programId
    );
    const [nftVaultPda] = await web3.PublicKey.findProgramAddressSync(
      [Buffer.from("nft_vault"), nft.address.toBuffer()],
      program.programId
    );

    const transaction = new Transaction();

    // Check if GlobalNFT list exists
    const accountGlobal = await connection.getAccountInfo(globalNftListPda);
    if (accountGlobal === null) {
      transaction.add(
        program.instruction.initializeGlobalList({
          accounts: {
            globalNftList: globalNftListPda,
            authority: walletAddress,
            systemProgram: web3.SystemProgram.programId,
          },
        })
      );
    }

    // Check if UserNFT list exists
    const accountUser = await connection.getAccountInfo(userNftListPda);
    if (accountUser === null) {
      transaction.add(
        program.instruction.initializeUser({
          accounts: {
            userNftList: userNftListPda,
            user: walletAddress,
            systemProgram: web3.SystemProgram.programId,
          },
        })
      );
    }

    // Initialize NFT Vault
    const solAmountLamports = parseInt(solAmount) * web3.LAMPORTS_PER_SOL;
    transaction.add(
      program.instruction.initializeNftVault(new BN(solAmountLamports), {
        accounts: {
          nftVault: nftVaultPda,
          nft: nft.address,
          owner: walletAddress,
          systemProgram: web3.SystemProgram.programId,
        },
      })
    );

    // Add NFT to lists
    transaction.add(
      program.instruction.addNft(nft.address, {
        accounts: {
          userNftList: userNftListPda,
          globalNftList: globalNftListPda,
          user: walletAddress,
        },
      })
    );

    // Send and confirm the combined transaction
    const txSignature = await provider.sendAndConfirm(transaction);

    return { nftVaultPda, txSignature };
  };

  const handleCreateNFT = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.", {
        position: "top-center",
        autoClose: 3000,
      });
      await connectWallet();
      return;
    }

    if (!image || !(image instanceof File)) {
      toast.error("Please select a valid image file.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (parseInt(solAmount) < 1) {
      toast.error("Please enter a valid SOL amount (minimum 1 SOL).", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setIsCreating(true);
    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const metaplex = Metaplex.make(connection)
        .use(walletAdapterIdentity(phantomAdapter))
        .use(
          irysStorage({
            address: "https://devnet.irys.xyz",
            providerUrl: "https://api.devnet.solana.com",
            timeout: 60000,
          })
        );

      console.log("Uploading image and metadata to Irys...");
      const imageUrl = await uploadToIrys(image);
      const metadata = {
        name: name,
        description: description,
        image: imageUrl,
        attributes: [
          { trait_type: "Total Campaign Budget", value: `${solAmount} SOL` },
          { trait_type: "Target Participants", value: numberOfParticipants },
          {
            trait_type: "SOL per Sharer",
            value: `${sharerShare.toFixed(4)} SOL`,
          },
          {
            trait_type: "SOL per Interactor",
            value: `${viewerShare.toFixed(4)} SOL`,
          },
        ],
      };
      const { uri: metadataUri } = await metaplex
        .nfts()
        .uploadMetadata(metadata);
      console.log("Metadata uploaded:", metadataUri);

      console.log("Creating NFT...");
      const { nft } = await metaplex.nfts().create(
        {
          uri: metadataUri,
          name: name,
          sellerFeeBasisPoints: 500,
        },
        { commitment: "finalized" }
      );
      console.log("NFT created:", nft);

      console.log("Initializing everything...");
      const { nftVaultPda, txSignature } = await initializeEverything(
        nft,
        metadataUri,
        solAmount,
        walletAddress
      );

      console.log("NFT Vault initialized and funded");
      console.log("Vault Transaction Signature:", txSignature);
      console.log("Vault Address:", nftVaultPda.toString());
      console.log(
        "View on Solana Explorer:",
        `https://explorer.solana.com/address/${nftVaultPda.toString()}?cluster=devnet`
      );

      toast.success(
        `NFT created, added to lists, and vault initialized successfully!\n\nVault Address: ${nftVaultPda.toString()}\n\nView on Solana Explorer: https://explorer.solana.com/address/${nftVaultPda.toString()}?cluster=devnet`,
        {
          position: "top-center",
          autoClose: 5000,
        }
      );
      navigate("/ad-dashboard");
    } catch (error) {
      console.error("Error creating NFT:", error);
      toast.error(`Error creating NFT: ${error.message}`, {
        position: "top-center",
        autoClose: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <main>
        <div className="create-nft-form">
          <h2>Create Campaign</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign Name"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          <input type="file" onChange={(e) => setImage(e.target.files[0])} />
          <input
            type="number"
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            placeholder="Total SOL Amount"
            min="1"
            step="1"
          />
          <input
            type="number"
            value={numberOfParticipants}
            onChange={(e) => setNumberOfParticipants(e.target.value)}
            placeholder="Number of Participants"
            min="1"
            step="1"
          />
          <input
            type="number"
            value={sharePercentage}
            onChange={(e) => setSharePercentage(e.target.value)}
            placeholder="Percentage for Sharer"
            min="0"
            max="100"
            step="1"
          />
          <div>
            <p>
              Each Participant (including sharer and viewer) will receive:{" "}
              {calculateParticipantShare()} SOL
            </p>
            <p>Sharer will receive: {sharerShare} SOL</p>
            <p>Viewer will receive: {viewerShare} SOL</p>
          </div>
          <button onClick={handleCreateNFT} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create NFT"}
          </button>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}

export default CreateNFTPage;
