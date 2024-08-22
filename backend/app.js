const express = require("express");
const { ACTIONS_CORS_HEADERS } = require("@solana/actions");
const {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const { Program, web3 } = require("@coral-xyz/anchor");
const { Metaplex } = require("@metaplex-foundation/js");
const BN = require("bn.js");
const idl = require("./idl.json");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Middleware để thêm CORS headers
app.use((req, res, next) => {
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// Hàm lấy chi tiết NFT
async function getNFTDetails(mintAddress) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const metaplex = new Metaplex(connection);

  try {
    const nftDetails = await metaplex
      .nfts()
      .findByMint({ mintAddress: new PublicKey(mintAddress) });
    return nftDetails;
  } catch (error) {
    console.error("Error fetching NFT details:", error);
    throw error;
  }
}

app
  .route("/api/action/:pda")
  .get(async (req, res) => {
    const actionPDA = req.params.pda;
    console.log("Received PDA:", actionPDA);

    if (!actionPDA) {
      return res.status(400).json({ error: "Missing PDA parameter" });
    }

    try {
      const connection = new Connection(clusterApiUrl("devnet"));
      const programId = new PublicKey(idl.address);
      const program = new Program(idl, programId);

      // Lấy thông tin tài khoản
      const accountInfo = await connection.getAccountInfo(
        new PublicKey(actionPDA)
      );

      if (!accountInfo) {
        return res.status(404).json({ error: "Action PDA not found" });
      }

      // Giải mã dữ liệu tài khoản
      const decodedAccountInfo = program.coder.accounts.decode(
        "actionData",
        accountInfo.data
      );

      const {
        mintAddress,
        sharerAddress,
        amountForSharer,
        amountForInteractor,
      } = decodedAccountInfo;

      console.log("Decoded Info:", {
        mintAddress: mintAddress.toBase58(),
        sharerAddress: sharerAddress.toBase58(),
        amountForSharer: amountForSharer.toString(),
        amountForInteractor: amountForInteractor.toString(),
      });

      // Lấy thông tin NFT
      const nftDetails = await getNFTDetails(mintAddress);

      const responseBody = {
        icon: nftDetails.json?.image || "",
        description: nftDetails.json?.description || "",
        title: nftDetails.name || "NFT Action",
        label: "Claim Reward",
      };

      res.json(responseBody);
    } catch (error) {
      console.error("Error in GET request:", error);
      res.status(500).json({ error: "Failed to fetch action details" });
    }
  })
  .post(async (req, res) => {
    const actionPDA = req.params.pda;
    const userPubkey = req.body.account;

    if (!actionPDA) {
      return res.status(400).json({ error: "Missing PDA parameter" });
    }

    const connection = new Connection(clusterApiUrl("devnet"));
    const programId = new PublicKey(idl.address);
    const program = new Program(idl, programId);

    try {
      // Tìm PDA
      const [nftActionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("action"), new PublicKey(actionPDA).toBuffer()],
        programId
      );

      // Lấy thông tin tài khoản
      const accountInfo = await connection.getAccountInfo(nftActionPda);

      if (!accountInfo) {
        return res.status(404).json({ error: "Action PDA not found" });
      }

      // Giải mã dữ liệu tài khoản
      const decodedAccountInfo = program.coder.accounts.decode(
        "actionData",
        accountInfo.data
      );

      const {
        mintAddress,
        sharerAddress,
        amountForSharer,
        amountForInteractor,
      } = decodedAccountInfo;

      // Kiểm tra xem user có phải là sharer không
      if (userPubkey === sharerAddress.toString()) {
        return res.status(400).json({
          error: "Invalid wallet address",
          message:
            "The sharer's wallet address is not eligible to claim the reward. Please use a different wallet.",
        });
      }

      const [nftVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft_vault"), mintAddress.toBuffer()],
        programId
      );

      const vaultAccountInfo = await connection.getAccountInfo(nftVaultPda);

      if (!vaultAccountInfo) {
        return res
          .status(400)
          .json({ error: "NFT Vault account does not exist" });
      }

      const decodedVaultInfo = program.coder.accounts.decode(
        "nftVault",
        vaultAccountInfo.data
      );

      if (
        decodedVaultInfo.interacted.some((addr) =>
          addr.equals(new PublicKey(userPubkey))
        )
      ) {
        return res.status(400).json({
          error: "Already claimed",
          message:
            "You have already claimed the reward for this NFT. Each wallet can only claim once.",
        });
      }

      // If not claimed, proceed with creating the transaction
      const tx = new Transaction();

      const withdrawIx = await program.methods
        .withdrawFromVault(new BN(amountForSharer), new BN(amountForInteractor))
        .accounts({
          nftVault: nftVaultPda,
          nft: mintAddress,
          sharer: sharerAddress,
          interactor: new PublicKey(userPubkey),
          systemProgram: web3.SystemProgram.programId,
        })
        .instruction();
      tx.add(withdrawIx);
      tx.feePayer = new PublicKey(userPubkey);

      const bh = (
        await connection.getLatestBlockhash({ commitment: "finalized" })
      ).blockhash;
      console.log("using blockhash " + bh);
      tx.recentBlockhash = bh;

      const serialTX = tx
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");
      const response = {
        transaction: serialTX,
        message: "Transaction created for withdrawing from vault",
      };
      res.json(response);
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({
        error: "Failed to process withdrawal",
        message: error.message,
      });
    }
  });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
