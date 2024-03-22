const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

// activate chains
for (const chain of [
    50000n,
    50001n
]) kv.set(['chains', chain], { lastUpdated: 0 })

// set confirmations
for (const { chainId, confirmations } of [
    { chainId: 50000n, confirmations: 0n },
    { chainId: 50001n, confirmations: 0n },
]) kv.set(['confirmations', chainId], confirmations)

// set economyConfigurations
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