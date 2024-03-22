import { fromFileUrl } from 'https://deno.land/std@0.211.0/path/from_file_url.ts'
import { Signer } from './Signer.ts'
import { getPublicKey } from 'npm:@noble/secp256k1@2.0.0'

export async function mkn0({
    signers,
    log,
    chainId,
    portStart
}:{
    signers:readonly [Signer, ...Signer[]]
    log?:true,
    chainId:bigint,
    portStart:number
}) {

    // get geth path and dataDir, for now enforcing geth version 1.13.8
    const gethPath = `${fromFileUrl(import.meta.resolve('../.cache'))}/geth/1.13.8`
    const dataDir = await Deno.makeTempDir()
    
    // create genesis object
    const alloc = Object.fromEntries(signers.map(({ address }) => [address, { balance: '1000000000000000000000000000' }]))
    const genesis = JSON.stringify({
        alloc, // prefunds defined accounts
        config: {
            chainId: Number(chainId),
            clique: { period: 0 }, // (0 to mine on-demand)
            homesteadBlock: 0, // required to use eip150Block
            byzantiumBlock: 0, // REVERT, RETURNDATASIZE, RETURNDATACOPY, STATICCALL opcodes
            istanbulBlock: 0, // required for berlinBlock
            petersburgBlock: 0, // required for istanbulBlock
            constantinopleBlock: 0, // required for petersbergBlock
            berlinBlock: 0, // required for EIP-2718 and EIP-2930 (tx types and access lists, respectively)
            eip150Block: 0, // required to use eip155Block
            eip155Block: 0, // required to use rawTxArray with chainId
            eip158Block: 0, // required for byzantium
        },
        extraData: `0x${
            ''.padEnd(32*2, '0')/*32B vanity*/
            }${signers[0].address.slice(2)/*signer*/
            }${''.padEnd(65*2, '0')/*65B proposer seal*/
        }`,
        gasLimit: "0x989680", // required
        difficulty: "0x0" // required
    },(_,v)=>typeof v=='bigint'?''+v:v)
    
    
    // write genesis.json
    const genesisPath = `${dataDir}/genesis.json`
    await Deno.writeTextFile(genesisPath, genesis)
    
    // write secret so we can import that secret (to initialize provided signers with ETH)
    const keyPaths = await Promise.all(signers.map(() => Deno.makeTempFile({ dir: dataDir })))
    await Promise.all(signers.map(({ secret }, i) => Deno.writeTextFile(keyPaths[i], secret)))
    
    // geth account imports
    await Promise.all(signers.map(async (_, i) => {
        const args = [
            '--lightkdf',
            '--datadir', dataDir,
            'account', 'import', keyPaths[i]
        ]
        const gethAccountImport = new Deno.Command(gethPath, { args, stdin: 'piped', stdout: 'null', stderr: log ? 'inherit' : 'null' }).spawn()
        const writer = gethAccountImport.stdin.getWriter()
        writer.write(new Uint8Array([0x0a, 0x0a]))
        await gethAccountImport.output()
    }))
    
    // geth init
    let args = [
        'init',
        '--datadir', dataDir,
        genesisPath
    ]
    const gethInit = new Deno.Command(gethPath, { args, stderr: log ? 'inherit' : 'null' }).spawn()
    await gethInit.output()
    
    // geth
    args = [
        '--datadir', dataDir,
        '--authrpc.port', ''+(portStart + 0),
        '--discovery.port', ''+(portStart + 1),
        '--port', ''+(portStart + 2),
        '--http',
        '--http.addr', '0.0.0.0',
        '--http.port', ''+(portStart + 3),
        '--http.api', 'eth,web3,net,debug',
        '--http.corsdomain', '*',
        '--http.vhosts', '*',
        '--nat', 'none',
        '--netrestrict', '127.0.0.1/32',
        '--nodiscover',
        '--mine',
        '--miner.etherbase', signers[0].address,
        '--allow-insecure-unlock',
        '--unlock', signers[0].address,
        '--password', await Deno.makeTempFile({ dir: dataDir }),
        '--config', `${dataDir}/config.toml`
    ]

    const enode = `enode://${getPublicKey(
        Deno.readTextFileSync(`${dataDir}/geth/nodekey`),
        false
    )   
        .slice(1)
        .reduce<string[]>((p, c) => (
            p.push(c.toString(16).padStart(2, '0')),
            p
        ), [])
        .join('')}@127.0.0.1:${portStart + 2}`

    // create config.toml
    const dumpconfproc = new Deno.Command(gethPath, { args: ['--datadir', dataDir, 'dumpconfig']})
    const conf = new TextDecoder().decode(dumpconfproc.outputSync().stdout)
        .replace(/^BootstrapNodes = .*$/m, 'BootstrapNodes = []')
        .replace(/^BootstrapNodesV5 = .*$/m, 'BootstrapNodesV5 = []')
    Deno.writeTextFileSync(`${dataDir}/config.toml`, conf)

    function setStaticNodes(staticNodes:string[]) {
        const conf = Deno.readTextFileSync(`${dataDir}/config.toml`)
        Deno.writeTextFileSync(
            `${dataDir}/config.toml`,
            conf
                .replace(/^StaticNodes = .*$/m, `StaticNodes = ${JSON.stringify(staticNodes)}`)
                .replace(/^BootstrapNodes = .*$/m, `BootstrapNodes = ${JSON.stringify(staticNodes)}`)
        )
    }

    // create the log file
    Deno.createSync(`${dataDir}/.log`)

    const obj:{
        proc:Deno.ChildProcess|undefined,
        enode:string
        setStaticNodes:(staticNodes: string[]) => void
        start:() => void
        stop:() => void
        dataDir:string
        rpc:string
        ready:Promise<void>
        pipePromise:undefined|Promise<void>
        chainId:bigint
    } = {
        proc: undefined,
        enode,
        setStaticNodes,
        start: async function() {
            const log = await Deno.open(`${dataDir}/.log`, { write: true, truncate: true })
            obj.proc = new Deno.Command(gethPath, { args, stdin: 'inherit', stderr: 'piped', stdout: 'piped' }).spawn()
            obj.pipePromise = obj.proc.stderr.pipeTo(log.writable)
            obj.ready = resetReady()
        },
        stop: async function() {
            if (!obj.proc) return
            await Promise.all([
                new Promise<void>(r => {
                    ;(async () => {
                        const watcher = Deno.watchFs(`${dataDir}/.log`)
                        for await (const _event of watcher) {
                            if (Deno.readTextFileSync(`${dataDir}/.log`).match(/^.*Blockchain stopped*$/m)) {
                                watcher.close()
                                r()
                            }
                        }
                    })()
                }),
                obj.proc.kill('SIGINT')
            ])
            await Deno.remove(`${dataDir}/geth/LOCK`)
            obj.pipePromise = undefined
        },
        dataDir,
        rpc: `http://localhost:${portStart + 3}`,
        ready: resetReady(),
        pipePromise: undefined,
        chainId
    }

    function resetReady() {
        return new Promise<void>(r => {
            ;(async () => {
                const watcher = Deno.watchFs(`${dataDir}/.log`)
                for await (const _event of watcher) {
                    if (Deno.readTextFileSync(`${dataDir}/.log`).match(/^.*HTTP server started.*auth=false.*$/m)) {
                        watcher.close()
                        r()
                    }
                }
            })()
        })
    }

    return obj
    
}