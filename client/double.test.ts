import {test, expect} from "bun:test";
import { LiteSVM } from "litesvm";
import {
	PublicKey,
	Transaction,
	SystemProgram,
	Keypair,
	LAMPORTS_PER_SOL,
    TransactionInstruction,
} from "@solana/web3.js";

test("one transfer", () => {
	const svm = new LiteSVM();
    // loading our contract to local svm
    const contractPubKey = PublicKey.unique();
    svm.addProgramFromFile(contractPubKey, "./double.so");
	const payer = new Keypair();
	svm.airdrop(payer.publicKey, BigInt(LAMPORTS_PER_SOL));

    // create data acc
	const dataAccount = new Keypair();
    const blockhash = svm.latestBlockhash();
	const ixs = [
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: dataAccount.publicKey,
            lamports: Number(svm.minimumBalanceForRentExemption(BigInt(4))),
            space: 4,
            programId: contractPubKey,
        }),
    ];

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
	tx.add(...ixs);
	// tx.sign(payer); -> will override the second one
    tx.sign(payer, dataAccount);
	svm.sendTransaction(tx);
	const balanceAfter = svm.getBalance(dataAccount.publicKey);
	expect(balanceAfter).toBe(svm.minimumBalanceForRentExemption(BigInt(4)));

    function doubleIt(){
        // createAccount is a wrapper that implements the transactionInstruction
        // check web3.js for info
        const ix2 = new TransactionInstruction({
            keys: [
                {pubkey: dataAccount.publicKey, isSigner: false, isWritable: true}
            ],
            programId: contractPubKey,
            data: Buffer.from(""),
        })

        const blockhash = svm.latestBlockhash();
        const tx2 = new Transaction();
        tx2.recentBlockhash = blockhash;
        tx2.feePayer = payer.publicKey;
        tx2.add(ix2);
        tx2.sign(payer);
        // if isSigner: true, then dataAccount should have also signed
        svm.sendTransaction(tx2);
        svm.expireBlockhash(); // blockhash repeats over
    }

    doubleIt();
    doubleIt();
    doubleIt();
    doubleIt();

    const newDataAcc = svm.getAccount(dataAccount.publicKey);
    // console.log(newDataAcc?.data); // check the new data account created

    expect(newDataAcc?.data[0]).toBe(8);
    expect(newDataAcc?.data[1]).toBe(0);
    expect(newDataAcc?.data[2]).toBe(0);
    expect(newDataAcc?.data[3]).toBe(0);
});