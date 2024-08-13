import React, { useState } from "react";
import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { useNavigate } from "react-router-dom";
import idl from "../idl.json";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import "../styles/AdvertiserForm.css";

const programId = new PublicKey(idl.address);

function AdvertiserForm({ walletAddress, connectWallet }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    website: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      await connectWallet();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const provider = new AnchorProvider(connection, window.solana, {
        preflightCommitment: "confirmed",
      });
      const program = new Program(idl, programId);

      const [advertiserPDA] = await PublicKey.findProgramAddressSync(
        [Buffer.from("advertiser"), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const tx = await program.methods
        .registerAdvertiser(
          formData.name,
          formData.email,
          formData.company || null,
          formData.website || null
        )
        .accounts({
          advertiser: advertiserPDA,
          authority: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .transaction();

      await provider.sendAndConfirm(tx);
      console.log("Advertiser PDA:", advertiserPDA.toString());
      setSuccess(true);
      navigate("/ad-dashboard");
      setFormData({ name: "", email: "", company: "", website: "" });
    } catch (err) {
      console.error("Transaction error: ", err);
      setError(err.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="advertiser-form">
        <h2>Advertiser Registration</h2>
        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">Registration successful!</div>
        )}
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="company">
            Company: <span className="optional">(optional)</span>
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="website">
            Website: <span className="optional">(optional)</span>
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}

export default AdvertiserForm;
