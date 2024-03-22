const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

const config = [
    { chainId: 50000n, confirmations: 0n },
    { chainId: 50001n, confirmations: 0n },
]

for (const { chainId, confirmations } of config) 
    kv.set(['confirmations', chainId], confirmations)