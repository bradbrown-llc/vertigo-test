const kvPath = Deno.env.get('DENO_KV_PATH')
if (!kvPath) throw new Error('missing required env var \'DENO_KV_PATH\'')

const kv = await Deno.openKv(kvPath)

const list = kv.list<unknown>({ prefix: [] })

for (let i = 0;; i++) {
    
    const result = await list.next().catch(() => null)
    if (result?.done) console.log(` entry count ${i}`)
    if (!result || result.done) break
    const entry = result.value
    const key = entry.key
    console.log({ key, value: result.value })

}