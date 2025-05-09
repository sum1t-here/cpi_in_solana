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


// import * as path from "path";
// import {
//   Keypair,
//   LAMPORTS_PER_SOL,
//   PublicKey,
//   SystemProgram,
//   Transaction,
//   TransactionInstruction
// } from "@solana/web3.js";
// import { LiteSVM } from "litesvm";
// import { expect, test, describe, beforeEach } from "bun:test";
// import { deserialize } from "borsh";
// import * as borsh from "borsh";

// class CounterState {
//   count: number;
  
//   constructor(count: number) {
//     this.count = count;
//   }
  
//   static schema: borsh.Schema = {
//     struct: {
//       count: 'u32'
//     }
//   };
// }

// describe("Counter Program Tests", () => {
//   let svm: LiteSVM;
//   let doubleProgramId: PublicKey;
//   let cpiProgramId: PublicKey;
//   let dataAccount: Keypair;
//   let userAccount: Keypair;

//   const cpiProgramPath = path.join(import.meta.dir, "program-cpi.so");
//   const doubleProgramPath = path.join(import.meta.dir, "program-double.so");

//   beforeEach(() => {
//     svm = new LiteSVM();
    
//     cpiProgramId = PublicKey.unique();
//     doubleProgramId = PublicKey.unique();
    
//     svm.addProgramFromFile(cpiProgramId, cpiProgramPath);
//     svm.addProgramFromFile(doubleProgramId, doubleProgramPath);
    
//     dataAccount = new Keypair();

//     userAccount = new Keypair();

//     svm.airdrop(userAccount.publicKey, BigInt(LAMPORTS_PER_SOL));

//     let ix = SystemProgram.createAccount({
//       fromPubkey: userAccount.publicKey,
//       newAccountPubkey: dataAccount.publicKey,
//       lamports: Number(svm.minimumBalanceForRentExemption(BigInt(4))),
//       space: 4,
//       programId: doubleProgramId
//     });
//     let tx = new Transaction().add(ix);
//     tx.recentBlockhash = svm.latestBlockhash();
//     tx.sign(userAccount, dataAccount);
//     svm.sendTransaction(tx);
//   });

//   test("double counter value makes it 1 for the first time", () => {

//     const instruction = new TransactionInstruction({
//       programId: cpiProgramId,
//       keys: [
//         { pubkey: dataAccount.publicKey, isSigner: true, isWritable: true },
//         { pubkey: doubleProgramId, isSigner: false, isWritable: false }
//       ],
//       data: Buffer.from([])
//     });
    
//     const transaction = new Transaction().add(instruction);
//     transaction.recentBlockhash = svm.latestBlockhash();
//     transaction.feePayer = userAccount.publicKey;
//     transaction.sign(dataAccount, userAccount);
//     let txn = svm.sendTransaction(transaction);
//     console.log(txn.toString());
    
//     const updatedAccountData = svm.getAccount(dataAccount.publicKey);
//     if (!updatedAccountData) {
//       throw new Error("Account not found");
//     }
//     const updatedCounter = deserialize(CounterState.schema, updatedAccountData.data);
//     if (!updatedCounter) {
//       throw new Error("Counter not found");
//     }
//     //@ts-ignore
//     expect(updatedCounter.count).toBe(1);
//   });

//   test("double counter value makes it 8 after 4 times", async () => {

//     function doubleCounter() {
//       const instruction = new TransactionInstruction({
//         programId: doubleProgramId,
//         keys: [
//           { pubkey: dataAccount.publicKey, isSigner: false, isWritable: true },
//           { pubkey: doubleProgramId, isSigner: false, isWritable: false }
//         ],
//         data: Buffer.from([])
//       });
      
//       let transaction = new Transaction().add(instruction);
//       transaction.recentBlockhash = svm.latestBlockhash();

//       transaction.feePayer = userAccount.publicKey;
//       transaction.sign(dataAccount, userAccount);
//       svm.sendTransaction(transaction);
//       svm.expireBlockhash();

//     }

//     doubleCounter();
//     doubleCounter();
//     doubleCounter();
//     doubleCounter();
    
//     const updatedAccountData = svm.getAccount(dataAccount.publicKey);
//     if (!updatedAccountData) {
//       throw new Error("Account not found");
//     }
//     const updatedCounter = deserialize(CounterState.schema, updatedAccountData.data);
//     if (!updatedCounter) {
//       throw new Error("Counter not found");
//     }
//     //@ts-ignore
//     expect(updatedCounter.count).toBe(8);
//   });
// });