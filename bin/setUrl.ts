import { kv, processId } from 'https://deno.land/x/vertigo@0.0.3/lib/mod.ts'

kv.set(['url', 50000n, processId], 'http://localhost:50003')