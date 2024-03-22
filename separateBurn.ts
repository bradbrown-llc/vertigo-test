import * as ejra from '../../llc/ejra-bare/mod.ts'
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
const burner = new Signer({ secret: ''.padEnd(64, 'A') })
const signer = new Signer()
// const signers = [signer, deployer, implementer, destroyer, wallet, burner, bridge] as const

type Session = {
    url:string
    nonces:Map<Signer,bigint>
    gasPrice:bigint
    chainId:bigint
}

const url0 = 'http://localhost:50003', session0:Session = {
    url: url0,
    nonces: new Map([
        [burner, await ejra.methods.nonce(url0, burner.address, 'latest')],
        [wallet, await ejra.methods.nonce(url0, wallet.address, 'latest')],
    ]),
    gasPrice: await ejra.methods.gasPrice(url0),
    chainId: await ejra.methods.chainId(url0)
}

const url1 = 'http://localhost:50007', session1:Session = {
    url: url1,
    nonces: new Map([
        [burner, await ejra.methods.nonce(url1, burner.address, 'latest')],
        [wallet, await ejra.methods.nonce(url1, wallet.address, 'latest')],
    ]),
    gasPrice: await ejra.methods.gasPrice(url1),
    chainId: await ejra.methods.chainId(url1)
}

const dzhv = {

    address: '0x3419875B4D3Bca7F3FddA2dB7a476A79fD31B4fE',

    async burn(session:Session, dest:bigint, addr:string, val:bigint) {
        const { url, gasPrice, chainId } = session
        const burnerNonce = session.nonces.get(burner) as bigint
        const data = `0x9eea5f66${
                dest.toString(16).padStart(64, '0')
            }${ addr.slice(2).padStart(64, '0')
            }${ val.toString(16).padStart(64, '0')}`
        const call = { from: burner.address, input: data, to: this.address }
        const gasLimit = await ejra.methods.estimateGas(url, call)
        const { signedTx, hash } = signRawTx({ signer: burner, nonce: burnerNonce, gasLimit, gasPrice, chainId, data, to: this.address })
        session.nonces.set(burner, burnerNonce + 1n)
        ejra.methods.send(url, signedTx)
        let receipt
        while (!(receipt = await ejra.methods.receipt(url, hash)));
        while (receipt.blockNumber != await ejra.methods.height(url));
    },

    async mint(session:Session, addr:string, val:bigint) {
        const { url, gasPrice, chainId } = session
        const walletNonce = session.nonces.get(wallet) as bigint
        const implementerNonce = await ejra.methods.nonce(url0, implementer.address, 'latest')
        const data = `0x40c10f19${
                addr.slice(2).padStart(64, '0')
            }${ val.toString(16).padStart(64, '0')}`
        const call = { from: wallet.address, input: data, to: this.address }
        const gasLimit = await ejra.methods.estimateGas(url, call)
        const { signedTx, hash } = signRawTx({ signer: implementer, nonce: implementerNonce, gasLimit, gasPrice, chainId, data, to: this.address })
        session.nonces.set(wallet, walletNonce + 1n)
        ejra.methods.send(url, signedTx)
        let receipt
        while (!(receipt = await ejra.methods.receipt(url, hash)));
        while (receipt.blockNumber != await ejra.methods.height(url));
        return receipt
    },

    async balance(session:Session, addr:string) {
        const { url } = session
        const data = `0x70a08231${
            addr.slice(2).padStart(64, '0')}`
        const call = { input: data, to: this.address }
        return BigInt(await ejra.methods.call(url, call))
    },

    async totalSupply(session:Session) {
        const { url } = session
        const data = `0x18160ddd`
        const call = { input: data, to: this.address }
        return BigInt(await ejra.methods.call(url, call))
    }

}

// // get burner balance on 0
// console.log(await ejra.methods.balance(session0.url, burner.address, 'latest'))

// // fund account 1 ETH on 0
// const { signedTx } = signRawTx({
//     ...session0,
//     signer: wallet,
//     gasLimit: 21000n,
//     nonce: await ejra.methods.nonce(session0.url, wallet.address, 'latest'),
//     to: bridge.address,
//     value: 1000000000000000000n
// })
// await ejra.methods.send(session0.url, signedTx)

// console.log(await ejra.methods.estimateGas(session1.url, {"from":"0x27E98Df0525B98C4DBb65706a03ebC7662483567","to":"0x3419875b4d3bca7f3fdda2db7a476a79fd31b4fe","input":"0x40c10f190000000000000000000000008fd379246834eac74b8419ffda202cf8051f7a0300000000000000000000000000000000000000000000000000000000000000b0"}))

// console.log(await ejra.methods.nonce(session1.url, bridge.address, 'latest'))

// // mint burner some DZHV on 0
// console.log(await dzhv.mint(session0, burner.address, 1000000000n))

// // // burn some DZHV on 0
// const value = BigInt(Math.floor(Math.random() * 1000)) + 1n
// console.log(`burning ${value}`)
// console.log(await dzhv.burn(session0, 50001n, burner.address, value))

// // get burner DZHV balance on 0
// console.log(await dzhv.balance(session1, burner.address))

// console.log(parseFloat((await ejra.methods.balance('https://rpc.ankr.com/arbitrum_sepolia', deployer.address, 'latest')).toString()) / 1e18)


// const { signedTx } = signRawTx({
//     signer: destroyer,
//     gasLimit: 5000000n,
//     nonce: await ejra.methods.nonce('https://arbitrum-one-rpc.publicnode.com', destroyer.address, 'latest'),
//     to: '0x382d31b6a8f79eff1ce0f203fc259a69340e25ee',
//     value: 0n,
//     gasPrice: await ejra.methods.gasPrice('https://arbitrum-one-rpc.publicnode.com'),
//     chainId: await ejra.methods.chainId('https://arbitrum-one-rpc.publicnode.com')
// })
// await ejra.methods.send('https://arbitrum-one-rpc.publicnode.com', signedTx)

console.log(await ejra.methods.slot('https://arbitrum-one-rpc.publicnode.com', '0xdda114b26b07ce6a14675f035ada6725f2dbe0b8', BigInt('0x9eea5f66'), 'latest'))