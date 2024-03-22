const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

const chains = [
    50000n,
    50001n
]

for (const chain of chains)
    kv.set(['chains', chain], { lastUpdated: 0 })