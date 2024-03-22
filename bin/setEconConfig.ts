const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

for (const { chainId, gasLimitMultiplier, gasPriceMultiplier, baseFee } of [
    {
        chainId: 50000n,
        gasLimitMultiplier: [250n, 100n],
        gasPriceMultiplier: [125n, 100n],
        baseFee: 5n
    },
    {
        chainId: 50001n,
        gasLimitMultiplier: [250n, 100n],
        gasPriceMultiplier: [125n, 100n],
        baseFee: 5n
    },
]) kv.set(['econConf', chainId], { gasLimitMultiplier, gasPriceMultiplier, baseFee })