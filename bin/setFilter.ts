import { tokenAddress } from '../lib/tokenAddress.ts'
import { burnTopics } from '../lib/burnTopics.ts'

const processId = ''

const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

const chainId = 50000n
const address = tokenAddress
const topics = burnTopics

kv.set(['filters', chainId, address, topics.sort((a, b) => a < b ? -1 : a == b ? 0 : 1).join(), processId], {
    fromBlock: 0n,
    toBlock: -1n,
    address: tokenAddress,
    topics: burnTopics
})