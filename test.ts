import * as ejra from 'https://deno.land/x/ejra@0.2.1/mod.ts'
import jsSha3 from 'npm:js-sha3@0.9.2'
const { keccak256 } = jsSha3
import { encode } from 'npm:@ethereumjs/rlp@5.0.1'
import { Signer } from './lib/Signer.ts'
import { mkn0 } from './lib/mkn0.ts'
import { getCode } from './lib/getCode.ts'
import { signRawTx } from './lib/signRawTx.ts'

// create signers
const deployer = new Signer({ secret: Deno.env.get('DEPLOYER_SECRET') as string })
const implementer = new Signer({ secret: Deno.env.get('IMPLEMENTER_SECRET') as string })
const destroyer = new Signer({ secret: Deno.env.get('DESTROYER_SECRET') as string })
const wallet = new Signer({ secret: Deno.env.get('WALLET_SECRET') as string })
const bridge = new Signer({ secret: Deno.env.get('BRIDGE_SECRET') as string })
const burner = new Signer()
const signer = new Signer()
const signers = [signer, deployer, implementer, destroyer, wallet, burner, bridge] as const

// create node objects
const nodes = {
    a: await mkn0({ signers, chainId: 50000n, portStart: 50000 }),
    b: await mkn0({ signers, chainId: 50001n, portStart: 50004 })
}

// prompt with node log command
console.log(`tail -f ${nodes.a.dataDir}/.log`)
console.log(`tail -f ${nodes.b.dataDir}/.log`)
prompt('Press Enter to continue')
console.log('Continuing...')

// start node
console.log('starting nodes')
nodes.a.start()
nodes.b.start()
await Promise.all([nodes.a.ready, nodes.b.ready])
console.log('nodes started')

// let burnerNonce = 0n
// let walletNonce = 0n
// let deployerNonce = 0n
// const gasPrice = await ejra.methods.gasPrice({ url: nodes.a.rpc })

// const erc20 = await (async () => {
//     const url = nodes.a.rpc
//     const { chainId } = nodes.a
//     const data = await getCode('ERC20_Bridgeable_LOCALONLY.sol') as string
//     const call = { input: data }
//     const gasLimit = await ejra.methods.estimateGas({ tx: call, url })
//     const { signedTx, hash } = signRawTx({ signer: deployer, nonce: deployerNonce, gasLimit, gasPrice, chainId, data })
//     const address = `0x${keccak256(encode([deployer.address, deployerNonce])).slice(-40)}`
//     deployerNonce++
//     ejra.methods.sendRawTx({ data: signedTx, url })
//     let receipt
//     while (!(receipt = await ejra.methods.receipt({ hash, url })));
//     while (receipt.blockNumber != await ejra.methods.height({ url }));
//     return {
//         address,
//         async burn(dest:bigint, addr:string, val:bigint) {
//             const data = `0x9eea5f66${
//                     dest.toString(16).padStart(64, '0')
//                 }${ addr.slice(2).padStart(64, '0')
//                 }${ val.toString(16).padStart(64, '0')}`
//             const call = { from: burner.address, input: data, to: address }
//             const gasLimit = await ejra.methods.estimateGas({ tx: call, url })
//             const { signedTx, hash } = signRawTx({ signer: burner, nonce: burnerNonce, gasLimit, gasPrice, chainId, data, to: address })
//             burnerNonce++
//             ejra.methods.sendRawTx({ data: signedTx, url })
//             let receipt
//             while (!(receipt = await ejra.methods.receipt({ hash, url })));
//             while (receipt.blockNumber != await ejra.methods.height({ url }));
//         },
//         async mint(addr:string, val:bigint) {
//             const data = `0x40c10f19${
//                     addr.slice(2).padStart(64, '0')
//                 }${ val.toString(16).padStart(64, '0')}`
//             const call = { from: wallet.address, input: data, to: address }
//             const gasLimit = await ejra.methods.estimateGas({ tx: call, url })
//             const { signedTx, hash } = signRawTx({ signer: wallet, nonce: walletNonce, gasLimit, gasPrice, chainId, data, to: address })
//             walletNonce++
//             ejra.methods.sendRawTx({ data: signedTx, url })
//             let receipt
//             while (!(receipt = await ejra.methods.receipt({ hash, url })));
//             while (receipt.blockNumber != await ejra.methods.height({ url }));
//         },
//         async balance(addr:string) {
//             const data = `0x70a08231${
//                 addr.slice(2).padStart(64, '0')}`
//             const call = { input: data, to: address }
//             return BigInt(await ejra.methods.call({ tx: call, url }))
//         },
//         async totalSupply() {
//             const data = `0x18160ddd`
//             const call = { input: data, to: address }
//             return BigInt(await ejra.methods.call({ tx: call, url }))
//         }
//     }
// })()

// await erc20.mint(burner.address, 1n * (10n ** 9n) * (10n ** 18n))
// await erc20.burn(50001n, burner.address, 200n)