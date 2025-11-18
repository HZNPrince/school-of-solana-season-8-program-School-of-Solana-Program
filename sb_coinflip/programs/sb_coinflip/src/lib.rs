use anchor_lang::prelude::*;
use anchor_lang::system_program;
use switchboard_on_demand::RandomnessAccountData;

declare_id!("9WZbqYGMxAfaybk5m56J6yuYUW1ryyguSvJEtA884t8o");

#[program]
pub mod sb_coinflip {
    use anchor_lang::system_program::Transfer;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, transfer_amount: u64) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);

        let signer = &mut ctx.accounts.signer;
        let player_stats = &mut ctx.accounts.player_stats;

        if signer.to_account_info().get_lamports() < transfer_amount {
            return Err(CoinFlipError::InsufficientBalance.into());
        }

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: signer.to_account_info(),
                    to: player_stats.to_account_info(),
                },
            ),
            transfer_amount,
        )?;

        player_stats.allowed_user = signer.key();
        player_stats.bump = ctx.bumps.player_stats;
        player_stats.randomness_account = Pubkey::default();
        player_stats.wager_balance += transfer_amount;
        msg!("Initialize Function tranfer from signer to wallet successful");
        msg!("Player balance : {}", player_stats.wager_balance);

        Ok(())
    }

    pub fn coin_flip(
        ctx: Context<CoinFlip>,
        randomness_account: Pubkey,
        wagered_amount: u64,
        current_guess: String,
    ) -> Result<()> {
        let player_stats = &mut ctx.accounts.player_stats;
        player_stats.current_guess = current_guess;

        if player_stats.wager_balance < wagered_amount {
            return Err(CoinFlipError::InsufficientUserWagarBalance.into());
        }
        // track the wagered amount
        player_stats.wagered_amount = wagered_amount;
        player_stats.wager_balance -= wagered_amount;

        // The switchboard randomness function
        let clock = Clock::get()?;
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();

        if randomness_data.seed_slot > clock.slot {
            return Err(CoinFlipError::RandomnessAlreadyRevealed.into());
        }
        // Track the player's commited values so you know they don't request randomness
        // multiple times.
        player_stats.commit_slot = randomness_data.seed_slot;

        let player_key = player_stats.allowed_user;
        let signer_seeds: &[&[&[u8]]] =
            &[&[b"stats".as_ref(), player_key.as_ref(), &[player_stats.bump]]];

        // ***
        // IMPORTANT: Remember, in Switchboard Randomness, it's the responsibility of the caller to reveal the randomness.
        // Therefore, the game collateral MUST be taken upon randomness request, not on reveal.
        // ***
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: player_stats.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            wagered_amount,
        )?;

        // Store flip commit
        player_stats.randomness_account = randomness_account;

        // Log the result
        msg!("Coin flip initiated, randomness requested.");

        Ok(())
    }

    pub fn settle_flip(ctx: Context<SettleFlip>) -> Result<()> {
        let clock = Clock::get()?;
        let player = &mut ctx.accounts.player_stats;

        // Verify that the provided randomness account matches the stored one
        if ctx.accounts.randomness_account_data.key() != player.randomness_account {
            return Err(CoinFlipError::RandomnessAccountMismatch.into());
        }

        // call the switchboard on-demand parse function to get the randomness data
        let randomness_account =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();

        if randomness_account.seed_slot != player.commit_slot {
            return Err(CoinFlipError::RandomnessExpired.into());
        }
        // call the switchboard on-demand get-valu function to get the revealed random value
        let revealed_random_value = randomness_account
            .get_value(clock.slot)
            .map_err(|_| CoinFlipError::RandomnessNotResolved)?;

        // Use the revealed random value to determine the switch result
        let randomness_result = revealed_random_value[0] % 2 == 0;

        // Update and log the result
        if randomness_result {
            player.random_guess_result = "Heads".to_string();
            msg!("Random Result : Heads ! ");
        } else {
            player.random_guess_result = String::from("Tails");
            msg!("Random Result : Tails ! ");
        }

        let escrow_seeds: &[&[&[u8]]] = &[&[b"escrow_vault".as_ref(), &[ctx.bumps.escrow]]];

        // Transfer if the User won and Log if the User lose
        if player.current_guess == player.random_guess_result {
            msg!("You Win !");
            let rent = Rent::get()?;
            let needed_lamports =
                player.wagered_amount * 2 + rent.minimum_balance(ctx.accounts.escrow.data_len());

            if needed_lamports > ctx.accounts.escrow.lamports() {
                return Err(CoinFlipError::EscrowFundError.into());
            } else {
                system_program::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.system_program.to_account_info(),
                        system_program::Transfer {
                            from: ctx.accounts.escrow.to_account_info(),
                            to: player.to_account_info(),
                        },
                        escrow_seeds,
                    ),
                    player.wagered_amount * 2,
                )?;
                player.wager_balance += player.wagered_amount * 2;
            }
        } else {
            msg!("You lost , try again ! ");
        }

        // Player_stat resets
        player.wagered_amount = 0;
        player.current_guess = "".to_string();
        player.random_guess_result = "".to_string();
        player.randomness_account = Pubkey::default();
        player.commit_slot = 0;

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, transfer_amount: u64) -> Result<()> {
        let signer = &ctx.accounts.signer;
        let player_stats = &mut ctx.accounts.player_stats;

        // 1. Check if user has enough SOL
        if signer.to_account_info().get_lamports() < transfer_amount {
            return Err(CoinFlipError::InsufficientBalance.into());
        }

        // 2. Transfer SOL from User -> PlayerStats PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: signer.to_account_info(),
                    to: player_stats.to_account_info(),
                },
            ),
            transfer_amount,
        )?;

        // 3. Update the internal balance tracker
        player_stats.wager_balance += transfer_amount;

        msg!(
            "Deposit successful. New balance: {}",
            player_stats.wager_balance
        );
        Ok(())
    }

    pub fn close_account(ctx: Context<CloseAccount>) -> Result<()> {
        msg!("Player stats account closed and lamports refunded to signer.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer= signer,
        space = 8 + PlayerStats::INIT_SPACE,
        seeds = [b"stats".as_ref(), signer.key().as_ref()],
        bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CoinFlip<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stats".as_ref(), user.key().as_ref()],
        bump = player_stats.bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    /// CHECK: This account is just to hold sol(lamports)
    #[account(
        mut,
        seeds = [b"escrow_vault".as_ref()],
        bump,
    )]
    pub escrow: AccountInfo<'info>,

    /// CHECK: This account's data is validated within the handler
    pub randomness_account_data: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleFlip<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"stats".as_ref(), user.key().as_ref()],
        bump = player_stats.bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    /// CHECK: This account is just to hold sol(lamports)
    #[account(
        mut,
        seeds = [b"escrow_vault".as_ref()],
        bump,
    )]
    pub escrow: AccountInfo<'info>,

    /// CHECK: This account's data is validated within the handler
    pub randomness_account_data: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut, // <-- Important: 'mut' means "edit existing", not 'init'
        seeds = [b"stats".as_ref(), signer.key().as_ref()],
        bump = player_stats.bump, // Verify this is the correct PDA
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct PlayerStats {
    allowed_user: Pubkey,
    randomness_account: Pubkey,
    #[max_len(30)]
    random_guess_result: String,
    #[max_len(30)]
    current_guess: String,
    wager_balance: u64,
    wagered_amount: u64,
    bump: u8,
    commit_slot: u64,
}

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stats".as_ref(), signer.key().as_ref()],
        bump = player_stats.bump,
        close = signer // <-- This tells Anchor to close the account and send lamports to the signer
    )]
    pub player_stats: Account<'info, PlayerStats>,
}

#[error_code]
pub enum CoinFlipError {
    #[msg("Transfer Failed due to insufficient funds ")]
    InsufficientBalance,
    #[msg("The finalized slot is not the latest slot ")]
    RandomnessAlreadyRevealed,
    #[msg("Insufficient balance please tranfer lamports to your wager account")]
    InsufficientUserWagarBalance,
    #[msg("Randomness account provided does not match the randomness account stored")]
    RandomnessAccountMismatch,
    #[msg("Randomness expired")]
    RandomnessExpired,
    #[msg("Error : revealed random data unable to process ")]
    RandomnessNotResolved,
    #[msg("Error: Not enough fund in the escrow / treasury vault")]
    EscrowFundError,
}
