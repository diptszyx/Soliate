use anchor_lang::prelude::*;

declare_id!("9xjZwkGTG2xkVbxequat9xhocAyXeSxRw3fo3MF4ENmL");

#[program]
pub mod soliate {
    use super::*;

    // Khởi tạo danh sách NFT toàn cục
    pub fn initialize_global_list(ctx: Context<InitializeGlobalList>) -> Result<()> {
        let global_nft_list = &mut ctx.accounts.global_nft_list;
        global_nft_list.nfts = Vec::new();
        Ok(())
    }

    // Khởi tạo danh sách NFT cho người dùng
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_nft_list = &mut ctx.accounts.user_nft_list;
        user_nft_list.user = ctx.accounts.user.key();
        user_nft_list.nfts = Vec::new();
        Ok(())
    }

    // Thêm NFT vào danh sách của người dùng và danh sách toàn cục
    pub fn add_nft(ctx: Context<AddNFT>, nft_address: Pubkey) -> Result<()> {
        let user_nft_list = &mut ctx.accounts.user_nft_list;
        let global_nft_list = &mut ctx.accounts.global_nft_list;
        
        user_nft_list.nfts.push(nft_address);
        global_nft_list.nfts.push(nft_address);
        Ok(())
    }

    // Khởi tạo NFT Vault
    pub fn initialize_nft_vault(ctx: Context<InitializeNFTVault>, initial_balance: u64) -> Result<()> {
        let nft_vault = &mut ctx.accounts.nft_vault;
        nft_vault.nft = ctx.accounts.nft.key();
        nft_vault.owner = ctx.accounts.owner.key();
        nft_vault.balance = initial_balance;

        // Chuyển SOL từ chủ sở hữu vào vault
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.owner.key(),
            &ctx.accounts.nft_vault.key(),
            initial_balance,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.nft_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    // Rút tiền từ Vault và chuyển cho hai người
    pub fn withdraw_from_vault(
        ctx: Context<WithdrawFromVault>,
        amount1: u64,
        amount2: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.nft_vault;
        let total_amount = amount1.checked_add(amount2).ok_or(ErrorCode::OverflowError)?;

        if vault.balance < total_amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // Chuyển tiền cho người chia sẻ NFT
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount1;
        **ctx.accounts.sharer.try_borrow_mut_lamports()? += amount1;

        // Chuyển tiền cho người tương tác
        **vault.to_account_info().try_borrow_mut_lamports()? -= amount2;
        **ctx.accounts.interactor.try_borrow_mut_lamports()? += amount2;

        // Cập nhật số dư của vault
        vault.balance -= total_amount;

        Ok(())
    }
}

// Cấu trúc để khởi tạo danh sách NFT toàn cục
#[derive(Accounts)]
pub struct InitializeGlobalList<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + (100 * 32), // Điều chỉnh kích thước nếu cần
        seeds = [b"global_nft_list"],
        bump
    )]
    pub global_nft_list: Account<'info, GlobalNFTList>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Cấu trúc để khởi tạo danh sách NFT cho người dùng
#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + (5 * 32), // Điều chỉnh kích thước nếu cần
        seeds = [b"user_nft_list", user.key().as_ref()],
        bump
    )]
    pub user_nft_list: Account<'info, UserNFTList>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// Cấu trúc để thêm NFT vào danh sách
#[derive(Accounts)]
pub struct AddNFT<'info> {
    #[account(
        mut,
        seeds = [b"user_nft_list", user.key().as_ref()],
        bump,
        has_one = user
    )]
    pub user_nft_list: Account<'info, UserNFTList>,
    #[account(
        mut,
        seeds = [b"global_nft_list"],
        bump
    )]
    pub global_nft_list: Account<'info, GlobalNFTList>,
    pub user: Signer<'info>,
}

// Cấu trúc để khởi tạo NFT Vault
#[derive(Accounts)]
pub struct InitializeNFTVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8,
        seeds = [b"nft_vault", nft.key().as_ref()],
        bump
    )]
    pub nft_vault: Account<'info, NFTVault>,
    /// CHECK: Chỉ sử dụng làm seed, không đọc hoặc ghi
    pub nft: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// Cấu trúc để rút tiền từ Vault
#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
    #[account(
        mut,
        seeds = [b"nft_vault", nft.key().as_ref()],
        bump
    )]
    pub nft_vault: Account<'info, NFTVault>,
    /// CHECK: Chỉ sử dụng làm seed, không đọc hoặc ghi
    pub nft: AccountInfo<'info>,
    /// CHECK: Tài khoản người chia sẻ NFT
    #[account(mut)]
    pub sharer: AccountInfo<'info>,
    /// CHECK: Tài khoản người tương tác
    #[account(mut)]
    pub interactor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

// Định nghĩa cấu trúc danh sách NFT của người dùng
#[account]
pub struct UserNFTList {
    pub user: Pubkey,
    pub nfts: Vec<Pubkey>,
}

// Định nghĩa cấu trúc danh sách NFT toàn cục
#[account]
pub struct GlobalNFTList {
    pub nfts: Vec<Pubkey>,
}

// Định nghĩa cấu trúc NFT Vault
#[account]
pub struct NFTVault {
    pub nft: Pubkey,
    pub owner: Pubkey,
    pub balance: u64,
}

// Định nghĩa mã lỗi
#[error_code]
pub enum ErrorCode {
    #[msg("Không đủ tiền trong vault")]
    InsufficientFunds,
    #[msg("Lỗi tràn số khi cộng số tiền")]
    OverflowError,
}