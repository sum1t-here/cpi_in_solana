use solana_program::{
    account_info::{next_account_info, AccountInfo},entrypoint ,entrypoint::ProgramResult, program::invoke_signed, pubkey::Pubkey, system_instruction::create_account
};

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    // create a new pda onchain
    // pda, userAcc, systemProgram
    let iter = &mut accounts.iter();
    let pda = next_account_info(iter)?;
    // if not ?
    // use
    // match pda {
    //      Ok() => {},
    //      Err() => {return Err()}
    // }
    let user_acc = next_account_info(iter)?;
    let system_program = next_account_info(iter)?;

    let seeds = &[user_acc.key.as_ref(), b"user"];

    // iterates the bump
    let (pda_public_key, bump) = Pubkey::find_program_address(seeds, program_id);
    // Pubkey::create_program_address(seeds + bump, program_id); -> expects a bump

    // Optional check to ensure PDA is correct
    if &pda_public_key != pda.key {
        return Err(solana_program::program_error::ProgramError::InvalidSeeds);
    }

    let signer_seeds: &[&[u8]] = &[user_acc.key.as_ref(), b"user", &[bump]];

    let ix = create_account(
        user_acc.key,
        pda.key,
        100000000,
        8,
        program_id
    );

    invoke_signed(&ix, &[user_acc.clone(), pda.clone(), system_program.clone()], &[signer_seeds])?; // can pass many seeds as possible

    Ok(())
}