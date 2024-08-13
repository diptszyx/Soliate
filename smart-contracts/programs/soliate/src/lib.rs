use anchor_lang::prelude::*;

declare_id!("48gkhnh44Voi4ZuHbNDyeCWWH5dKNJrjmRXvbYwvKjxt");

#[program]
pub mod soliate {
    use super::*;

    pub fn initialize_global_list(ctx: Context<InitializeGlobalList>) -> Result<()> {
        let global_nft_list = &mut ctx.accounts.global_nft_list;
        global_nft_list.nfts = Vec::new();
        Ok(())
    }

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_nft_list = &mut ctx.accounts.user_nft_list;
        user_nft_list.user = ctx.accounts.user.key();
        user_nft_list.nfts = Vec::new();
        Ok(())
    }

    pub fn add_nft(ctx: Context<AddNFT>, nft_address: Pubkey) -> Result<()> {
        let user_nft_list = &mut ctx.accounts.user_nft_list;
        let global_nft_list = &mut ctx.accounts.global_nft_list;
        
        user_nft_list.nfts.push(nft_address);
        global_nft_list.nfts.push(nft_address);
        Ok(())
    }

    pub fn initialize_nft_vault(ctx: Context<InitializeNFTVault>, initial_balance: u64) -> Result<()> {
        let nft_vault = &mut ctx.accounts.nft_vault;
        nft_vault.nft = ctx.accounts.nft.key();
        nft_vault.owner = ctx.accounts.owner.key();
        nft_vault.balance = initial_balance;
        nft_vault.interacted = Vec::new();

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

    pub fn withdraw_from_vault(
        ctx: Context<WithdrawFromVault>,
        amount1: u64,
        amount2: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.nft_vault;
        let interactor_key = ctx.accounts.interactor.key();

        if vault.interacted.contains(&interactor_key) {
            return Err(ErrorCode::AlreadyInteracted.into());
        }

        let total_amount = amount1.checked_add(amount2).ok_or(ErrorCode::OverflowError)?;

        if vault.balance < total_amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        **vault.to_account_info().try_borrow_mut_lamports()? -= amount1;
        **ctx.accounts.sharer.try_borrow_mut_lamports()? += amount1;

        **vault.to_account_info().try_borrow_mut_lamports()? -= amount2;
        **ctx.accounts.interactor.try_borrow_mut_lamports()? += amount2;

        vault.balance -= total_amount;
        vault.interacted.push(interactor_key);

        Ok(())
    }

    pub fn register_advertiser(
        ctx: Context<RegisterAdvertiser>,
        name: String,
        email: String,
        company: Option<String>,
        website: Option<String>,
    ) -> Result<()> {
        if name.is_empty() || email.is_empty() {
            return Err(ErrorCode::InvalidAdvertiserData.into());
        }

        let advertiser = &mut ctx.accounts.advertiser;
        advertiser.name = name;
        advertiser.email = email;
        advertiser.company = company;
        advertiser.website = website;
        Ok(())
    }
    
    pub fn get_vault_info(ctx: Context<GetVaultInfo>) -> Result<(u64, u64)> {
        let vault = &ctx.accounts.nft_vault;
        Ok((vault.balance, vault.interacted.len() as u64))
    }
}

#[derive(Accounts)]
pub struct InitializeGlobalList<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 4 + (100 * 32),
        seeds = [b"global_nft_list"],
        bump
    )]
    pub global_nft_list: Account<'info, GlobalNFTList>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + (5 * 32),
        seeds = [b"user_nft_list", user.key().as_ref()],
        bump
    )]
    pub user_nft_list: Account<'info, UserNFTList>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

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

#[derive(Accounts)]
pub struct InitializeNFTVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 4 + (100 * 32), // Cấp phát không gian cho 1000 interactor
        seeds = [b"nft_vault", nft.key().as_ref()],
        bump
    )]
    pub nft_vault: Account<'info, NFTVault>,
    /// CHECK: Chỉ sử dụng làm seed, không đọc hoặc ghi
    pub nft: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

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

#[derive(Accounts)]
pub struct RegisterAdvertiser<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 32,
        seeds = [b"advertiser", authority.key().as_ref()],
        bump
    )]
    pub advertiser: Account<'info, Advertiser>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetVaultInfo<'info> {
    #[account(
        seeds = [b"nft_vault", nft.key().as_ref()],
        bump
    )]
    pub nft_vault: Account<'info, NFTVault>,
    /// CHECK: Chỉ sử dụng làm seed, không đọc hoặc ghi
    pub nft: AccountInfo<'info>,
}

#[account]
pub struct UserNFTList {
    pub user: Pubkey,
    pub nfts: Vec<Pubkey>,
}

#[account]
pub struct GlobalNFTList {
    pub nfts: Vec<Pubkey>,
}

#[account]
pub struct NFTVault {
    pub nft: Pubkey,
    pub owner: Pubkey,
    pub balance: u64,
    pub interacted: Vec<Pubkey>,
}

#[account]
pub struct Advertiser {
    pub name: String,
    pub email: String,
    pub company: Option<String>,
    pub website: Option<String>,
}


#[error_code]
pub enum ErrorCode {
    #[msg("Không đủ tiền trong vault")]
    InsufficientFunds,
    #[msg("Lỗi tràn số khi cộng số tiền")]
    OverflowError,
    #[msg("Dữ liệu người đăng quảng cáo không hợp lệ")]
    InvalidAdvertiserData,
    #[msg("Người dùng không được phép thực hiện hành động này")]
    NotAuthorized,
    #[msg("Interactor đã nhận tiền từ vault này")]
    AlreadyInteracted,
}