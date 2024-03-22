import { fromFileUrl } from 'https://deno.land/std@0.213.0/path/from_file_url.ts'
export async function getCode(name:string) {
    const url = import.meta.resolve(`../contracts/${name}`)
    const path = fromFileUrl(url)
    const text = await Deno.readTextFile(path)
    return `0x${text.split('\n').at(-1)}`
}