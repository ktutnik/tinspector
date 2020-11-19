import { Class, DecoratorId, DecoratorOption, DecoratorOptionId } from "./types"

interface MetadataRecord {
    targetClass: Class
    memberName?: string | symbol
    parIndex?: number
    data: any
}

const storage = new Map<Class, MetadataRecord[]>()

export function setMetadata(data: any, targetClass: Class, memberName?: string | symbol, parIndex?: number) {
    const meta = storage.get(targetClass) ?? []
    meta.push({ targetClass, memberName, parIndex, data })
    storage.set(targetClass, meta)
}

function getMetadataFromStorage(target: Class, memberName?: string, parIndex?: number) {
    return (storage.get(target) ?? [])
        .filter(x => x.memberName === memberName && x.parIndex === parIndex)
        .map(x => x.data)
}

function mergeMetadata(childMeta: any[], parentMeta: any[]) {
    const result = [...childMeta]
    for (const parent of parentMeta) {
        const copyExists = () => !!childMeta.find(x => x[DecoratorId] !== undefined && x[DecoratorId] === parent[DecoratorId])
        const option = parent[DecoratorOptionId]
        if (!option.inherit) continue
        if (!option.allowMultiple && copyExists()) continue
        result.push(parent)
    }
    return result
}

export function getMetadata(targetClass: Class, memberName?: string, parIndex?: number): any[] {
    const parent: Class = Object.getPrototypeOf(targetClass)
    const parentMeta: any[] = !!parent.prototype ? getMetadata(parent, memberName, parIndex) : []
    const childMeta = getMetadataFromStorage(targetClass, memberName, parIndex)
    return mergeMetadata(childMeta, parentMeta)
}

export function getOwnMetadata(targetClass: Class, memberName?: string, parIndex?: number) {
    return getMetadataFromStorage(targetClass, memberName, parIndex)
}

export function getAllMetadata(targetClass: Class) {
    return storage.get(targetClass)
}