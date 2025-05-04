import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import {expect, test} from "bun:test";
import { LiteSVM } from "litesvm";

test("CPI works as expected", async () => {
    let svm = new LiteSVM();

    let doubleContract = PublicKey.unique();
    let cpiContract = PublicKey.unique();

    svm.addProgramFromFile(doubleContract, "./double.so");
    svm.addProgramFromFile(cpiContract, "./cpi.so");

    let userAcc = new Keypair();
    let dataAcc = new Keypair();
    svm.airdrop(userAcc.publicKey, BigInt(1000_000_000));

   createDataAccountOnChain(svm, dataAcc, userAcc, doubleContract);

   let ix = new TransactionInstruction({
    keys: [
        { pubkey: dataAcc.publicKey, isSigner: true, isWritable: true },
        { pubkey: doubleContract, isSigner: false, isWritable: false },
    ],
    programId: cpiContract,
    data: Buffer.from(""),
   })

   let blockhash = svm.latestBlockhash();
   let transaction = new Transaction();
   transaction.add(ix);
   transaction.recentBlockhash = blockhash;
   transaction.feePayer = userAcc.publicKey;
   transaction.sign(userAcc, dataAcc);

   svm.sendTransaction(transaction);

   const dataAccData = svm.getAccount(dataAcc.publicKey);

   expect(dataAccData?.data[0]).toBe(1);
   expect(dataAccData?.data[1]).toBe(0);
   expect(dataAccData?.data[2]).toBe(0);
   expect(dataAccData?.data[3]).toBe(0);

})

function createDataAccountOnChain(svm: LiteSVM, dataAccount: Keypair, payer: Keypair, contractPubkey: PublicKey){
    const blockhash = svm.latestBlockhash();
    const ixs = [
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: dataAccount.publicKey,
            lamports: Number(svm.minimumBalanceForRentExemption(BigInt(4))),
            space: 4,
            programId: contractPubkey
        }),
    ];

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;
    tx.add(...ixs);
    tx.sign(payer, dataAccount);
    svm.sendTransaction(tx);
   }