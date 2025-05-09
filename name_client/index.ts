import { Connection, Keypair, SystemProgram, Transaction } from "@solana/web3.js";

const connection = new Connection("http://127.0.0.1:8899");

async function main(){
    const kp = new Keypair();
    const dataAcc = new Keypair();

    const signature = await connection.requestAirdrop(kp.publicKey, 3000_000_000);
    await connection.confirmTransaction(signature);

    const balance = await connection.getBalance(kp.publicKey);
    console.log(balance);

    const ix = SystemProgram.createAccount({
        fromPubkey: kp.publicKey,
        // Public key to create the acc
        newAccountPubkey: dataAcc.publicKey,
        // Amt of lamports to transfer to the created acc
        lamports: 1000_000_000,
        // Amt of space in bytes to allocate the created acc
        space: 8,
        // public key of the program to assign as the owner of the created acc
        programId: SystemProgram.programId
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash; // native to solana if a tx doesnot confirm in 20 sec it will fail
    // tx.sign(kp);

    await connection.sendTransaction(tx, [kp, dataAcc]); // expects dataAcc & payer acc to sign the tx
    console.log(dataAcc.publicKey.toBase58());
}

main();